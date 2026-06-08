import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, poolConnection } from './connection';
import { logger } from '../utils/logger';

async function runMigrations() {
  logger.info('Iniciando migrações do banco de dados...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('Migrações concluídas com sucesso!');
  } catch (error: any) {
    logger.error({ detalhes: { error: error.message, stack: error.stack } }, 'Falha na execução de migrações');
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

runMigrations();
