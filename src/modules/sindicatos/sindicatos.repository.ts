import { eq } from 'drizzle-orm';
import { db } from '../../database/connection';
import { sindicatos } from '../../database/schema';

export class SindicatosRepository {
  async create(data: { cnpj: string; nome?: string; ativo?: boolean }) {
    const [result] = await db.insert(sindicatos).values({
      cnpj: data.cnpj,
      nome: data.nome || null,
      ativo: data.ativo ?? true
    });
    return { id: result.insertId, ...data };
  }

  async findByCnpj(cnpj: string) {
    const results = await db
      .select()
      .from(sindicatos)
      .where(eq(sindicatos.cnpj, cnpj))
      .limit(1);
    return results[0] || null;
  }

  async findActives() {
    return db
      .select()
      .from(sindicatos)
      .where(eq(sindicatos.ativo, true));
  }

  async update(id: number, data: Partial<{ nome: string; ativo: boolean }>) {
    await db
      .update(sindicatos)
      .set(data)
      .where(eq(sindicatos.id, id));
  }
}
