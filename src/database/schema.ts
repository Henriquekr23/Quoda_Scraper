import { mysqlTable, bigint, varchar, boolean, timestamp, date, text, longtext } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const sindicatos = mysqlTable('sindicatos', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  cnpj: varchar('cnpj', { length: 20 }).notNull(),
  nome: varchar('nome', { length: 255 }),
  ativo: boolean('ativo').default(true),
  criadoEm: timestamp('criado_em').default(sql`CURRENT_TIMESTAMP`)
});

export const instrumentos = mysqlTable('instrumentos', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  sindicatoId: bigint('sindicato_id', { mode: 'number' }).references(() => sindicatos.id),
  numeroRegistro: varchar('numero_registro', { length: 50 }),
  numeroSolicitacao: varchar('numero_solicitacao', { length: 50 }),
  tipoInstrumento: varchar('tipo_instrumento', { length: 100 }),
  uf: varchar('uf', { length: 2 }),
  dataProtocolo: date('data_protocolo'),
  dataRegistro: date('data_registro'),
  vigenciaInicio: date('vigencia_inicio'),
  vigenciaFim: date('vigencia_fim'),
  situacao: varchar('situacao', { length: 50 }),
  htmlPath: text('html_path'),
  pdfPath: text('pdf_path'),
  hashDocumento: varchar('hash_documento', { length: 255 }),
  criadoEm: timestamp('criado_em').default(sql`CURRENT_TIMESTAMP`),
  atualizadoEm: timestamp('atualizado_em').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
});

export const clausulas = mysqlTable('clausulas', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  instrumentoId: bigint('instrumento_id', { mode: 'number' }).references(() => instrumentos.id),
  titulo: text('titulo'),
  conteudo: longtext('conteudo'), // Note: text type in drizzle mysql is sufficient, or longtext if specified (drizzle doesn't have a separate longtext core type, text is mapped to text/mediumtext/longtext depending on params if supported, but mysql text supports 64KB, mediumtext supports 16MB. Drizzle mysql text can take { length: 65535 } or similar. We can define text without parameters, which maps to TEXT).
  categoria: varchar('categoria', { length: 100 }),
  criadoEm: timestamp('criado_em').default(sql`CURRENT_TIMESTAMP`)
});
