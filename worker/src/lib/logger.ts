import path from 'node:path';
import pino from 'pino';

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as pino.LevelWithSilent;

// Arquivo local na raiz do serviço (cwd): <root>/logs/app.log
// (no Docker, cwd = /app; localmente, cwd = worker/)
const LOG_FILE =
  process.env.LOG_FILE ?? path.resolve(process.cwd(), 'logs', 'app.log');

export const logger = pino(
  {
    name: 'worker',
    level: LOG_LEVEL,
    redact: {
      paths: ['*.password', '*.apiKey', 'OPENAI_API_KEY', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD'],
      censor: '[REDACTED]',
    },
  },
  pino.transport({
    targets: [
      {
        // Terminal: legível em dev (colorido)
        target: 'pino-pretty',
        level: LOG_LEVEL,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      {
        // Arquivo local (JSON, uma linha por log)
        target: 'pino/file',
        level: LOG_LEVEL,
        options: { destination: LOG_FILE, mkdir: true },
      },
    ],
  }),
);
