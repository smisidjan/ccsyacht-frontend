"use client";

interface LoadingSkeletonProps {
  type?: "table" | "form" | "list" | "header";
  rows?: number;
  showHeader?: boolean;
  showButton?: boolean;
}

function SkeletonBox({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderSkeleton({ showButton = false }: { showButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="animate-pulse">
        <SkeletonBox className="h-8 w-48 mb-2" />
        <SkeletonBox className="h-4 w-64" />
      </div>
      {showButton && (
        <SkeletonBox className="h-10 w-32 rounded-lg" />
      )}
    </div>
  );
}

export default function LoadingSkeleton({
  type = "table",
  rows = 3,
  showHeader = true,
  showButton = false,
}: LoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {showHeader && <HeaderSkeleton showButton={showButton} />}

      {type === "table" && <TableSkeleton rows={rows} />}
      {type === "form" && <FormSkeleton rows={rows} />}
      {type === "list" && <ListSkeleton rows={rows} />}
      {type === "header" && null}
    </div>
  );
}

// Export individual parts for flexible composition
export { SkeletonBox, TableSkeleton, FormSkeleton, ListSkeleton, HeaderSkeleton };
