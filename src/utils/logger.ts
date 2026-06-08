import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Custom timestamp field name mapping to ISOString
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  // Map log message to "evento"
  messageKey: 'evento',
  formatters: {
    level: (label) => {
      return { nivel: label.toUpperCase() };
    },
    // Remove hostname and process id (pid) for cleaner logs
    bindings: () => {
      return {};
    }
  }
});
