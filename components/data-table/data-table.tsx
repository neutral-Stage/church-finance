'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DataTableProps, SortDirection } from './types'

function getCellValue<T extends { id: string }>(
  row: T,
  column: DataTableProps<T>['columns'][number]
): unknown {
  if (column.cell) return column.cell(row)
  if (column.accessorKey) return row[column.accessorKey]
  return null
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSortChange,
  pagination,
  filter,
  emptyState,
  mobileCardRender,
  isLoading = false,
  getRowId = (row) => row.id,
  className,
}: DataTableProps<T>) {
  const [internalSortColumn, setInternalSortColumn] = useState<string | undefined>()
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('asc')

  const sortColumn = controlledSortColumn ?? internalSortColumn
  const sortDirection = controlledSortDirection ?? internalSortDirection

  const handleSort = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId)
    if (!column?.sortable) return

    const nextDirection: SortDirection =
      sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc'

    if (onSortChange) {
      onSortChange(columnId, nextDirection)
    } else {
      setInternalSortColumn(columnId)
      setInternalSortDirection(nextDirection)
    }
  }

  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    const column = columns.find((c) => c.id === sortColumn)
    if (!column?.sortable) return data

    const sorted = [...data].sort((a, b) => {
      if (column.sortFn) return column.sortFn(a, b)
      if (column.accessorKey) {
        return compareValues(a[column.accessorKey], b[column.accessorKey])
      }
      return 0
    })

    return sortDirection === 'desc' ? sorted.reverse() : sorted
  }, [columns, data, sortColumn, sortDirection])

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData
    const start = (pagination.page - 1) * pagination.pageSize
    return sortedData.slice(start, start + pagination.pageSize)
  }, [pagination, sortedData])

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))
    : 1

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortColumn !== columnId) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    )
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(filter?.onSearchChange || filter?.filterSlot) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {filter.onSearchChange && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={filter.searchPlaceholder ?? 'Search...'}
                value={filter.search ?? ''}
                onChange={(e) => filter.onSearchChange?.(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filter.filterSlot}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                      <SortIcon columnId={column.id} />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyState ?? 'No results.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {getCellValue(row, column) as ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {paginatedData.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {emptyState ?? 'No results.'}
          </div>
        ) : (
          paginatedData.map((row) =>
            mobileCardRender ? (
              <div key={getRowId(row)}>{mobileCardRender(row)}</div>
            ) : (
              <Card key={getRowId(row)}>
                <CardContent className="space-y-2 p-4">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div key={column.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{column.mobileLabel ?? column.header}</span>
                        <span className="text-right font-medium">{getCellValue(row, column) as React.ReactNode}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )
          )
        )}
      </div>

      {pagination && pagination.totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount}
          </p>
          <div className="flex items-center gap-2">
            {pagination.onPageSizeChange && (
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pagination.pageSizeOptions ?? [10, 25, 50]).map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center text-sm text-muted-foreground">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
