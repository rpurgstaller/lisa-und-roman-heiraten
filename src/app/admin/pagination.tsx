export const pageSizeOptions = [10, 25, 50] as const;

export type PageSize = (typeof pageSizeOptions)[number];

export function getPageCount(totalItems: number, pageSize: PageSize) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPageItems<T>(items: readonly T[], page: number, pageSize: PageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

const buttonClassName =
  "border border-[#74816f] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#4d594a] hover:bg-[#4d594a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#4d594a]";

type TablePaginationProps = {
  id: string;
  totalItems: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
};

export default function TablePagination({
  id,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const pageCount = getPageCount(totalItems, pageSize);
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Seitennavigation"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e4dc] px-4 py-3 text-sm text-[#4d594a]"
    >
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-page-size`}>Einträge pro Seite</label>
        <select
          id={`${id}-page-size`}
          value={pageSize}
          onChange={(event) =>
            onPageSizeChange(Number(event.target.value) as PageSize)
          }
          className="border border-[#c8cfc2] bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a]"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <p aria-live="polite" className="tabular-nums">
        {firstItem}–{lastItem} von {totalItems}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={buttonClassName}
        >
          Zurück
        </button>
        <span className="tabular-nums">
          Seite {page} von {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={buttonClassName}
        >
          Weiter
        </button>
      </div>
    </nav>
  );
}
