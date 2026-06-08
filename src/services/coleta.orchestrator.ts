import { join } from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ensureDir } from '../utils/file';
import { MediadorClient } from '../modules/mediador/mediador.client';
import { XlsParser } from '../modules/mediador/xls.parser';
import { InstrumentoTipo, SearchFilters } from '../modules/mediador/mediador.types';
import { SindicatosRepository } from '../modules/sindicatos/sindicatos.repository';
import { InstrumentosRepository } from '../modules/instrumentos/instrumentos.repository';
import { ClausulasRepository } from '../modules/instrumentos/clausulas.repository';
import { ClausulasParser } from '../modules/processamento/clausulas.parser';
import { ClausulasClassifier } from '../modules/processamento/clausulas.classifier';
import { IAService } from '../modules/processamento/ia.service';

export class ColetaOrchestrator {
  private client = new MediadorClient();
  private sindicatosRepo = new SindicatosRepository();
  private instrumentosRepo = new InstrumentosRepository();
  private clausulasRepo = new ClausulasRepository();
  private iaService = new IAService();

  private getFilenameSuffix(tipo: InstrumentoTipo): string {
    switch (tipo) {
      case InstrumentoTipo.ACORDO_COLETIVO:
        return 'ACT';
      case InstrumentoTipo.CONVENCAO_COLETIVA:
        return 'CCT';
      case InstrumentoTipo.TERMO_ADITIVO_ACORDO:
        return 'ADITIVO_ACT';
      case InstrumentoTipo.TERMO_ADITIVO_CONVENCAO:
        return 'ADITIVO_CCT';
    }
  }

  private calculateHash(text: string): string {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(text);
    return hasher.digest('hex');
  }

