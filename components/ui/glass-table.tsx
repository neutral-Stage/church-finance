import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const glassTableVariants = cva(
  'w-full caption-bottom text-sm',
  {
    variants: {
      variant: {
        default: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden',
        bordered: 'bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden',
        minimal: 'bg-transparent',
        card: 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-lg',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface GlassTableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof glassTableVariants> {
  responsive?: boolean;
  stickyHeader?: boolean;
}

const GlassTable = React.forwardRef<HTMLTableElement, GlassTableProps>(
  ({ className, variant, size, responsive = true, stickyHeader = false, ...props }, ref) => {
    const tableElement = (
      <table
        className={cn(
          glassTableVariants({ variant, size }),
          {
            'table-fixed': !responsive,
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (responsive) {
      return (
        <div className="relative w-full overflow-auto">
          <div className={cn('mobile-table', stickyHeader && 'max-h-96')}>
            {tableElement}
          </div>
        </div>
      );
    }

    return tableElement;
  }
);

GlassTable.displayName = 'GlassTable';

// Table Header
export type GlassTableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>

const GlassTableHeader = React.forwardRef<HTMLTableSectionElement, GlassTableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10',
        className
      )}
      {...props}
    />
  )
);

GlassTableHeader.displayName = 'GlassTableHeader';

// Table Body
export type GlassTableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>

const GlassTableBody = React.forwardRef<HTMLTableSectionElement, GlassTableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
);

GlassTableBody.displayName = 'GlassTableBody';

// Table Footer
export type GlassTableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>

const GlassTableFooter = React.forwardRef<HTMLTableSectionElement, GlassTableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn(
        'border-t border-white/20 bg-white/5 font-medium [&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  )
);

GlassTableFooter.displayName = 'GlassTableFooter';

// Table Row
export interface GlassTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

const GlassTableRow = React.forwardRef<HTMLTableRowElement, GlassTableRowProps>(
  ({ className, hover = true, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-white/10 transition-colors',
        {
          'hover:bg-white/5 data-[state=selected]:bg-white/10': hover,
        },
        className
      )}
      {...props}
    />
  )
);

GlassTableRow.displayName = 'GlassTableRow';

// Table Head
export interface GlassTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
}

const GlassTableHead = React.forwardRef<HTMLTableCellElement, GlassTableHeadProps>(
  ({ className, sortable = false, sorted = false, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 text-left align-middle font-semibold text-white/90 [&:has([role=checkbox])]:pr-0',
        {
          'cursor-pointer select-none hover:text-white transition-colors': sortable,
        },
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <div className="flex flex-col">
            <svg
              className={cn(
                'h-3 w-3 transition-colors',
                sorted === 'asc' ? 'text-white' : 'text-white/40'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        )}
      </div>
    </th>
  )
);

GlassTableHead.displayName = 'GlassTableHead';

// Table Cell
export interface GlassTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

const GlassTableCell = React.forwardRef<HTMLTableCellElement, GlassTableCellProps>(
  ({ className, numeric = false, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'p-4 align-middle text-white/80 [&:has([role=checkbox])]:pr-0',
        {
          'text-right font-mono': numeric,
        },
        className
      )}
      {...props}
    />
  )
);

GlassTableCell.displayName = 'GlassTableCell';

// Table Caption
export type GlassTableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>

const GlassTableCaption = React.forwardRef<HTMLTableCaptionElement, GlassTableCaptionProps>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-white/60', className)}
      {...props}
    />
  )
);

GlassTableCaption.displayName = 'GlassTableCaption';

// Empty State Component
export interface GlassTableEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const GlassTableEmpty = React.forwardRef<HTMLDivElement, GlassTableEmptyProps>(
  ({ className, icon, title = 'No data available', description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      {...props}
    >
      {icon && <div className="mb-4 text-white/40">{icon}</div>}
      <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>
      {description && <p className="text-sm text-white/60 mb-4 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
);

GlassTableEmpty.displayName = 'GlassTableEmpty';

// Loading State Component
export interface GlassTableLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

const GlassTableLoading = React.forwardRef<HTMLDivElement, GlassTableLoadingProps>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => (
    <div ref={ref} className={cn('animate-pulse', className)} {...props}>
      <GlassTable>
        <GlassTableHeader>
          <GlassTableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <GlassTableHead key={i}>
                <div className="h-4 bg-white/20 rounded" />
              </GlassTableHead>
            ))}
          </GlassTableRow>
        </GlassTableHeader>
        <GlassTableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <GlassTableRow key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <GlassTableCell key={j}>
                  <div className="h-4 bg-white/10 rounded" />
                </GlassTableCell>
              ))}
            </GlassTableRow>
          ))}
        </GlassTableBody>
      </GlassTable>
    </div>
  )
);

GlassTableLoading.displayName = 'GlassTableLoading';

export {
  GlassTable,
  GlassTableHeader,
  GlassTableBody,
  GlassTableFooter,
  GlassTableHead,
  GlassTableRow,
  GlassTableCell,
  GlassTableCaption,
  GlassTableEmpty,
  GlassTableLoading,
  glassTableVariants,
};