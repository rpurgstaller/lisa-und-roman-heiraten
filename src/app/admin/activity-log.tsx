"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import type { ResponseLogRow } from "../lib/database.types";
import ActivityHeatmap, { formatDayLabel, toDayKey } from "./activity-heatmap";
import TablePagination, {
  getPageCount,
  getPageItems,
  type PageSize,
} from "./pagination";

const actorLabels: Record<ResponseLogRow["changed_by"], string> = {
  admin: "Admin",
  guest: "Gast",
};

export default function ActivityLog() {
  const supabase = getSupabaseBrowserClient();
  const [entries, setEntries] = useState<ResponseLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  function selectDate(date: Date | null) {
    setSelectedDate(date);
    setPage(1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadEntries() {
      const { data, error } = await supabase
        .from("response_log")
        .select("id, changed_at, changed_by, change")
        .order("changed_at", { ascending: false })
        .order("id", { ascending: false })
        .returns<ResponseLogRow[]>();

      if (!mounted) {
        return;
      }

      if (error) {
        setErrorMessage("Die Aktivitäten konnten nicht geladen werden.");
      } else {
        setEntries(data ?? []);
      }

      setLoading(false);
    }

    void loadEntries();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return <p className="mt-10 text-[#657061]">Aktivitäten werden geladen …</p>;
  }

  if (errorMessage) {
    return (
      <p role="alert" className="mt-10 text-sm font-medium leading-6 text-[#9b3e32]">
        {errorMessage}
      </p>
    );
  }

  const visibleEntries = selectedDate
    ? entries.filter(
        (entry) =>
          toDayKey(new Date(entry.changed_at)) === toDayKey(selectedDate)
      )
    : entries;
  const pageCount = getPageCount(visibleEntries.length, pageSize);
  const currentPage = Math.min(page, pageCount);
  const pagedEntries = getPageItems(visibleEntries, currentPage, pageSize);

  return (
    <div className="mt-10 space-y-6">
      <ActivityHeatmap
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
      />

      {selectedDate && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#394438]">
          <p>
            Gefiltert auf {formatDayLabel(selectedDate)}:{" "}
            {visibleEntries.length}{" "}
            {visibleEntries.length === 1 ? "Eintrag" : "Einträge"}
          </p>
          <button
            type="button"
            onClick={() => selectDate(null)}
            className="border border-[#74816f] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#4d594a] hover:bg-[#4d594a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a]"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-[#657061]">Noch keine Änderungen protokolliert.</p>
      )}

      {entries.length > 0 && visibleEntries.length === 0 && (
        <p className="text-[#657061]">
          An diesem Tag wurden keine Änderungen protokolliert.
        </p>
      )}

      {visibleEntries.length > 0 && (
        <div className="overflow-x-auto border border-[#c8cfc2] bg-white/60">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#c8cfc2] text-xs uppercase tracking-[0.12em] text-[#7b876f]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Zeitpunkt
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Geändert von
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Änderung
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-[#e4e0d6] last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {new Date(entry.changed_at).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-3">{actorLabels[entry.changed_by]}</td>
                  <td className="px-4 py-3 break-words">{entry.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visibleEntries.length > 0 && (
        <TablePagination
          id="activity"
          totalItems={visibleEntries.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
