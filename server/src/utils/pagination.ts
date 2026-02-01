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

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parsePaginationParams(query: { page?: string | string[]; limit?: string | string[] }): PaginationParams {
  const page = parsePositiveInt(query.page) ?? 1;
  const limit = Math.min(parsePositiveInt(query.limit) ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Extracts total count and strips the `total_count` column from rows
 * returned by queries using `COUNT(*) OVER() as total_count`.
 */
export function extractTotalCount(rows: Record<string, unknown>[]): { data: Record<string, unknown>[]; total: number } {
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const data = rows.map(({ total_count, ...rest }) => rest);
  return { data, total };
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
