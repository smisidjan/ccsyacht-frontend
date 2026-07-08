"use client";

import { ReactNode } from "react";
import Spinner from "./Spinner";
import Alert from "./Alert";

interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  rowClassName?: (item: T) => string;
  emptyMessage?: ReactNode;
  minWidth?: string;
  footer?: ReactNode;
  label?: string;
  loading?: boolean;
  error?: string | null;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  rowClassName,
  emptyMessage,
  minWidth = "700px",
  footer,
  label,
  loading = false,
  error = null,
}: TableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full" style={{ minWidth }}>
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 ${column.headerClassName || "text-left"} text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${rowClassName?.(item) || ""}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 ${column.className || ""}`}
                  >
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && emptyMessage && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-3">
          {footer}
        </div>
      )}
    </div>
  );
}
