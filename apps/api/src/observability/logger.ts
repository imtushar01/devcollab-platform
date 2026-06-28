import { createLogger, format, transports } from 'winston';

export const structuredLogger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  defaultMeta: {
    service: 'devcollab-api',
    environment: process.env.NODE_ENV ?? 'development',
  },
  transports: [
    new transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? format.json()
        : format.combine(format.colorize(), format.simple()),
    }),
  ],
});