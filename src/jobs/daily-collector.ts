import { Cron } from 'croner';
import { ColetaOrchestrator } from '../services/coleta.orchestrator';
import { logger } from '../utils/logger';

export function setupDailyJob(): Cron {
  logger.info('Registrando Job diário da Coleta (cron expression: 0 3 * * *)...');
  
  // Daily job at 03:00 AM
  const job = new Cron('0 3 * * *', async () => {
    logger.info('Iniciando execução do Job Diário de Coleta...');
    const orchestrator = new ColetaOrchestrator();
    try {
      await orchestrator.runColeta();
      logger.info('Execução do Job Diário de Coleta concluída com sucesso!');
    } catch (err: any) {
      logger.error(
        { detalhes: { error: err.message, stack: err.stack } },
        'Falha no Job Diário de Coleta'
      );
    }
  });

  return job;
}
