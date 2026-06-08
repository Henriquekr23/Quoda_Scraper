import { setupDailyJob } from './jobs/daily-collector';
import { ColetaOrchestrator } from './services/coleta.orchestrator';
import { logger } from './utils/logger';
import { poolConnection } from './database/connection';
import { startServer } from './server';

async function bootstrap() {
  logger.info('Iniciando aplicação MTE Mediador Scraper...');

  // Test database connection
  try {
    await poolConnection.query('SELECT 1');
    logger.info('Conexão com banco de dados MySQL verificada com sucesso.');
  } catch (err: any) {
    logger.error(
      { detalhes: { error: err.message } },
      'Falha ao conectar com o banco de dados MySQL durante a inicialização'
    );
    process.exit(1);
  }

  // Check for immediate CLI run flag
  const args = process.argv.slice(2);
  if (args.includes('--now')) {
    logger.info('Execução imediata disparada (--now)...');
    
    // Parse optional specific CNPJ
    let specificCnpj: string | undefined = undefined;
    const cnpjIdx = args.indexOf('--cnpj');
    if (cnpjIdx !== -1 && cnpjIdx + 1 < args.length) {
      specificCnpj = args[cnpjIdx + 1];
    }

    const includeAll = args.includes('--all');
    const vigentesOnly = !includeAll;

    const orchestrator = new ColetaOrchestrator();
    try {
      await orchestrator.runColeta(['DF', 'GO'], specificCnpj, vigentesOnly);
      logger.info('Execução imediata concluída com sucesso!');
    } catch (err: any) {
      logger.error(
        { detalhes: { error: err.message, stack: err.stack } },
        'Falha na execução imediata'
      );
    }
  }

  // Start the HTTP frontend/API server
  startServer(3000);

  // Start scheduled cron jobs
  setupDailyJob();
  
  logger.info('Sistema aguardando agendamentos. Pressione Ctrl+C para encerrar.');
}

bootstrap().catch(err => {
  logger.fatal({ detalhes: { error: err.message, stack: err.stack } }, 'Erro fatal no bootstrap da aplicação');
  process.exit(1);
});
