export interface ApiErrorShape {
  code: string;
  message: string;
  status: number;
  fields?: Record<string, string[]>;
}

export class AppError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string[]>;

  constructor(code: string, message: string, status = 500, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function success<T>(data: T) {
  return { data };
}

export function successList<
  T,
  M extends { nextCursor: string | null; hasMore: boolean; limit: number },
>(data: T[], meta: M) {
  return { data, meta };
}

export function error(code: string, message: string, status: number) {
  return { error: { code, message, status } };
}

export function validationError(fields: Record<string, string[]>) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed.',
      status: 422,
      fields,
    },
  };
}
