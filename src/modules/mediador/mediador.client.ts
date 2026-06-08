import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { CookieJar } from './cookie-jar';
import { SearchFilters, InstrumentoTipo } from './mediador.types';

export class MediadorClient {
  private jar = new CookieJar();
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  private async fetchWithRetry(url: string, options: RequestInit, retries = env.HTTP_RETRIES): Promise<Response> {
    const timeout = env.HTTP_TIMEOUT;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const signal = AbortSignal.timeout(timeout);
        const res = await fetch(url, { ...options, signal });
        if (!res.ok) {
          if (res.status === 500) {
            try {
              const clone = res.clone();
              const json = await clone.json();
              if (json && (json.message === 'Nenhum registro encontrado.' || json.message?.includes('Nenhum registro'))) {
                return res;
              }
            } catch {
              // Ignore parse error and throw default HTTP Error
            }
          }
          throw new Error(`HTTP Error status=${res.status}`);
        }
        return res;
      } catch (err: any) {
        if (attempt === retries) {
          logger.error({ detalhes: { url, error: err.message, attempt } }, 'HTTP Request failed after maximum retries');
          throw err;
        }
        logger.warn({ detalhes: { url, error: err.message, attempt, nextAttemptInMs: 1500 } }, 'HTTP Request failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    throw new Error('HTTP Request failed');
  }

  async initializeSession(): Promise<void> {
    logger.info('Inicializando sessão com MTE Mediador...');
    this.jar.clear();
    
    const res = await this.fetchWithRetry('https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo', {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    this.jar.addCookies(res.headers.get('set-cookie'));
  }

  async search(filters: SearchFilters): Promise<{ html: string; verificationToken: string }> {
    logger.info({ detalhes: { filters } }, 'Consulta iniciada');
    
    await this.initializeSession();

    // Map filters to Mediador payload
    const payload: Record<string, string> = {
      nrCnpj: filters.cnpj ? filters.cnpj.replace(/\D/g, '') : '',
      nrCei: '',
      noRazaoSocial: '',
      dsCategoria: '',
      tpVigencia: filters.vigentes ? '1' : '0', // '1' = Vigentes
      sgUfDeRegistro: filters.uf,
      dtInicioRegistro: '',
      dtFimRegistro: '',
      dtInicioVigenciaInstrumentoColetivo: '',
      dtFimVigenciaInstrumentoColetivo: '',
      tpAbrangencia: '',
      dsTipoAbrangencia: 'Todos os tipos',
      ufsAbrangidasTotalmente: filters.uf,
      cdMunicipiosAbrangidos: '',
      cdGrupo: '',
      cdSubGrupo: '',
      noTituloClausula: '',
      dsAbrangenciaTerritorial: '',
      utilizarSiracc: '',
      excel: 'false',
      pagina: '1',
      qtdTotalRegistro: '-1',
      recaptchaToken: ''
    };

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      params.append(key, value);
    }
    
    // Support single or multiple instrument type selection (Mediador expects tpRequerimento parameters)
    params.append('tpRequerimento', filters.tipo);

    const res = await this.fetchWithRetry(
      'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo/getConsultaAvancada',
      {
        method: 'POST',
        body: params.toString(),
        headers: {
          'Cookie': this.jar.getCookieHeader(),
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': 'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    this.jar.addCookies(res.headers.get('set-cookie'));
    const html = await res.text();
    
    logger.info('Consulta finalizada');

    // Handle "Nenhum registro encontrado" safely
    if (html.includes('Nenhum registro encontrado.')) {
      return { html: '0 Instrumento(s) Coletivo(s) Encontrado(s)', verificationToken: '' };
    }

    // Extract updated verification token from search results form
    const tokenMatch = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i);
    if (!tokenMatch) {
      throw new Error('Anti-forgery token not found in search results');
    }
    const verificationToken = tokenMatch[1];

    return { html, verificationToken };
  }

  async downloadXls(): Promise<ArrayBuffer> {
    logger.info('Baixando planilha XLS do Mediador...');
    const res = await this.fetchWithRetry(
      'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo/exportarConsultaAvancada',
      {
        method: 'GET',
        headers: {
          'Cookie': this.jar.getCookieHeader(),
          'User-Agent': this.userAgent,
          'Referer': 'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo'
        }
      }
    );

    this.jar.addCookies(res.headers.get('set-cookie'));
    const buffer = await res.arrayBuffer();
    logger.info({ detalhes: { sizeBytes: buffer.byteLength } }, 'XLS baixado');
    return buffer;
  }

  async downloadDocument(numeroSolicitacao: string, verificationToken: string): Promise<string> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info({ detalhes: { numeroSolicitacao, attempt } }, 'Gerando token de segurança para documento...');
        
        const tokenParams = new URLSearchParams();
        tokenParams.append('nrSolicitacao', numeroSolicitacao);
        tokenParams.append('__RequestVerificationToken', verificationToken);

        const tokenRes = await this.fetchWithRetry(
          'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo/GenerateSecurityToken',
          {
            method: 'POST',
            body: tokenParams.toString(),
            headers: {
              'Cookie': this.jar.getCookieHeader(),
              'User-Agent': this.userAgent,
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Referer': 'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo',
              'X-Requested-With': 'XMLHttpRequest'
            }
          }
        );

        this.jar.addCookies(tokenRes.headers.get('set-cookie'));
        const tokenJson: any = await tokenRes.json();

        if (!tokenJson.success) {
          throw new Error(`Falha ao gerar token para solicitação ${numeroSolicitacao}: ${tokenJson.message}`);
        }

        const securityToken = tokenJson.token;
        logger.info({ detalhes: { numeroSolicitacao } }, 'Baixando HTML do instrumento...');

        const resumoParams = new URLSearchParams();
        resumoParams.append('NrSolicitacao', numeroSolicitacao);
        resumoParams.append('token', securityToken);
        resumoParams.append('__RequestVerificationToken', verificationToken);

        const docRes = await this.fetchWithRetry(
          'https://www3.mte.gov.br/sistemas/mediador/Resumo/ResumoVisualizar',
          {
            method: 'POST',
            body: resumoParams.toString(),
            headers: {
              'Cookie': this.jar.getCookieHeader(),
              'User-Agent': this.userAgent,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': 'https://www3.mte.gov.br/sistemas/mediador/ConsultarInstColetivo'
            }
          }
        );

        this.jar.addCookies(docRes.headers.get('set-cookie'));
        const html = await docRes.text();
        
        if (html.includes('Request Rejected') || html.includes('The requested URL was rejected')) {
          throw new Error('MTE WAF blocked the document request');
        }
        
        logger.info({ detalhes: { numeroSolicitacao, htmlLength: html.length } }, 'Documento baixado');
        return html;
      } catch (err: any) {
        if (err.message.includes('WAF blocked') && attempt < 3) {
          logger.warn(
            { detalhes: { attempt, numeroSolicitacao } },
            'WAF detectado ao baixar documento. Aguardando 20s para resfriamento e tentando novamente...'
          );
          await new Promise(resolve => setTimeout(resolve, 20000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Falha após múltiplas tentativas devido ao bloqueio do WAF');
  }

  async downloadPdf(pdfUrl: string): Promise<ArrayBuffer> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info({ detalhes: { pdfUrl, attempt } }, 'Baixando PDF anexo...');
        const res = await this.fetchWithRetry(pdfUrl, {
          method: 'GET',
          headers: {
            'Cookie': this.jar.getCookieHeader(),
            'User-Agent': this.userAgent
          }
        });

        this.jar.addCookies(res.headers.get('set-cookie'));
        const buffer = await res.arrayBuffer();

        try {
          const textSample = new TextDecoder('utf-8').decode(buffer.slice(0, 200));
          if (textSample.includes('Request Rejected') || textSample.includes('requested URL was rejected')) {
            throw new Error('MTE WAF blocked the PDF request');
          }
        } catch {
          // Ignore
        }

        logger.info({ detalhes: { pdfUrl, sizeBytes: buffer.byteLength } }, 'PDF baixado');
        return buffer;
      } catch (err: any) {
        if (err.message.includes('WAF blocked') && attempt < 3) {
          logger.warn(
            { detalhes: { attempt, pdfUrl } },
            'WAF detectado ao baixar PDF. Aguardando 20s para resfriamento e tentando novamente...'
          );
          await new Promise(resolve => setTimeout(resolve, 20000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Falha após múltiplas tentativas devido ao bloqueio do WAF');
  }
}
