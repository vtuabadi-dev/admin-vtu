import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    size: {
      normal: "",
      dense: "dense-table",
    },
  },
  defaultVariants: {
    size: "dense",
  },
});

interface TableProps<T> extends VariantProps<typeof tableVariants> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  className?: string;
  dense?: boolean;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyField,
  onRowClick,
  className,
  dense = true,
  emptyMessage = "Tidak ada data",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <table className={tableVariants({ size: dense ? "dense" : "normal" })}>
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            <th className="h-10 w-10 px-3 text-left align-middle font-medium text-muted-foreground">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "h-10 px-3 text-left align-middle font-medium text-muted-foreground",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, idx) => (
            <tr
              key={String(row[keyField])}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              <td className="p-3 align-middle text-xs text-muted-foreground w-10">
                {idx + 1}
              </td>
              {columns.map((col) => (
                <td key={col.key} className={cn("p-3 align-middle", col.className)}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
