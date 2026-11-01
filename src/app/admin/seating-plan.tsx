"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import type {
  GuestRow,
  SeatAssignmentRow,
  SeatSide,
  SeatingPlanRow,
  SeatingTableRow,
} from "../lib/database.types";
import SeatingGrid, { getTableLabel } from "./seating-grid";
import SeatingGuestList from "./seating-guest-list";
import {
  HOSTS,
  MAX_TABLE_SIZE,
  MIN_TABLE_SIZE,
  cellKey,
  getFootprintCells,
  getParticipantKey,
  getSeatCount,
  isFootprintFree,
  parseParticipantKey,
  type GridCell,
} from "./seating-layout";

type QueryError = { code?: string; message?: string } | null;

type Message = { type: "success" | "error" | "info"; text: string } | null;

type PlanDetails = {
  planId: number;
  tables: SeatingTableRow[];
  assignments: SeatAssignmentRow[];
};

type PlanFormState = { mode: "create" } | { mode: "edit"; plan: SeatingPlanRow };

type TableDraft = { name: string; length: string; width: string };

type TableEdit = { tableId: number; length: string; width: string };

type Placement = { name: string | null; length: number; width: number };

const emptyTableDraft: TableDraft = { name: "", length: "", width: "" };

const inputClassName =
  "mt-1 w-full border border-[#aab5a3] bg-white px-3 py-2 text-sm font-normal text-[#4d594a] outline-none focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25";

const buttonClassName =
  "border border-[#596656] bg-white px-3 py-2 text-sm font-semibold text-[#4d594a] transition-colors hover:bg-[#eef2ea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#596656]/50 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "border border-[#596656] bg-[#596656] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d594a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#596656]/50 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClassName =
  "border border-[#b5524a] bg-white px-3 py-2 text-sm font-semibold text-[#b5524a] transition-colors hover:bg-[#fbeeed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b5524a]/50 disabled:cursor-not-allowed disabled:opacity-60";

function parseSize(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const size = Number(trimmed);
  return size >= MIN_TABLE_SIZE && size <= MAX_TABLE_SIZE ? size : null;
}

function getErrorMessage(error: QueryError): string {
  switch (error?.code) {
    case "23P01":
      return "Der Tisch würde sich mit einem anderen Tisch überschneiden.";
    case "23505":
      return "Dieser Platz ist bereits belegt. Die Ansicht wurde aktualisiert.";
    case "P0001":
      return "Dieser Gast kann an diesem Platz nicht gesetzt werden.";
    case "P0003":
      return "Auf Plätzen, die dann wegfallen würden, sitzen noch Personen. Entferne sie zuerst aus dem Raster.";
    default:
      return "Das hat leider nicht geklappt. Bitte versuche es erneut.";
  }
}

async function fetchPlanDetails(
  planId: number,
): Promise<{ details: PlanDetails | null; error: QueryError }> {
  const supabase = getSupabaseBrowserClient();
  const [tablesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("seating_table")
      .select("*")
      .eq("plan_id", planId)
      .order("id", { ascending: true })
      .returns<SeatingTableRow[]>(),
    supabase
      .from("seat_assignment")
      .select("*")
      .eq("plan_id", planId)
      .returns<SeatAssignmentRow[]>(),
  ]);

  const error = tablesResult.error ?? assignmentsResult.error;
  if (error) {
    return { details: null, error };
  }

  return {
    details: {
      planId,
      tables: tablesResult.data ?? [],
      assignments: assignmentsResult.data ?? [],
    },
    error: null,
  };
}

type PlanFormProps = {
  initial: SeatingPlanRow | null;
  busy: boolean;
  onSave: (values: { name: string; note: string | null }) => void;
  onCancel: () => void;
};

