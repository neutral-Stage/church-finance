"use client";

import { memo, ReactNode } from "react";

interface MemoizedTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "data-index"?: number;
}

export const MemoizedTableRow = memo(function MemoizedTableRow({
  children,
  className = "",
  onClick,
  ...props
}: MemoizedTableRowProps) {
  return (
    <tr
      className={`border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
});

MemoizedTableRow.displayName = "MemoizedTableRow";

// Memoized table cell component
interface MemoizedTableCellProps {
  children: ReactNode;
  className?: string;
}

export const MemoizedTableCell = memo(function MemoizedTableCell({
  children,
  className = "",
}: MemoizedTableCellProps) {
  return <td className={`p-4 text-white/80 ${className}`}>{children}</td>;
});

MemoizedTableCell.displayName = "MemoizedTableCell";

// Memoized table header component
interface MemoizedTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export const MemoizedTableHeader = memo(function MemoizedTableHeader({
  children,
  className = "",
}: MemoizedTableHeaderProps) {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-white/90 ${className}`}
    >
      {children}
    </th>
  );
});

MemoizedTableHeader.displayName = "MemoizedTableHeader";
