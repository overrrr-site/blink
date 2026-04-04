type ErrorLike = Error & {
  code?: unknown;
  status?: unknown;
  detail?: unknown;
  hint?: unknown;
};

export function formatErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const err = error as ErrorLike;
    return {
      name: err.name,
      message: err.message,
      code: typeof err.code === 'string' ? err.code : undefined,
      status: typeof err.status === 'number' ? err.status : undefined,
    };
  }

  return {
    value: typeof error === 'string' ? error : Object.prototype.toString.call(error),
  };
}