function PlanForm({ initial, busy, onSave, onCancel }: PlanFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedNote = note.trim();

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      setNameError("Bitte gib einen Namen mit 1 bis 100 Zeichen ein.");
      return;
    }
    if (trimmedNote.length > 1000) {
      setNoteError("Die Notiz darf höchstens 1000 Zeichen lang sein.");
      return;
    }

    setNameError(null);
    setNoteError(null);
    onSave({ name: trimmedName, note: trimmedNote || null });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-3 border border-[#dfe5da] bg-[#f6f8f4] p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="seating-plan-name" className="text-xs font-semibold text-[#596656]">
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="seating-plan-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "seating-plan-name-error" : undefined}
          className={inputClassName}
        />
        {nameError ? (
          <p id="seating-plan-name-error" className="mt-1 text-xs text-[#b5524a]">
            {nameError}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="seating-plan-note" className="text-xs font-semibold text-[#596656]">
          Notiz
        </label>
        <input
          id="seating-plan-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "seating-plan-note-error" : undefined}
          className={inputClassName}
        />
        {noteError ? (
          <p id="seating-plan-note-error" className="mt-1 text-xs text-[#b5524a]">
            {noteError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          {busy ? "Wird gespeichert …" : "Speichern"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClassName}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

export default function SeatingPlan() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [plans, setPlans] = useState<SeatingPlanRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [details, setDetails] = useState<PlanDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [planForm, setPlanForm] = useState<PlanFormState | null>(null);
  const [tableDraft, setTableDraft] = useState<TableDraft>(emptyTableDraft);
  const [tableEdit, setTableEdit] = useState<TableEdit | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [hoverCell, setHoverCell] = useState<GridCell | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  // Details gelten nur für den gerade gewählten Plan. Veraltete Daten werden so nie angezeigt.
  const planDetails = details !== null && details.planId === selectedPlanId ? details : null;
  const tables = planDetails?.tables ?? [];
  const assignments = planDetails?.assignments ?? [];
  const seatedKeys = new Set(
    assignments.map((assignment) =>
      getParticipantKey({ guest_id: assignment.guest_id, host: assignment.host }),
    ),
  );
  const guestsById = new Map(
    guests.map((guest): [number, GuestRow] => [guest.id, guest]),
  );

  const draftLength = parseSize(tableDraft.length);
  const draftWidth = parseSize(tableDraft.width);

  const candidate =
    placement && hoverCell
      ? { grid_x: hoverCell.x, grid_y: hoverCell.y, length: placement.length, width: placement.width }
      : null;
  const previewCells = new Set(
    candidate ? getFootprintCells(candidate).map((cell) => cellKey(cell.x, cell.y)) : [],
  );
  const previewValid = candidate !== null && isFootprintFree(candidate, tables);

  useEffect(() => {
    let ignore = false;
    const supabase = getSupabaseBrowserClient();

    void Promise.all([
      supabase.from("guest").select("*").eq("attending", true).returns<GuestRow[]>(),
      supabase
        .from("seating_plan")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .returns<SeatingPlanRow[]>(),
    ]).then(([guestResult, planResult]) => {
      if (ignore) {
        return;
      }
      if (guestResult.error || planResult.error) {
        setMessage({ type: "error", text: "Die Sitzordnung konnte nicht geladen werden." });
        setIsLoading(false);
        return;
      }

      const loadedPlans = planResult.data ?? [];
      setGuests(guestResult.data ?? []);
      setPlans(loadedPlans);
      setSelectedPlanId((current) =>
        current !== null && loadedPlans.some((plan) => plan.id === current)
          ? current
          : (loadedPlans[0]?.id ?? null),
      );
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (selectedPlanId === null) {
      return;
    }

    let ignore = false;
    void fetchPlanDetails(selectedPlanId).then(({ details: loaded, error }) => {
      if (ignore) {
        return;
      }
      if (error || !loaded) {
        setMessage({ type: "error", text: "Der Sitzplan konnte nicht geladen werden." });
        return;
      }
      setDetails(loaded);
    });

    return () => {
      ignore = true;
    };
  }, [selectedPlanId]);

  async function refreshDetails(planId: number) {
    const { details: loaded, error } = await fetchPlanDetails(planId);
    if (error || !loaded) {
      setMessage({ type: "error", text: "Der Sitzplan konnte nicht aktualisiert werden." });
      return;
    }
    setDetails(loaded);
  }

  function selectPlan(planId: number | null) {
    setSelectedPlanId(planId);
    setSelectedKey(null);
    setTableEdit(null);
    setPlacement(null);
    setHoverCell(null);
    setPlanForm(null);
    setMessage(null);
  }

  async function savePlan(values: { name: string; note: string | null }) {
    if (!planForm) {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    setBusy(true);
    setMessage(null);

    try {
      if (planForm.mode === "create") {
        const { data, error } = await supabase
          .from("seating_plan")
          .insert({ name: values.name, note: values.note })
          .select("*")
          .returns<SeatingPlanRow[]>();
        const created = data?.[0];
        if (error || !created) {
          setMessage({ type: "error", text: getErrorMessage(error) });
          return;
        }
        setPlans((previous) => [...previous, created]);
        selectPlan(created.id);
        setMessage({ type: "success", text: `Sitzplan „${created.name}“ wurde angelegt.` });
        return;
      }

      const { data, error } = await supabase
        .from("seating_plan")
        .update({ name: values.name, note: values.note })
        .eq("id", planForm.plan.id)
        .select("*")
        .returns<SeatingPlanRow[]>();
      const updated = data?.[0];
      if (error || !updated) {
        setMessage({ type: "error", text: getErrorMessage(error) });
        return;
      }
      setPlans((previous) => previous.map((plan) => (plan.id === updated.id ? updated : plan)));
      setPlanForm(null);
      setMessage({ type: "success", text: "Sitzplan wurde gespeichert." });
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(plan: SeatingPlanRow) {
    if (
      !window.confirm(
        `Sitzplan „${plan.name}“ wirklich löschen? Er wird nur ausgeblendet und bleibt in der Datenbank erhalten.`,
      )
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("seating_plan")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
        return;
      }
      const remaining = plans.filter((existing) => existing.id !== plan.id);
      setPlans(remaining);
      selectPlan(remaining[0]?.id ?? null);
      setMessage({ type: "success", text: `Sitzplan „${plan.name}“ wurde gelöscht.` });
    } finally {
      setBusy(false);
    }
  }

  function startPlacement() {
    if (draftLength === null || draftWidth === null) {
      setMessage({
        type: "error",
        text: `Länge und Breite müssen ganze Zahlen von ${MIN_TABLE_SIZE} bis ${MAX_TABLE_SIZE} sein.`,
      });
      return;
    }
    const name = tableDraft.name.trim();
    if (name.length > 100) {
      setMessage({ type: "error", text: "Der Tischname darf höchstens 100 Zeichen lang sein." });
      return;
    }

    setPlacement({ name: name || null, length: draftLength, width: draftWidth });
    setMessage({
      type: "info",
      text: "Klicke im Raster auf die obere linke Ecke des Tisches, um ihn zu platzieren.",
    });
  }

  function cancelPlacement() {
    setPlacement(null);
    setHoverCell(null);
    setMessage(null);
  }

  async function placeTable(cell: GridCell) {
    if (!placement || !planDetails || selectedPlanId === null || busy) {
      return;
    }

    const footprint = {
      grid_x: cell.x,
      grid_y: cell.y,
      length: placement.length,
      width: placement.width,
    };
    if (!isFootprintFree(footprint, planDetails.tables)) {
      setMessage({
        type: "error",
        text: "Hier passt der Tisch nicht hin. Wähle eine Stelle, an der Tisch und Sitzplätze frei sind.",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const planId = selectedPlanId;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("seating_table").insert({
        plan_id: planId,
        name: placement.name,
        ...footprint,
      });
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
        await refreshDetails(planId);
        return;
      }
      setPlacement(null);
      setHoverCell(null);
      setTableDraft((previous) => ({ ...previous, name: "" }));
      await refreshDetails(planId);
      setMessage({ type: "success", text: "Tisch wurde platziert." });
    } finally {
      setBusy(false);
    }
  }

  function startEditTable(table: SeatingTableRow) {
    setTableEdit({ tableId: table.id, length: String(table.length), width: String(table.width) });
    setMessage(null);
  }

  function cancelEditTable() {
    setTableEdit(null);
  }

  async function saveTableEdit(table: SeatingTableRow, index: number) {
    if (!tableEdit || selectedPlanId === null || busy) {
      return;
    }

    const length = parseSize(tableEdit.length);
    const width = parseSize(tableEdit.width);
    if (length === null || width === null) {
      setMessage({
        type: "error",
        text: `Länge und Breite müssen ganze Zahlen von ${MIN_TABLE_SIZE} bis ${MAX_TABLE_SIZE} sein.`,
      });
      return;
    }
    if (length === table.length && width === table.width) {
      setTableEdit(null);
      return;
    }

    const resized = { grid_x: table.grid_x, grid_y: table.grid_y, length, width };
    const otherTables = tables.filter((other) => other.id !== table.id);
    if (!isFootprintFree(resized, otherTables)) {
      setMessage({
        type: "error",
        text: "Mit dieser Größe würde der Tisch andere Tische überschneiden oder aus dem Raster ragen.",
      });
      return;
    }

    const wouldLoseSeat = assignments.some(
      (assignment) =>
        assignment.table_id === table.id &&
        ((assignment.side === "top" || assignment.side === "bottom")
          ? assignment.position >= length
          : assignment.position >= width),
    );
    if (wouldLoseSeat) {
      setMessage({
        type: "error",
        text: "Auf Plätzen, die dann wegfallen würden, sitzen noch Personen. Entferne sie zuerst aus dem Raster.",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const planId = selectedPlanId;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("seating_table")
        .update({ length, width })
        .eq("id", table.id);
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
        await refreshDetails(planId);
        return;
      }
      setTableEdit(null);
      await refreshDetails(planId);
      setMessage({ type: "success", text: `„${getTableLabel(table, index)}“ wurde angepasst.` });
    } finally {
      setBusy(false);
    }
  }

  async function deleteTable(table: SeatingTableRow, index: number) {
    const seatedCount = assignments.filter((assignment) => assignment.table_id === table.id).length;
    const label = getTableLabel(table, index);
    const question =
      seatedCount > 0
        ? `„${label}“ wirklich löschen? ${seatedCount} zugeordnete Gäste werden davon entfernt.`
        : `„${label}“ wirklich löschen?`;
    if (!window.confirm(question) || selectedPlanId === null) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const planId = selectedPlanId;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("seating_table").delete().eq("id", table.id);
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
        return;
      }
      await refreshDetails(planId);
      setMessage({ type: "success", text: `„${label}“ wurde gelöscht.` });
    } finally {
      setBusy(false);
    }
  }

  async function seatParticipant(
    participantKey: string,
    tableId: number,
    side: SeatSide,
    position: number,
  ) {
    const participant = parseParticipantKey(participantKey);
    if (!participant || !planDetails || selectedPlanId === null || busy) {
      return;
    }
    if (seatedKeys.has(participantKey)) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const planId = selectedPlanId;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("seat_assignment").insert({
        plan_id: planId,
        guest_id: participant.guest_id,
        host: participant.host,
        table_id: tableId,
        side,
        position,
      });
      setSelectedKey(null);
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
      }
      await refreshDetails(planId);
    } finally {
      setBusy(false);
    }
  }

  function handleSeatClick(tableId: number, side: SeatSide, position: number) {
    if (selectedKey === null) {
      setMessage({ type: "info", text: "Wähle zuerst eine Person aus der Liste aus." });
      return;
    }
    void seatParticipant(selectedKey, tableId, side, position);
  }

  async function removeSeat(tableId: number, side: SeatSide, position: number) {
    if (selectedPlanId === null || busy) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const planId = selectedPlanId;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("seat_assignment")
        .delete()
        .eq("plan_id", planId)
        .eq("table_id", tableId)
        .eq("side", side)
        .eq("position", position);
      if (error) {
        setMessage({ type: "error", text: getErrorMessage(error) });
      }
      await refreshDetails(planId);
    } finally {
      setBusy(false);
    }
  }

  const seatedCount = seatedKeys.size;
  // Lisa und Roman zählen zusätzlich zu den zugesagten Gästen.
  const participantCount = guests.length + HOSTS.length;

  return (
    <div className="space-y-8">
      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-[#b5524a] bg-[#fbeeed] text-[#8a3b35]"
              : message.type === "success"
                ? "border-[#7f9a78] bg-[#eef4ea] text-[#4d594a]"
                : "border-[#aab5a3] bg-white text-[#4d594a]"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section
        aria-labelledby="seating-plan-heading"
        className="space-y-4 border border-[#aab5a3] bg-white p-4"
      >
        <h2 id="seating-plan-heading" className="text-base font-semibold text-[#4d594a]">
          Sitzplan
        </h2>

        {isLoading ? (
          <p className="text-sm text-[#596656]">Sitzordnung wird geladen …</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              {plans.length > 0 ? (
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor="seating-plan-select" className="text-xs font-semibold text-[#596656]">
                    Aktiver Sitzplan
                  </label>
                  <select
                    id="seating-plan-select"
                    value={selectedPlanId ?? ""}
                    onChange={(event) => selectPlan(Number(event.target.value))}
                    disabled={busy}
                    className={inputClassName}
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setPlanForm({ mode: "create" })}
                disabled={busy || planForm !== null}
                className={buttonClassName}
              >
                Neuer Sitzplan
              </button>
              {selectedPlan ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ mode: "edit", plan: selectedPlan })}
                    disabled={busy || planForm !== null}
                    className={buttonClassName}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePlan(selectedPlan)}
                    disabled={busy}
                    className={dangerButtonClassName}
                  >
                    Löschen
                  </button>
                </>
              ) : null}
            </div>

            {selectedPlan?.note ? (
              <p className="text-sm text-[#596656]">{selectedPlan.note}</p>
            ) : null}

            {planForm ? (
              <PlanForm
                key={planForm.mode === "create" ? "new-plan" : planForm.plan.id}
                initial={planForm.mode === "edit" ? planForm.plan : null}
                busy={busy}
                onSave={(values) => void savePlan(values)}
                onCancel={() => setPlanForm(null)}
              />
            ) : null}

            {plans.length === 0 ? (
              <p className="text-sm text-[#596656]">
                Noch kein Sitzplan vorhanden. Lege oben einen neuen Sitzplan an.
              </p>
            ) : null}
          </>
        )}
      </section>

      {selectedPlan && planDetails ? (
        <>
          <section
            aria-labelledby="seating-tables-heading"
            className="space-y-4 border border-[#aab5a3] bg-white p-4"
          >
            <h2 id="seating-tables-heading" className="text-base font-semibold text-[#4d594a]">
              Tische
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                startPlacement();
              }}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
            >
              <div>
                <label htmlFor="table-name" className="text-xs font-semibold text-[#596656]">
                  Name (optional)
                </label>
                <input
                  id="table-name"
                  value={tableDraft.name}
                  onChange={(event) => setTableDraft({ ...tableDraft, name: event.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="table-length" className="text-xs font-semibold text-[#596656]">
                  Länge
                </label>
                <input
                  id="table-length"
                  type="number"
                  inputMode="numeric"
                  min={MIN_TABLE_SIZE}
                  max={MAX_TABLE_SIZE}
                  value={tableDraft.length}
                  onChange={(event) => setTableDraft({ ...tableDraft, length: event.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="table-width" className="text-xs font-semibold text-[#596656]">
                  Breite
                </label>
                <input
                  id="table-width"
                  type="number"
                  inputMode="numeric"
                  min={MIN_TABLE_SIZE}
                  max={MAX_TABLE_SIZE}
                  value={tableDraft.width}
                  onChange={(event) => setTableDraft({ ...tableDraft, width: event.target.value })}
                  className={inputClassName}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy || placement !== null} className={primaryButtonClassName}>
                  Tisch platzieren
                </button>
                {placement ? (
                  <button type="button" onClick={cancelPlacement} className={buttonClassName}>
                    Abbrechen
                  </button>
                ) : null}
              </div>
            </form>

            <p className="text-xs text-[#596656]">
              {draftLength !== null && draftWidth !== null
                ? `Dieser Tisch hat ${getSeatCount({ length: draftLength, width: draftWidth })} Sitzplätze.`
                : `Länge und Breite: ganze Zahlen von ${MIN_TABLE_SIZE} bis ${MAX_TABLE_SIZE}.`}
            </p>

            {tables.length === 0 ? (
              <p className="text-sm text-[#596656]">Noch keine Tische in diesem Sitzplan.</p>
            ) : (
              <ul className="divide-y divide-[#dfe5da] border border-[#aab5a3]">
                {tables.map((table, index) => {
                  const editing = tableEdit?.tableId === table.id ? tableEdit : null;

                  if (editing) {
                    const editLength = parseSize(editing.length);
                    const editWidth = parseSize(editing.width);
                    return (
                      <li key={table.id} className="space-y-3 px-3 py-3 text-sm text-[#4d594a]">
                        <p className="font-semibold">{getTableLabel(table, index)} bearbeiten</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`edit-length-${table.id}`} className="text-xs font-semibold text-[#596656]">
                              Länge
                            </label>
                            <input
                              id={`edit-length-${table.id}`}
                              type="number"
                              inputMode="numeric"
                              min={MIN_TABLE_SIZE}
                              max={MAX_TABLE_SIZE}
                              value={editing.length}
                              onChange={(event) => setTableEdit({ ...editing, length: event.target.value })}
                              className={inputClassName}
                            />
                          </div>
                          <div>
                            <label htmlFor={`edit-width-${table.id}`} className="text-xs font-semibold text-[#596656]">
                              Breite
                            </label>
                            <input
                              id={`edit-width-${table.id}`}
                              type="number"
                              inputMode="numeric"
                              min={MIN_TABLE_SIZE}
                              max={MAX_TABLE_SIZE}
                              value={editing.width}
                              onChange={(event) => setTableEdit({ ...editing, width: event.target.value })}
                              className={inputClassName}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#596656]">
                          {editLength !== null && editWidth !== null
                            ? `Dann hat dieser Tisch ${getSeatCount({ length: editLength, width: editWidth })} Sitzplätze.`
                            : `Länge und Breite: ganze Zahlen von ${MIN_TABLE_SIZE} bis ${MAX_TABLE_SIZE}.`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void saveTableEdit(table, index)}
                            disabled={busy}
                            className={primaryButtonClassName}
                          >
                            Speichern
                          </button>
                          <button type="button" onClick={cancelEditTable} disabled={busy} className={buttonClassName}>
                            Abbrechen
                          </button>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={table.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-[#4d594a]">
                      <span>
                        <span className="font-semibold">{getTableLabel(table, index)}</span>{" "}
                        <span className="text-[#596656]">
                          {table.length} × {table.width} · {getSeatCount(table)} Plätze
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-3">
                        <button
                          type="button"
                          onClick={() => startEditTable(table)}
                          disabled={busy || placement !== null}
                          className="text-xs font-semibold text-[#4d594a] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4d594a]/50 disabled:opacity-60"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTable(table, index)}
                          disabled={busy}
                          className="text-xs font-semibold text-[#b5524a] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b5524a]/50 disabled:opacity-60"
                        >
                          Löschen
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="seating-arrangement-heading" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="seating-arrangement-heading" className="text-base font-semibold text-[#4d594a]">
                Raster
              </h2>
              <p className="text-sm text-[#596656]">
                Zugeordnet: {seatedCount} von {participantCount}
              </p>
            </div>
            <p className="text-xs text-[#596656]">
                Person aus der Liste auswählen oder ziehen und dann auf einen freien Platz setzen. Ein belegter Platz entfernt die Person wieder.
            </p>
            <div className="grid gap-6 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)] lg:items-start">
              <SeatingGuestList
                guests={guests}
                  seatedKeys={seatedKeys}
                  selectedKey={selectedKey}
                  onSelectKey={setSelectedKey}
              />
              <SeatingGrid
                tables={tables}
                assignments={assignments}
                guestsById={guestsById}
                  selectedKey={selectedKey}
                isPlacing={placement !== null}
                previewCells={previewCells}
                previewValid={previewValid}
                onCellClick={(cell) => void placeTable(cell)}
                onCellHover={setHoverCell}
                onSeatClick={handleSeatClick}
                  onRemoveSeat={(tableId, side, position) => void removeSeat(tableId, side, position)}
                  onDropParticipant={(participantKey, tableId, side, position) =>
                    void seatParticipant(participantKey, tableId, side, position)
                }
                busy={busy}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
