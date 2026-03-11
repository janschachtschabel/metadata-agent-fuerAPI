import { Injectable } from '@angular/core';
import { WidgetDebug } from './debug';

/**
 * Log Level Enum
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5
}

/**
 * Config Service - Logging and general app configuration
 * 
 * Note: Layout management has been moved to LayoutService (core/layout.service.ts)
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private logLevel = LogLevel.INFO;

  // ===== Logging =====

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  log(message: string, level: LogLevel = LogLevel.INFO, ...args: unknown[]): void {
    if (level > this.logLevel) return;
    // DEBUG/VERBOSE only when debug mode is active
    if (level >= LogLevel.DEBUG && !WidgetDebug.enabled) return;

    const prefix = this.getLogPrefix(level);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
      case LogLevel.VERBOSE:
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  private getLogPrefix(level: LogLevel): string {
    const prefixes: Record<LogLevel, string> = {
      [LogLevel.NONE]: '',
      [LogLevel.ERROR]: '❌',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.INFO]: '📋',
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.VERBOSE]: '📝'
    };
    return prefixes[level] || '';
  }

  // Convenience methods
  error(message: string, ...args: unknown[]): void {
    this.log(message, LogLevel.ERROR, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(message, LogLevel.WARN, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(message, LogLevel.INFO, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(message, LogLevel.DEBUG, ...args);
  }
}
