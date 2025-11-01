interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  reqId?: string;
  userId?: string;
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  message?: string;
  error?: any;
  [key: string]: any;
}

const REDACT_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization'];

export class Logger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  info(message: string, meta: Record<string, any> = {}): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta: Record<string, any> = {}): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: any, meta: Record<string, any> = {}): void {
    this.log('error', message, { ...meta, error: error?.stack || error });
  }

  debug(message: string, meta: Record<string, any> = {}): void {
    this.log('debug', message, meta);
  }

  private log(level: LogEntry['level'], message: string, meta: Record<string, any>): void {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...this.redact(meta)
    };

    console.log(JSON.stringify(entry));
  }

  private redact(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (REDACT_FIELDS.some(field => key.toLowerCase().includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redact(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  child(context: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...context });
  }
}

export const logger = new Logger();
