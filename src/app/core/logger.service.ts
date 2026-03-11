import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { WidgetDebug } from './debug';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Logger Service - Centralized logging with configurable log level
 * Configure via environment.logLevel: 'error' | 'warn' | 'info' | 'debug'
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private currentLevel: number;
  private prefix = '[Canvas]';

  constructor() {
    const level = (environment as any).logLevel || 'info';
    this.currentLevel = LOG_LEVELS[level as LogLevel] ?? LOG_LEVELS.info;
    this.info(`Logger initialized with level: ${level}`);
  }

  private shouldLog(level: LogLevel): boolean {
    if (LOG_LEVELS[level] > this.currentLevel) return false;
    // 'debug' level only when debug mode is active
    if (level === 'debug' && !WidgetDebug.enabled) return false;
    return true;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`${this.prefix} ❌ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.prefix} ⚠️ ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`${this.prefix} ℹ️ ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`${this.prefix} 🔍 ${message}`, ...args);
    }
  }

  // Grouped logging for complex operations
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // Timing helpers
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}
