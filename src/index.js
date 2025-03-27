import { EmailProcessor } from './application/services/email-processor.js';
import { GmailAdapter } from './infrastructure/adapters/gmail-adapter.js';
import { PostgresRepository } from './infrastructure/repositories/postgres-adapter.js';
import { ConfigService } from './infrastructure/config/config-service.js';
import { Logger } from './infrastructure/logging/logger.js';

async function main() {
  try {
    const logger = new Logger();
    logger.info('Iniciando proceso de extracción de correos de Davivienda');
    
    const config = new ConfigService();
    
    // Crear adaptadores y repositorios
    const expenseRepository = new PostgresRepository(config.getDatabaseConfig(), logger);
    const emailAdapter = new GmailAdapter(config.getGmailConfig(), logger, expenseRepository);
    
    // Crear servicio de la capa de aplicación
    const emailProcessor = new EmailProcessor(emailAdapter, expenseRepository, logger);
    
    // Ejecutar proceso
    await emailProcessor.processEmails();
    
    logger.info('Proceso completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en el proceso principal:', error);
    process.exit(1);
  }
}

// Ejecutar la aplicación
main();
