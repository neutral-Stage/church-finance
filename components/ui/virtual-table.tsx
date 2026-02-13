"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualTableProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
}

export function useVirtualTable<T>({
  data,
  estimatedItemSize = 50,
  overscan = 5,
}: {
  data: T[];
  estimatedItemSize?: number;
  overscan?: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemSize,
    overscan,
  });

  return {
    parentRef,
    rowVirtualizer,
  };
}

interface VirtualTableComponentProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  loadingMessage?: string;
}

export function VirtualTable<T>({
  data,
  renderRow,
  estimatedItemSize = 50,
  overscan = 5,
  className = "",
  containerClassName = "",
  loadingMessage = "Loading...",
}: VirtualTableComponentProps<T>) {
  const { parentRef, rowVirtualizer } = useVirtualTable<T>({
    data,
    estimatedItemSize,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  if (data.length === 0) {
    return (
      <div className={`text-center py-8 text-white/60 ${containerClassName}`}>
        No data available
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height: "400px" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <table className={`w-full ${className}`}>
          <tbody>
            {virtualItems.map((virtualRow) => {
              const item = data[virtualRow.index];
              return (
                <tr
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderRow(item, virtualRow.index)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
