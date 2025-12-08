import { P2PErrorType, P2PError } from '../types/p2p-types';

/**
 * Custom P2P Error class
 * Provides structured error handling with context
 */
export class P2PErrorClass extends Error {
  public readonly type: P2PErrorType;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: P2PErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'P2PError';
    this.type = type;
    this.originalError = originalError;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, P2PErrorClass);
    }
  }

  /**
   * Convert to P2PError interface
   */
  toP2PError(): P2PError {
    return {
      type: this.type,
      message: this.message,
      originalError: this.originalError,
      context: this.context,
    };
  }

  /**
   * Check if error is of specific type
   */
  isType(type: P2PErrorType): boolean {
    return this.type === type;
  }
}

/**
 * Helper function to create P2PError from various error types
 */
export function createP2PError(
  type: P2PErrorType,
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): P2PErrorClass {
  return new P2PErrorClass(type, message, originalError, context);
}

/**
 * Helper function to check if error is P2PError
 */
export function isP2PError(error: any): error is P2PErrorClass {
  return error instanceof P2PErrorClass;
}

