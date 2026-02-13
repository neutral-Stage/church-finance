"use client";

import { memo, ReactNode } from "react";

interface MemoizedListItemProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export const MemoizedListItem = memo(function MemoizedListItem({
  children,
  className = "",
  onClick,
  onDoubleClick,
}: MemoizedListItemProps) {
  return (
    <div
      className={`hover:bg-white/5 transition-colors ${className}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
});

MemoizedListItem.displayName = "MemoizedListItem";
