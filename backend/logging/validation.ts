import { ValidationError } from "./errors";

export interface ValidationRule<T = any> {
  field: string;
  message?: string;
  validate: (value: T) => boolean;
}

export function validateRequired(value: any, field: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${field} is required`, field);
  }
}

export function validateString(value: any, field: string, options?: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, field);
  }

  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${field} must be at least ${options.minLength} characters`,
      field
    );
  }

  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${field} must be no more than ${options.maxLength} characters`,
      field
    );
  }

  if (options?.pattern !== undefined) {
    if (!(options.pattern instanceof RegExp)) {
      throw new ValidationError(`${field} pattern must be a RegExp`, field);
    }
    if (!options.pattern.test(value)) {
      throw new ValidationError(`${field} format is invalid`, field);
    }
  }
}

export function validateNumber(value: any, field: string, options?: {
  min?: number;
  max?: number;
  integer?: boolean;
}): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${field} must be a number`, field);
  }

  if (options?.integer && !Number.isInteger(value)) {
    throw new ValidationError(`${field} must be an integer`, field);
  }

  if (options?.min !== undefined && value < options.min) {
    throw new ValidationError(`${field} must be at least ${options.min}`, field);
  }

  if (options?.max !== undefined && value > options.max) {
    throw new ValidationError(`${field} must be no more than ${options.max}`, field);
  }
}

export function validateEmail(value: any, field: string = 'email'): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  validateString(value, field, { pattern: emailPattern });
}

export function validateUrl(value: any, field: string = 'url'): void {
  if (value === undefined || value === null || value === '') {
    return;
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a valid URL`, field);
  }
  
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError(`${field} must be a valid URL`, field);
    }
  } catch (error) {
    // Re-throw ValidationError if it's already one
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`${field} must be a valid URL`, field);
  }
}

export function validateEnum<T>(
  value: any,
  validValues: T[],
  field: string
): void {
  if (!validValues.includes(value)) {
    throw new ValidationError(
      `${field} must be one of: ${validValues.join(', ')}`,
      field
    );
  }
}

export function validateArray(value: any, field: string, options?: {
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: any, index: number) => void;
}): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array`, field);
  }

  if (options?.minLength && value.length < options.minLength) {
    throw new ValidationError(
      `${field} must have at least ${options.minLength} items`,
      field
    );
  }

  if (options?.maxLength && value.length > options.maxLength) {
    throw new ValidationError(
      `${field} must have no more than ${options.maxLength} items`,
      field
    );
  }

  if (options?.itemValidator) {
    value.forEach((item, index) => {
      try {
        options.itemValidator!(item, index);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(
            `${field}[${index}]: ${error.message}`,
            `${field}[${index}]`
          );
        }
        throw error;
      }
    });
  }
}

export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizeHtml(value: string): string {
  if (typeof value !== 'string') return '';
  let out = value;
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|src)\s*=\s*(["']?)javascript:[^"'>\s]+\2/gi, '$1="#"');
  out = out.replace(/javascript:/gi, '');
  return out;
}