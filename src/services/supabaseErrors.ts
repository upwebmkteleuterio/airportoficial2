export function newServiceId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function serviceError(operation: string, error: unknown): Error {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  return new Error(`${operation}: ${message}`);
}

export function throwServiceError(operation: string, error: unknown): never {
  throw serviceError(operation, error);
}
