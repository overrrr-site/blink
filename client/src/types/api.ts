/**
 * Pagination metadata returned by paginated API endpoints.
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Standard paginated API response shape.
 * Used by both staff-side (SWR) and LIFF-side (SWR Infinite) data fetching.
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}
