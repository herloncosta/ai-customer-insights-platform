import path from 'node:path';
import pino from 'pino';

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as pino.LevelWithSilent;

const LOG_FILE =
  process.env.LOG_FILE ?? path.resolve(process.cwd(), 'logs', 'app.log');

export const logger = pino(
  {
    name: 'backend',
    level: LOG_LEVEL,
    redact: {
      paths: ['*.password', '*.apiKey', 'OPENAI_API_KEY', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD'],
      censor: '[REDACTED]',
    },
  },
  pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        level: LOG_LEVEL,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: LOG_LEVEL,
        options: { destination: LOG_FILE, mkdir: true },
      },
    ],
  }),
);
