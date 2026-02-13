import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Standard API response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper function to create success response
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    pagination?: PaginationInfo;
  },
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(options?.message && { message: options.message }),
    ...(options?.pagination && { pagination: options.pagination }),
  } as ApiSuccessResponse<T>);
}

// Helper function to create error response
export function errorResponse(
  error: string,
  status: number = 500,
  options?: {
    code?: string;
    details?: Record<string, unknown>;
  },
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(options?.code && { code: options.code }),
      ...(options?.details && { details: options.details }),
    } as ApiErrorResponse,
    { status },
  );
}

// Helper for 400 Bad Request
export function badRequest(
  error: string,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  return errorResponse(error, 400, { details });
}

// Helper for 401 Unauthorized
export function unauthorized(
  error: string = "Authentication required",
): NextResponse<ApiErrorResponse> {
  return errorResponse(error, 401, { code: "UNAUTHORIZED" });
}

// Helper for 403 Forbidden
export function forbidden(
  error: string = "You do not have permission to perform this action",
): NextResponse<ApiErrorResponse> {
  return errorResponse(error, 403, { code: "FORBIDDEN" });
}

// Helper for 404 Not Found
export function notFound(
  error: string = "Resource not found",
): NextResponse<ApiErrorResponse> {
  return errorResponse(error, 404, { code: "NOT_FOUND" });
}

// Helper for 500 Internal Server Error
export function serverError(
  error: string = "Internal server error",
): NextResponse<ApiErrorResponse> {
  return errorResponse(error, 500, { code: "INTERNAL_ERROR" });
}

// Pagination helper
export function calculatePagination(
  page: number,
  pageSize: number,
  total: number,
): PaginationInfo {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

// Parse pagination from request query params
export function parsePagination(request: NextRequest): {
  page: number;
  pageSize: number;
} {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  // Sanitize values
  const sanitizedPage = Math.max(1, isNaN(page) ? 1 : page);
  const sanitizedPageSize = Math.min(
    100,
    Math.max(1, isNaN(pageSize) ? 10 : pageSize),
  );

  return {
    page: sanitizedPage,
    pageSize: sanitizedPageSize,
  };
}
