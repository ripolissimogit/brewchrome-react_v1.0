import { track } from '@vercel/analytics';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, context, timestamp } = entry;
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private sendToVercelAnalytics(
    level: string,
    message: string,
    context?: LogContext
  ) {
    // Send to Vercel Analytics for tracking
    track(`log_${level}`, {
      message,
      ...context,
    });
  }

  debug(message: string, context?: LogContext) {
    const entry = this.createLogEntry('debug', message, context);
    this.addLog(entry);

    if (this.isDev) {
      console.debug(this.formatMessage(entry));
    }
  }

  info(message: string, context?: LogContext) {
    const entry = this.createLogEntry('info', message, context);
    this.addLog(entry);

    console.info(this.formatMessage(entry));
    this.sendToVercelAnalytics('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    const entry = this.createLogEntry('warn', message, context);
    this.addLog(entry);

    console.warn(this.formatMessage(entry));
    this.sendToVercelAnalytics('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    const entry = this.createLogEntry('error', message, context);
    this.addLog(entry);

    console.error(this.formatMessage(entry));
    this.sendToVercelAnalytics('error', message, context);
  }

  // API Error logging
  apiError(endpoint: string, error: Error | unknown, context?: LogContext) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.error(`API Error: ${endpoint}`, {
      error: errorMessage,
      stack: errorStack,
      ...context,
    });
  }

  // User action logging
  userAction(action: string, context?: LogContext) {
    this.info(`User Action: ${action}`, context);

    // Track user actions specifically in Vercel Analytics
    track('user_action', {
      action,
      ...context,
    });
  }

  // File processing logging
  fileProcessing(action: string, fileName: string, context?: LogContext) {
    this.info(`File Processing: ${action}`, {
      fileName,
      ...context,
    });

    // Track file processing events
    track('file_processing', {
      action,
      fileName,
      ...context,
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }
}

// Global logger instance
export const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Global Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', {
    reason: event.reason,
    stack: event.reason?.stack,
  });
});

export default logger;
