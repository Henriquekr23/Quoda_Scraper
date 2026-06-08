import { db, poolConnection } from './connection';
import { SindicatosRepository } from '../modules/sindicatos/sindicatos.repository';
import { logger } from '../utils/logger';

async function seed() {
  logger.info('Iniciando semeação do banco de dados (seed)...');
  const repo = new SindicatosRepository();

  const mockUnions = [
    {
      cnpj: '17312597000102',
      nome: 'Sindicato dos Vigilantes do DF',
      ativo: true
    },
    {
      cnpj: '24687636000111',
      nome: 'Confederação Nacional dos Trabalhadores Assalariados Rurais',
      ativo: true
    }
  ];

  try {
    for (const union of mockUnions) {
      const existing = await repo.findByCnpj(union.cnpj);
      if (!existing) {
        await repo.create(union);
        logger.info({ detalhes: { union } }, 'Sindicato semeado com sucesso');
      } else {
        logger.info({ detalhes: { union } }, 'Sindicato já existe no banco. Ignorando.');
      }
    }
    logger.info('Semeação concluída com sucesso!');
  } catch (err: any) {
    logger.error({ detalhes: { error: err.message } }, 'Falha na semeação do banco de dados');
  } finally {
    await poolConnection.end();
  }
}

seed();
