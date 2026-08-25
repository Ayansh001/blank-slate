type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private isDevelopment = import.meta.env.DEV;

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private createLogEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };
  }

  info(module: string, message: string, data?: any): void {
    const entry = this.createLogEntry('info', module, message, data);
    this.logs.push(entry);
    
    if (this.isDevelopment) {
      console.log(`[${entry.timestamp}] [${module}] ${message}`, data || '');
    }
  }

  warn(module: string, message: string, data?: any): void {
    const entry = this.createLogEntry('warn', module, message, data);
    this.logs.push(entry);
    
    if (this.isDevelopment) {
      console.warn(`[${entry.timestamp}] [${module}] ${message}`, data || '');
    }
  }

  error(module: string, message: string, data?: any): void {
    const entry = this.createLogEntry('error', module, message, data);
    this.logs.push(entry);
    
    console.error(`[${entry.timestamp}] [${module}] ${message}`, data || '');
  }

  debug(module: string, message: string, data?: any): void {
    if (!this.isDevelopment) return;
    
    const entry = this.createLogEntry('debug', module, message, data);
    this.logs.push(entry);
    
    console.debug(`[${entry.timestamp}] [${module}] ${message}`, data || '');
  }

  getLogs(module?: string, level?: LogLevel): LogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (module) {
      filteredLogs = filteredLogs.filter(log => log.module === module);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-100); // Return last 100 logs
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = DebugLogger.getInstance();