import Transport = require('winston-transport');
import Winston = require('winston');

enum LogLevel {
  Verbose = 'verbose',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

let consoleTransport: Winston.transports.ConsoleTransportInstance;
let transports: Transport[];
let logger: Winston.Logger;

/**
 * Helper constant to produce a readable output
 * for winston console logs.
 */
const readableFormat = Winston.format.printf(
  // Prettier and eslint are fighting ¯\_(ツ)_/¯
  // eslint-disable-next-line object-curly-newline
  ({ level, message, timestamp, meta }) => {
    if (process.env.NODE_ENV !== 'production') {
      return `${timestamp} ${level}: ${message}${
        level !== 'http' && meta ? `\n${JSON.stringify(meta, null, 2)}` : ''
      }`;
    }
    return `${timestamp} ${level}: ${message}`;
  },
);

/**
 * Initialize the winston transports and loggers.
 */
export function initialize(): void {
  // Initialize transports
  transports = [];

  if (!consoleTransport) {
    // Initialize console transport
    transports.push(new Winston.transports.Console({
      level: process.env.CONSOLE_LOG_LEVEL || 'info',
      format: Winston.format.combine(
        Winston.format.timestamp(),
        Winston.format.colorize(),
        readableFormat,
      ),
    }));
  }

  // Initialize logger
  if (!logger) {
    logger = Winston.createLogger({
      transports,
    });
  }
}

function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!logger) {
    console.error(`ERROR Attempted to log ${level} without first initializing logger!`);
    console.error('ERROR You may not have called initialize() on this utility...');
    return;
  }

  logger.log({
    level,
    message,
    meta,
  });
}

/**
 * Logs a message with the verbose level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const verbose = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Verbose, msg, meta);

/**
 * Logs a message with the info level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const info = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Info, msg, meta);

/**
 * Logs a message with the warn level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const warn = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Warn, msg, meta);

/**
 * Logs a message with error level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const error = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Error, msg, meta);