  async runColeta(states = ['DF', 'GO'], specificCnpj?: string, vigentesOnly = true): Promise<void> {
    logger.info({ detalhes: { states, specificCnpj, vigentesOnly } }, 'Iniciando fluxo completo de coleta e processamento...');

    // 1. Ensure storage directories exist
    await ensureDir(env.STORAGE_RAW_XLS);
    await ensureDir(env.STORAGE_RAW_HTML);
    await ensureDir(env.STORAGE_RAW_PDF);

    // 2. Fetch active unions
    let activeUnions = [];
    if (specificCnpj) {
      const cleanedCnpj = specificCnpj.replace(/\D/g, '');
      let union = await this.sindicatosRepo.findByCnpj(cleanedCnpj);
      if (!union) {
        logger.info(`CNPJ ${cleanedCnpj} não cadastrado no banco. Adicionando automaticamente...`);
        union = await this.sindicatosRepo.create({
          cnpj: cleanedCnpj,
          nome: `Sindicato CNPJ ${cleanedCnpj} (CLI)`,
          ativo: true
        });
      }
      activeUnions = [union];
    } else {
      activeUnions = await this.sindicatosRepo.findActives();
    }

    if (activeUnions.length === 0) {
      logger.warn('Nenhum sindicato ativo encontrado no banco de dados para a coleta.');
      return;
    }

    const types = [
      InstrumentoTipo.ACORDO_COLETIVO,
      InstrumentoTipo.CONVENCAO_COLETIVA,
      InstrumentoTipo.TERMO_ADITIVO_ACORDO,
      InstrumentoTipo.TERMO_ADITIVO_CONVENCAO
    ];

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // 3. Loop Unions x UFs x Types
    for (const union of activeUnions) {
      const cnpj = union.cnpj;
      logger.info({ detalhes: { cnpj, nome: union.nome } }, 'Processando sindicato...');

      for (const uf of states) {
        for (const tipo of types) {
          logger.info(
            { detalhes: { cnpj, uf, tipo } },
            'Executando pesquisa avançada no Mediador...'
          );

          try {
            // Step 1: Perform advanced search
            const searchFilters: SearchFilters = {
              cnpj,
              uf,
              tipo,
              vigentes: vigentesOnly
            };

            const searchResult = await this.client.search(searchFilters);
            
            // Check if any results were found
            if (searchResult.html.includes('0 Instrumento(s) Coletivo(s) Encontrado(s)')) {
              logger.debug({ detalhes: { cnpj, uf, tipo } }, 'Nenhum instrumento encontrado para esta combinação');
              continue;
            }

            // Step 2: Download XLS file
            const xlsBuffer = await this.client.downloadXls();
            
            const suffix = this.getFilenameSuffix(tipo);
            const xlsFilename = `${cnpj}_${uf}_${suffix}_${timestamp}.xls`;
            const xlsPath = join(env.STORAGE_RAW_XLS, xlsFilename);
            
            // Save XLS file
            await Bun.write(xlsPath, xlsBuffer);
            logger.info({ detalhes: { xlsPath } }, 'XLS baixado');

            // Step 3: Parse XLS spreadsheet
            const xlsText = new TextDecoder('latin1').decode(xlsBuffer);
            const xlsRecords = XlsParser.parse(xlsText);
            logger.info(
              { detalhes: { count: xlsRecords.length } },
              'Registros extraídos da planilha'
            );

            // Step 4: Process each instrument
            for (const record of xlsRecords) {
              const solNumber = record.numeroSolicitacao;
              const solNumberSafe = solNumber.replace(/\//g, '_');

              // Find if instrument exists
              const existing = await this.instrumentosRepo.findByNumeroSolicitacao(solNumber);
              
              if (existing && existing.situacao === 'PROCESSADO') {
                logger.info(
                  { detalhes: { numeroSolicitacao: solNumber } },
                  'Instrumento já processado. Ignorando download para evitar rate-limit.'
                );
                continue;
              }

              // Apply politeness delay (2.5 to 4.5 seconds) before downloading to prevent WAF blocks
              const delayMs = 2500 + Math.random() * 2000;
              logger.info({ detalhes: { numeroSolicitacao: solNumber, delayMs: Math.round(delayMs) } }, 'Aguardando intervalo de cortesia...');
              await new Promise(resolve => setTimeout(resolve, delayMs));

              // Step 4.1: Download Document (HTML and potential PDFs)
              let htmlContent: string;
              try {
                htmlContent = await this.client.downloadDocument(solNumber, searchResult.verificationToken);
              } catch (err: any) {
                logger.error(
                  { detalhes: { numeroSolicitacao: solNumber, error: err.message } },
                  'Falha ao baixar HTML do documento'
                );
                continue;
              }

              // Calculate SHA256 of downloaded HTML
              const currentHash = this.calculateHash(htmlContent);

              // Save HTML to raw storage
              const htmlFilename = `${solNumberSafe}.html`;
              const htmlPath = join(env.STORAGE_RAW_HTML, htmlFilename);
              await Bun.write(htmlPath, htmlContent);

              // Scan for PDF attachments inside HTML
              const pdfUrls: string[] = [];
              const pdfRegex = /href="([^"]+imagemAnexo[^"]+\.pdf)"/gi;
              let pdfMatch;
              while ((pdfMatch = pdfRegex.exec(htmlContent)) !== null) {
                pdfUrls.push(pdfMatch[1]);
              }

              const savedPdfPaths: string[] = [];
              // Download each PDF attachment
              for (let i = 0; i < pdfUrls.length; i++) {
                try {
                  const pdfUrl = pdfUrls[i];
                  
                  // Politeness delay for PDF download
                  const pdfDelayMs = 1500 + Math.random() * 1500;
                  await new Promise(resolve => setTimeout(resolve, pdfDelayMs));

                  const pdfBuffer = await this.client.downloadPdf(pdfUrl);
                  const pdfFilename = `${solNumberSafe}_anexo_${i}.pdf`;
                  const pdfPath = join(env.STORAGE_RAW_PDF, pdfFilename);
                  await Bun.write(pdfPath, pdfBuffer);
                  savedPdfPaths.push(pdfPath);
                } catch (pdfErr: any) {
                  logger.error(
                    { detalhes: { numeroSolicitacao: solNumber, index: i, error: pdfErr.message } },
                    'Falha ao baixar anexo PDF'
                  );
                }
              }

              // Parse dates from downloaded HTML
              const parsedDoc = ClausulasParser.parse(htmlContent);

              // Step 4.2: Register instrument in Database (Save/Update metadata first)
              const instrumentRow = await this.instrumentosRepo.upsert({
                sindicatoId: union.id,
                numeroRegistro: record.numeroRegistro || parsedDoc.numeroRegistro,
                numeroSolicitacao: solNumber,
                tipoInstrumento: record.tipoInstrumento,
                uf,
                dataProtocolo: parsedDoc.dataProtocolo,
                dataRegistro: parsedDoc.dataRegistro,
                vigenciaInicio: XlsParser.parseVigencia(record.vigencia).inicio,
                vigenciaFim: XlsParser.parseVigencia(record.vigencia).fim,
                situacao: 'BAIXADO',
                htmlPath,
                pdfPath: savedPdfPaths.length > 0 ? savedPdfPaths.join(',') : null,
                hashDocumento: currentHash
              });

              // Step 4.3: Process Clauses (Only if hash has changed)
              logger.info(
                { detalhes: { numeroSolicitacao: solNumber, rowId: instrumentRow.id } },
                'Iniciando processamento das cláusulas...'
              );

              // Delete old clauses for clean reload
              await this.clausulasRepo.deleteByInstrumentoId(instrumentRow.id);

              const clausesToInsert = [];
              for (const clause of parsedDoc.clausulas) {
                // Classify category using rule-based engine
                const category = ClausulasClassifier.classify(clause.titulo, clause.conteudo);

                // Dispatched AI structural analysis (Stub semantic analysis)
                const interpretation = await this.iaService.interpretClause(
                  clause.titulo,
                  clause.conteudo
                );

                // Build full payload containing content and metadata
                const combinedContent = interpretation 
                  ? `${clause.conteudo}\n\n[IA_SEMANTICA]: ${JSON.stringify(interpretation)}`
                  : clause.conteudo;

                clausesToInsert.push({
                  instrumentoId: instrumentRow.id,
                  titulo: clause.titulo,
                  conteudo: combinedContent,
                  categoria: category
                });
              }

              // Batch insert parsed clauses
              if (clausesToInsert.length > 0) {
                await this.clausulasRepo.createMany(clausesToInsert);
                logger.info(
                  { detalhes: { count: clausesToInsert.length } },
                  'Documento processado'
                );
              }

              // Update status to PROCESSADO
              await this.instrumentosRepo.update(instrumentRow.id, {
                situacao: 'PROCESSADO'
              });
            }
          } catch (err: any) {
            logger.error(
              { detalhes: { cnpj, uf, tipo, error: err.message, stack: err.stack } },
              'Erro ao coletar instrumentos para esta combinação'
            );
          }
        }
      }
    }

    logger.info('Fluxo completo de coleta finalizado!');
  }
}
