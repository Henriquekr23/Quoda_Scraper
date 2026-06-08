import { eq } from 'drizzle-orm';
import { db } from '../../database/connection';
import { instrumentos } from '../../database/schema';

export interface InstrumentoData {
  sindicatoId: number;
  numeroRegistro?: string | null;
  numeroSolicitacao?: string | null;
  tipoInstrumento?: string | null;
  uf?: string | null;
  dataProtocolo?: Date | null;
  dataRegistro?: Date | null;
  vigenciaInicio?: Date | null;
  vigenciaFim?: Date | null;
  situacao?: string | null;
  htmlPath?: string | null;
  pdfPath?: string | null;
  hashDocumento?: string | null;
}

export class InstrumentosRepository {
  async create(data: InstrumentoData) {
    const [result] = await db.insert(instrumentos).values({
      sindicato_id: data.sindicatoId,
      numero_registro: data.numeroRegistro || null,
      numero_solicitacao: data.numeroSolicitacao || null,
      tipo_instrumento: data.tipoInstrumento || null,
      uf: data.uf || null,
      data_protocolo: data.dataProtocolo ? data.dataProtocolo.toISOString().split('T')[0] : null,
      data_registro: data.dataRegistro ? data.dataRegistro.toISOString().split('T')[0] : null,
      vigencia_inicio: data.vigenciaInicio ? data.vigenciaInicio.toISOString().split('T')[0] : null,
      vigencia_fim: data.vigenciaFim ? data.vigenciaFim.toISOString().split('T')[0] : null,
      situacao: data.situacao || null,
      html_path: data.htmlPath || null,
      pdf_path: data.pdfPath || null,
      hash_documento: data.hashDocumento || null
    } as any);
    return { id: result.insertId, ...data };
  }

  async findByNumeroSolicitacao(numeroSolicitacao: string) {
    const results = await db
      .select()
      .from(instrumentos)
      .where(eq(instrumentos.numeroSolicitacao, numeroSolicitacao))
      .limit(1);
    return results[0] || null;
  }

  async findByNumeroRegistro(numeroRegistro: string) {
    const results = await db
      .select()
      .from(instrumentos)
      .where(eq(instrumentos.numeroRegistro, numeroRegistro))
      .limit(1);
    return results[0] || null;
  }

  async update(id: number, data: Partial<InstrumentoData>) {
    const updateObj: Record<string, any> = {};
    if (data.sindicatoId !== undefined) updateObj.sindicatoId = data.sindicatoId;
    if (data.numeroRegistro !== undefined) updateObj.numeroRegistro = data.numeroRegistro;
    if (data.numeroSolicitacao !== undefined) updateObj.numeroSolicitacao = data.numeroSolicitacao;
    if (data.tipoInstrumento !== undefined) updateObj.tipoInstrumento = data.tipoInstrumento;
    if (data.uf !== undefined) updateObj.uf = data.uf;
    if (data.situacao !== undefined) updateObj.situacao = data.situacao;
    if (data.htmlPath !== undefined) updateObj.htmlPath = data.htmlPath;
    if (data.pdfPath !== undefined) updateObj.pdfPath = data.pdfPath;
    if (data.hashDocumento !== undefined) updateObj.hashDocumento = data.hashDocumento;

    if (data.dataProtocolo !== undefined) {
      updateObj.dataProtocolo = data.dataProtocolo ? data.dataProtocolo.toISOString().split('T')[0] : null;
    }
    if (data.dataRegistro !== undefined) {
      updateObj.dataRegistro = data.dataRegistro ? data.dataRegistro.toISOString().split('T')[0] : null;
    }
    if (data.vigenciaInicio !== undefined) {
      updateObj.vigenciaInicio = data.vigenciaInicio ? data.vigenciaInicio.toISOString().split('T')[0] : null;
    }
    if (data.vigenciaFim !== undefined) {
      updateObj.vigenciaFim = data.vigenciaFim ? data.vigenciaFim.toISOString().split('T')[0] : null;
    }

    await db
      .update(instrumentos)
      .set(updateObj)
      .where(eq(instrumentos.id, id));
  }

  async upsert(data: InstrumentoData) {
    if (data.numeroSolicitacao) {
      const existing = await this.findByNumeroSolicitacao(data.numeroSolicitacao);
      if (existing) {
        await this.update(existing.id, data);
        return { id: existing.id, ...data };
      }
    } else if (data.numeroRegistro) {
      const existing = await this.findByNumeroRegistro(data.numeroRegistro);
      if (existing) {
        await this.update(existing.id, data);
        return { id: existing.id, ...data };
      }
    }
    return this.create(data);
  }
}
