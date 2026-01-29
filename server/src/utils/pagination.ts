export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : null;
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parsePaginationParams(query: { page?: string | string[]; limit?: string | string[] }): PaginationParams {
  const pageValue = parsePositiveInt(firstQueryValue(query.page));
  const limitValue = parsePositiveInt(firstQueryValue(query.limit));

  const page = pageValue && pageValue > 0 ? pageValue : 1;
  const limit = Math.min(limitValue ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  const totalPages = params.limit > 0 ? Math.ceil(total / params.limit) : 0;
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  };
}
