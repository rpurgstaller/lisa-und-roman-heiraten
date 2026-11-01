"use client";

import type { DragEvent } from "react";
import { useMemo, useState } from "react";
import type { GuestRow } from "../lib/database.types";
import {
  HOSTS,
  getGuestName,
  getParticipantKey,
} from "./seating-layout";

type ParticipantFilter = "all" | "assigned" | "open";

const filterOptions: { value: ParticipantFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "assigned", label: "Zugeordnet" },
  { value: "open", label: "Offen" },
];

type ListEntry = { key: string; name: string };

const hostEntries: ListEntry[] = HOSTS.map((host) => ({
  key: getParticipantKey({ guest_id: null, host: host.id }),
  name: host.name,
}));

type SeatingGuestListProps = {
  guests: GuestRow[];
  seatedKeys: Set<string>;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
};

function matchesFilter(filter: ParticipantFilter, isSeated: boolean): boolean {
  return filter === "all" || isSeated === (filter === "assigned");
}

export default function SeatingGuestList({
  guests,
  seatedKeys,
  selectedKey,
  onSelectKey,
}: SeatingGuestListProps) {
  const [filter, setFilter] = useState<ParticipantFilter>("all");

  const visibleHosts = useMemo(
    () => hostEntries.filter((entry) => matchesFilter(filter, seatedKeys.has(entry.key))),
    [filter, seatedKeys],
  );

  const visibleGuests = useMemo(() => {
    return [...guests]
      .sort((a, b) => getGuestName(a).localeCompare(getGuestName(b), "de"))
      .map((guest): ListEntry => ({
        key: getParticipantKey({ guest_id: guest.id, host: null }),
        name: getGuestName(guest),
      }))
      .filter((entry) => matchesFilter(filter, seatedKeys.has(entry.key)));
  }, [guests, seatedKeys, filter]);

  function handleDragStart(event: DragEvent<HTMLLIElement>, key: string) {
    event.dataTransfer.setData("text/plain", key);
    event.dataTransfer.effectAllowed = "move";
    onSelectKey(key);
  }

  function renderList(entries: ListEntry[]) {
    return (
      <ul className="max-h-[32rem] divide-y divide-[#dfe5da] overflow-y-auto border border-[#aab5a3] bg-white">
        {entries.map((entry) => {
          const isSeated = seatedKeys.has(entry.key);
          const isSelected = selectedKey === entry.key;
          return (
            <li
              key={entry.key}
              draggable={!isSeated}
              onDragStart={(event) => handleDragStart(event, entry.key)}
              onDragEnd={() => onSelectKey(null)}
              className={`${isSeated ? "text-[#aab5a3]" : "cursor-grab text-[#4d594a]"} ${
                isSelected ? "bg-[#eef2ea]" : ""
              }`}
            >
              <button
                type="button"
                disabled={isSeated}
                aria-pressed={isSelected}
                onClick={() => onSelectKey(isSelected ? null : entry.key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#596656]/50 disabled:cursor-default"
              >
                <span className={isSeated ? "line-through" : ""}>{entry.name}</span>
                {isSeated ? <span className="text-xs">zugeordnet</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-label="Personen für die Sitzordnung" className="space-y-4">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Personen filtern">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`border px-2 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#596656]/50 ${
              filter === option.value
                ? "border-[#596656] bg-[#596656] text-white"
                : "border-[#aab5a3] bg-white text-[#4d594a] hover:bg-[#eef2ea]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleHosts.length > 0 ? (
        <div className="space-y-2">
          <h2 id="seating-host-list-heading" className="text-base font-semibold text-[#4d594a]">
            Brautpaar ({hostEntries.length})
          </h2>
          {renderList(visibleHosts)}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 id="seating-guest-list-heading" className="text-base font-semibold text-[#4d594a]">
          Gäste ({guests.length})
        </h2>
        {visibleGuests.length === 0 ? (
          <p className="text-sm text-[#596656]">Keine Gäste in dieser Ansicht.</p>
        ) : (
          renderList(visibleGuests)
        )}
      </div>
    </section>
  );
}
