import { eq } from 'drizzle-orm';
import { db } from '../../database/connection';
import { clausulas } from '../../database/schema';

export interface ClausulaData {
  instrumentoId: number;
  titulo: string;
  conteudo: string;
  categoria: string;
}

export class ClausulasRepository {
  async create(data: ClausulaData) {
    const [result] = await db.insert(clausulas).values({
      instrumentoId: data.instrumentoId,
      titulo: data.titulo,
      conteudo: data.conteudo,
      categoria: data.categoria
    });
    return { id: result.insertId, ...data };
  }

  async deleteByInstrumentoId(instrumentoId: number) {
    await db.delete(clausulas).where(eq(clausulas.instrumentoId, instrumentoId));
  }

  async createMany(dataList: ClausulaData[]) {
    if (dataList.length === 0) return;
    // Drizzle bulk insert
    await db.insert(clausulas).values(
      dataList.map(data => ({
        instrumentoId: data.instrumentoId,
        titulo: data.titulo,
        conteudo: data.conteudo,
        categoria: data.categoria
      }))
    );
  }
}
