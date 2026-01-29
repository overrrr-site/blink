import api from '../api/client';

// Axios ベースの fetcher（SWR 用）
export const fetcher = (url: string) => api.get(url).then((res) => res.data);

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
