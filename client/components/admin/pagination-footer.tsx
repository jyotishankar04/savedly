"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as ArrowLeft, ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";

// Extracted from admin/users/page.tsx's inline prev/next footer — every
// paginated admin list uses the same {page, limit, total} shape from the
// server's ApiResponse meta.
export function PaginationFooter({
  page,
  limit,
  total,
  onPageChange,
  itemLabel = "item",
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
      <span>
        {total} {itemLabel}
        {total === 1 ? "" : "s"} · page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-6 w-6 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-6 w-6 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
