import type { DragEvent, ReactNode } from "react";
import type {
  GuestRow,
  SeatAssignmentRow,
  SeatingTableRow,
} from "../lib/database.types";
import {
  GRID_COLUMNS,
  GRID_ROWS,
  buildCellOwners,
  cellKey,
  getParticipantInitials,
  getParticipantName,
  getTableDragKey,
  parseParticipantKey,
  parseTableDragKey,
  seatKey,
  type CellOwner,
  type GridCell,
  type ParticipantRef,
} from "./seating-layout";

const CELL_SIZE = "2.25rem";

export function getTableLabel(table: SeatingTableRow, index: number): string {
  return table.name?.trim() || `Tisch ${index + 1}`;
}

type SeatingGridProps = {
  tables: SeatingTableRow[];
  assignments: SeatAssignmentRow[];
  guestsById: Map<number, GuestRow>;
  selectedKey: string | null;
  isPlacing: boolean;
  previewCells: Set<string>;
  previewValid: boolean;
  onCellClick: (cell: GridCell) => void;
  onCellHover: (cell: GridCell | null) => void;
  onSeatClick: (tableId: number, side: SeatAssignmentRow["side"], position: number) => void;
  onRemoveSeat: (tableId: number, side: SeatAssignmentRow["side"], position: number) => void;
  onDropParticipant: (
    participantKey: string,
    tableId: number,
    side: SeatAssignmentRow["side"],
    position: number,
  ) => void;
  onMoveTable: (tableId: number, gridX: number, gridY: number) => void;
  busy: boolean;
};

export default function SeatingGrid({
  tables,
  assignments,
  guestsById,
  selectedKey,
  isPlacing,
  previewCells,
  previewValid,
  onCellClick,
  onCellHover,
  onSeatClick,
  onRemoveSeat,
  onDropParticipant,
  onMoveTable,
  busy,
}: SeatingGridProps) {
  const owners = buildCellOwners(tables);
  const labelCells = new Map<string, { short: string }>();
  const tableLabels = new Map<number, string>();
  const tablesById = new Map<number, SeatingTableRow>();
  tables.forEach((table, index) => {
    labelCells.set(cellKey(table.grid_x + 1, table.grid_y + 1), {
      short: String(index + 1),
    });
    tableLabels.set(table.id, getTableLabel(table, index));
    tablesById.set(table.id, table);
  });

  // Ein Tisch wird am Körperfeld gegriffen. Das Ziel ist die Zelle, auf die gezogen wird, minus diesen Versatz.
  function handleDrop(payload: string, cell: GridCell, owner: CellOwner | undefined) {
    const tableDrag = parseTableDragKey(payload);
    if (tableDrag) {
      onMoveTable(tableDrag.tableId, cell.x - tableDrag.offsetX, cell.y - tableDrag.offsetY);
      return;
    }
    if (owner?.kind === "seat" && parseParticipantKey(payload)) {
      onDropParticipant(payload, owner.tableId, owner.side, owner.position);
    }
  }

  function getDropProps(cell: GridCell, owner: CellOwner | undefined) {
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        handleDrop(event.dataTransfer.getData("text/plain"), cell, owner);
      },
    };
  }

  const seatedBySeat = new Map<string, ParticipantRef>();
  for (const assignment of assignments) {
    seatedBySeat.set(
      seatKey(assignment.table_id, assignment.side, assignment.position),
      { guest_id: assignment.guest_id, host: assignment.host },
    );
  }

  const cells: ReactNode[] = [];

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLUMNS; x++) {
      const key = cellKey(x, y);
      const cell = { x, y };
      const owner = owners.get(key);

      if (isPlacing) {
        const isPreview = previewCells.has(key);
        cells.push(
          <button
            key={key}
            type="button"
            aria-label={`Zelle ${x + 1}, ${y + 1} als Tisch-Startpunkt wählen`}
            disabled={busy}
            onClick={() => onCellClick(cell)}
            onMouseEnter={() => onCellHover(cell)}
            onMouseLeave={() => onCellHover(null)}
            onFocus={() => onCellHover(cell)}
            onBlur={() => onCellHover(null)}
            className={`border border-[#e4e9e0] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#596656] ${
              isPreview
                ? previewValid
                  ? "bg-[#7f9a78]/60"
                  : "bg-[#b5524a]/50"
                : owners.has(key)
                  ? "bg-[#eef2ea]"
                  : "bg-white hover:bg-[#f6f8f4]"
            }`}
          />,
        );
        continue;
      }

      if (owner?.kind === "seat") {
        const seatedBy = seatedBySeat.get(seatKey(owner.tableId, owner.side, owner.position));
        const tableLabel = tableLabels.get(owner.tableId) ?? "Tisch";

        if (seatedBy) {
          const name = getParticipantName(seatedBy, guestsById);
          cells.push(
            <div key={key} {...getDropProps(cell, owner)} className="flex items-center justify-center border border-transparent">
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemoveSeat(owner.tableId, owner.side, owner.position)}
                title={`${name} entfernen`}
                aria-label={`${name} vom Platz entfernen`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#596656] text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-[#b5524a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#596656] disabled:opacity-60"
              >
                {getParticipantInitials(seatedBy, guestsById)}
              </button>
            </div>,
          );
        } else {
          cells.push(
            <div key={key} {...getDropProps(cell, owner)} className="flex items-center justify-center border border-transparent">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSeatClick(owner.tableId, owner.side, owner.position)}
                title={tableLabel}
                aria-label={
                  selectedKey !== null
                    ? `Freien Platz an ${tableLabel} belegen`
                    : `Freier Sitzplatz an ${tableLabel}`
                }
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-dashed text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#596656] disabled:opacity-60 ${
                  selectedKey !== null
                    ? "border-[#596656] bg-white text-[#596656] hover:bg-[#eef2ea]"
                    : "border-[#aab5a3] bg-white text-[#aab5a3]"
                }`}
              >
                +
              </button>
            </div>,
          );
        }
        continue;
      }

      if (owner?.kind === "body") {
        const label = labelCells.get(key);
        const table = tablesById.get(owner.tableId);
        cells.push(
          <div
            key={key}
            {...getDropProps(cell, owner)}
            draggable={!busy && table !== undefined}
            onDragStart={(event) => {
              if (!table) {
                return;
              }
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(
                "text/plain",
                getTableDragKey(table.id, x - table.grid_x, y - table.grid_y),
              );
            }}
            title={`${tableLabels.get(owner.tableId) ?? "Tisch"} verschieben`}
            className="flex cursor-grab items-start justify-start border border-[#aab5a3] bg-[#eef2ea] p-0.5 text-[10px] font-semibold leading-none text-[#4d594a] active:cursor-grabbing"
          >
            {label?.short ?? null}
          </div>,
        );
        continue;
      }

      cells.push(<div key={key} {...getDropProps(cell, owner)} className="border border-[#f0f3ed]" />);
    }
  }

  return (
    <div className="overflow-x-auto border border-[#aab5a3] bg-white p-2">
      <div
        role="group"
        aria-label="Sitzplan-Raster"
        className="grid w-max"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, ${CELL_SIZE})`,
          gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE})`,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
