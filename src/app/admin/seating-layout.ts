import type {
  GuestRow,
  HostId,
  SeatSide,
  SeatingTableRow,
} from "../lib/database.types";

export const GRID_COLUMNS = 30;
export const GRID_ROWS = 20;
export const MIN_TABLE_SIZE = 1;
export const MAX_TABLE_SIZE = 20;

export const HOSTS: { id: HostId; name: string }[] = [
  { id: "lisa", name: "Lisa" },
  { id: "roman", name: "Roman" },
];

// Eine Person am Sitzplan ist entweder ein Gast oder Lisa bzw. Roman.
export type ParticipantRef = { guest_id: number | null; host: HostId | null };

export type GridCell = { x: number; y: number };

export type TableGeometry = Pick<
  SeatingTableRow,
  "grid_x" | "grid_y" | "length" | "width"
>;

export type SeatSlot = GridCell & { side: SeatSide; position: number };

export type CellOwner =
  | { kind: "body"; tableId: number }
  | { kind: "seat"; tableId: number; side: SeatSide; position: number };

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function seatKey(tableId: number, side: SeatSide, position: number): string {
  return `${tableId}:${side}:${position}`;
}

export function getSeatCount(table: Pick<TableGeometry, "length" | "width">): number {
  return 2 * table.length + 2 * table.width;
}

// Sitzplätze liegen außen um die Tischfläche. Die Ecken bleiben frei.
export function getSeatSlots(table: TableGeometry): SeatSlot[] {
  const { grid_x: gx, grid_y: gy, length: l, width: w } = table;
  const slots: SeatSlot[] = [];

  for (let p = 0; p < l; p++) {
    slots.push({ side: "top", position: p, x: gx + 1 + p, y: gy });
    slots.push({ side: "bottom", position: p, x: gx + 1 + p, y: gy + w + 1 });
  }
  for (let p = 0; p < w; p++) {
    slots.push({ side: "left", position: p, x: gx, y: gy + 1 + p });
    slots.push({ side: "right", position: p, x: gx + l + 1, y: gy + 1 + p });
  }

  return slots;
}

// Die gesamte Fläche eines Tisches inklusive Sitzplatz-Rand. Entspricht der Box in der DB.
export function getFootprintCells(table: TableGeometry): GridCell[] {
  const cells: GridCell[] = [];
  for (let x = table.grid_x; x <= table.grid_x + table.length + 1; x++) {
    for (let y = table.grid_y; y <= table.grid_y + table.width + 1; y++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function getBodyCells(table: TableGeometry): GridCell[] {
  const cells: GridCell[] = [];
  for (let x = table.grid_x + 1; x <= table.grid_x + table.length; x++) {
    for (let y = table.grid_y + 1; y <= table.grid_y + table.width; y++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function isInsideGrid(table: TableGeometry): boolean {
  return (
    table.grid_x >= 0 &&
    table.grid_y >= 0 &&
    table.grid_x + table.length + 1 < GRID_COLUMNS &&
    table.grid_y + table.width + 1 < GRID_ROWS
  );
}

// Prüft, ob ein Tisch inklusive Rand auf freie Zellen gesetzt werden kann.
export function isFootprintFree(
  candidate: TableGeometry,
  existingTables: TableGeometry[],
): boolean {
  if (!isInsideGrid(candidate)) {
    return false;
  }

  const occupied = new Set<string>();
  for (const table of existingTables) {
    for (const cell of getFootprintCells(table)) {
      occupied.add(cellKey(cell.x, cell.y));
    }
  }

  return getFootprintCells(candidate).every(
    (cell) => !occupied.has(cellKey(cell.x, cell.y)),
  );
}

// Ordnet jeder belegten Zelle (Tischfläche oder Sitzplatz) ihren Tisch zu.
export function buildCellOwners(
  tables: (TableGeometry & { id: number })[],
): Map<string, CellOwner> {
  const owners = new Map<string, CellOwner>();

  for (const table of tables) {
    for (const cell of getBodyCells(table)) {
      owners.set(cellKey(cell.x, cell.y), { kind: "body", tableId: table.id });
    }
    for (const slot of getSeatSlots(table)) {
      owners.set(cellKey(slot.x, slot.y), {
        kind: "seat",
        tableId: table.id,
        side: slot.side,
        position: slot.position,
      });
    }
  }

  return owners;
}

export function getGuestName(guest: Pick<GuestRow, "first_name" | "last_name">): string {
  const name = [guest.first_name, guest.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
  return name || "Unbekannt";
}

export function getGuestInitials(guest: Pick<GuestRow, "first_name" | "last_name">): string {
  const initials = [guest.first_name, guest.last_name]
    .map((part) => part?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase();
  return initials || "?";
}

export function getParticipantKey(ref: ParticipantRef): string {
  return ref.host ? `host:${ref.host}` : `guest:${ref.guest_id}`;
}

// Gibt null zurück, wenn der Schlüssel nicht zu einem bekannten Teilnehmer passt.
export function parseParticipantKey(key: string): ParticipantRef | null {
  const [kind, value] = key.split(":");
  if (kind === "host") {
    const host = HOSTS.find((entry) => entry.id === value);
    return host ? { guest_id: null, host: host.id } : null;
  }
  if (kind === "guest") {
    const guestId = Number(value);
    return Number.isInteger(guestId) && guestId > 0
      ? { guest_id: guestId, host: null }
      : null;
  }
  return null;
}

export function getParticipantName(
  ref: ParticipantRef,
  guestsById: Map<number, GuestRow>,
): string {
  if (ref.host) {
    return HOSTS.find((entry) => entry.id === ref.host)?.name ?? "Unbekannt";
  }
  const guest = ref.guest_id === null ? undefined : guestsById.get(ref.guest_id);
  return guest ? getGuestName(guest) : "Unbekannt";
}

export function getParticipantInitials(
  ref: ParticipantRef,
  guestsById: Map<number, GuestRow>,
): string {
  if (ref.host) {
    return (HOSTS.find((entry) => entry.id === ref.host)?.name.charAt(0) ?? "?").toUpperCase();
  }
  const guest = ref.guest_id === null ? undefined : guestsById.get(ref.guest_id);
  return guest ? getGuestInitials(guest) : "?";
}
