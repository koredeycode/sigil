type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;
  private timers = new Map<string, number>();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level || 'info',
      enableConsole: config?.enableConsole ?? true,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const logMessage = this.formatMessage(level, message, data);

    if (this.config.enableConsole) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](logMessage);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, errorData);
  }

  /**
   * Start a named timer for measuring execution duration.
   */
  time(label: string): void {
    this.timers.set(label, Date.now());
  }

  /**
   * End a named timer and log the elapsed time.
   */
  timeEnd(label: string): void {
    const start = this.timers.get(label);
    if (start === undefined) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }
    const elapsed = Date.now() - start;
    this.timers.delete(label);
    this.info(`${label} completed`, { durationMs: elapsed });
  }

  /**
   * Update the log level at runtime.
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

export const logger = new Logger();
export default logger;
