import { getAuthData } from "~encore/auth";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  service?: string;
  endpoint?: string;
  userId?: string;
  requestId?: string;
  error?: Error;
  data?: Record<string, any>;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    // Try to get current user context
    let userId: string | undefined;
    try {
      const auth = getAuthData();
      userId = auth?.userID;
    } catch {
      // Auth data not available in this context
    }

    const logData = {
      timestamp,
      level: levelName,
      message,
      userId: context?.userId || userId,
      service: context?.service,
      endpoint: context?.endpoint,
      requestId: context?.requestId || this.generateRequestId(),
      error: context?.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      } : undefined,
      data: context?.data,
    };

    // Filter out undefined values
    const cleanedLogData = Object.fromEntries(
      Object.entries(logData).filter(([_, v]) => v !== undefined)
    );

    if (level >= LogLevel.ERROR) {
      console.error(JSON.stringify(cleanedLogData, null, 2));
    } else if (level >= LogLevel.WARN) {
      console.warn(JSON.stringify(cleanedLogData, null, 2));
    } else {
      console.log(JSON.stringify(cleanedLogData, null, 2));
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }
}

export const logger = new Logger();