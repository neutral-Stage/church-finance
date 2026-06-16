import type { ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
  className?: string
  headerClassName?: string
  mobileLabel?: string
  hideOnMobile?: boolean
}

export interface DataTablePagination {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export interface DataTableFilter {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filterSlot?: ReactNode
}

export interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[]
  data: T[]
  sortColumn?: string
  sortDirection?: SortDirection
  onSortChange?: (columnId: string, direction: SortDirection) => void
  pagination?: DataTablePagination
  filter?: DataTableFilter
  emptyState?: ReactNode
  mobileCardRender?: (row: T) => ReactNode
  isLoading?: boolean
  getRowId?: (row: T) => string
  className?: string
}
