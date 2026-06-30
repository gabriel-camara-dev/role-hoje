export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResults<T> {
  data: T[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
}
