"use client";

import { FormEvent, SetStateAction, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import BarChart from "./bar-chart";
import ActivityLog from "./activity-log";
import PostcardPrint from "./postcard-print";
import SeatingPlan from "./seating-plan";
import TablePagination, {
  getPageCount,
  getPageItems,
  type PageSize,
} from "./pagination";
import { SignInForm } from "../sign-in-form";
import { dietaryRestrictionOptions } from "../lib/dietary-restrictions";
import type {
  DietaryRestriction,
  GuestFrom,
  GuestRow,
  GuestType,
  InvitationAddress,
  InvitationCategory,
  InvitationRow,
} from "../lib/database.types";

type GuestWithInvitation = GuestRow & {
  invitation: Pick<InvitationRow, "code"> | null;
  companionName?: string | null;
};

type SortDirection = "asc" | "desc";
type GuestSortColumn =
  | "firstName"
  | "lastName"
  | "guestType"
  | "email"
  | "attending"
  | "dietary"
  | "additionalDietary"
  | "companion"
  | "code";
type InvitationSortColumn =
  | "code"
  | "firstNames"
  | "created"
  | "invitationSent"
  | "saveTheDateSent"
  | "guestFrom"
  | "category"
  | "street"
  | "postalCode"
  | "city"
  | "country";
type BooleanFilter = "all" | "yes" | "no";
type OptionalFilter<T extends string> = "all" | "none" | T;
type InvitationUpdate = Partial<
  Pick<
    InvitationRow,
    | "invitation_sent"
    | "save_the_date_sent"
    | "guest_from"
    | "category"
    | keyof InvitationAddress
  >
>;
type GuestUpdate = Partial<
  Pick<GuestRow, "first_name" | "last_name" | "dietary_restrictions" | "guest_type">
>;
export type AdminTab = "guests" | "activity" | "seating" | "postcards";
const adminTabs: { id: AdminTab; label: string; href: string }[] = [
  { id: "guests", label: "Gästeverwaltung", href: "/admin/guests" },
  { id: "activity", label: "Aktivität", href: "/admin/activity" },
  { id: "seating", label: "Sitzordnung", href: "/admin/seating" },
  { id: "postcards", label: "Postkarten", href: "/admin/postcards" },
];
type GuestFilters = {
  firstName: string;
  lastName: string;
  guestType: OptionalFilter<GuestType>;
  email: string;
  attending: "all" | "open" | "yes" | "no";
  dietary: OptionalFilter<DietaryRestriction>;
  additionalDietary: string;
  companion: string;
  code: string;
};
type InvitationFilters = {
  code: string;
  firstNames: string;
  created: string;
  invitationSent: BooleanFilter;
  saveTheDateSent: BooleanFilter;
  guestFrom: OptionalFilter<GuestFrom>;
  category: OptionalFilter<InvitationCategory>;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

function getAttendingFilter(value: string): GuestFilters["attending"] {
  if (value === "open" || value === "yes" || value === "no") {
    return value;
  }
  return "all";
}

function getBooleanFilter(value: string): BooleanFilter {
  return value === "yes" || value === "no" ? value : "all";
}

const guestFromOptions: GuestFrom[] = ["Roman", "Lisa"];
const guestTypeOptions: { value: GuestType; label: string }[] = [
  { value: "adult", label: "Erwachsener" },
  { value: "child_with_meal", label: "Kind (mit Kinderessen)" },
  { value: "child_without_meal", label: "Kind (ohne Kinderessen)" },
];
const dietaryRestrictionValues: DietaryRestriction[] =
  dietaryRestrictionOptions.map((option) => option.value);
const categoryOptions: InvitationCategory[] = ["Freunde", "Arbeit", "Familie"];
const categoryChartColors: Record<InvitationCategory, string> = {
  Freunde: "#4d594a",
  Arbeit: "#8fa083",
  Familie: "#c9a66b",
};
const uncategorizedChartColor = "#c8cfc2";

const responseChartColors = {
  attending: "#4d594a",
  declined: "#a65d4a",
  unanswered: "#c8cfc2",
};

const dietaryChartColors: Record<DietaryRestriction, string> = {
  Vegetarian: "#8fa083",
  Vegan: "#4d594a",
  "Lactose intolerant": "#c9a66b",
};

const guestFromChartColors: Record<GuestFrom, string> = {
  Roman: "#4d594a",
  Lisa: "#c9a66b",
};


const addressFieldLimits: Record<
  keyof InvitationAddress,
  { label: string; maxLength: number }
> = {
  street: { label: "Straße", maxLength: 100 },
  house_number: { label: "Hausnummer", maxLength: 10 },
  address_addition: { label: "Adresszusatz", maxLength: 100 },
  postal_code: { label: "PLZ", maxLength: 20 },
  city: { label: "Ort", maxLength: 100 },
  country: { label: "Land", maxLength: 100 },
};

function normalizeAddressValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}


function getStreetLine(
  invitation: Pick<InvitationRow, "street" | "house_number">
): string {
  return [invitation.street, invitation.house_number].filter(Boolean).join(" ");
}

function parseOption<T extends string>(
  options: readonly T[],
  value: string
): T | null {
  return options.find((option) => option === value) ?? null;
}

function getOptionalFilter<T extends string>(
  value: string,
  options: readonly T[]
): OptionalFilter<T> {
  return value === "none" ? "none" : (parseOption(options, value) ?? "all");
}

function matchesBooleanFilter(filter: BooleanFilter, value: boolean): boolean {
  return filter === "all" || (filter === "yes") === value;
}

function matchesOptionalFilter<T extends string>(
  filter: OptionalFilter<T>,
  value: T | null
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "none") {
    return value === null;
  }
  return value === filter;
}

const cellSelectClassName =
  "w-full border border-[#aab5a3] bg-white px-2 py-1 text-sm font-normal text-[#4d594a] outline-none focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25 disabled:opacity-60";

const inputClassName =
  "mt-2 w-full border border-[#aab5a3] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#4d594a] outline-none focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25";

function getInvitationFirstNames(
  invitationId: number,
  guests: GuestWithInvitation[]
): string[] {
  return guests
    .filter((guest) => guest.invitation_id === invitationId)
    .map((guest) => guest.first_name?.trim() ?? "")
    .filter(Boolean);
}

function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("de-DE");
}

function getGuestSortValue(
  guest: GuestWithInvitation,
  column: GuestSortColumn
): string | number {
  switch (column) {
    case "firstName":
      return guest.first_name ?? "";
    case "lastName":
      return guest.last_name ?? "";
    case "guestType":
      return getGuestTypeLabel(guest.guest_type);
    case "email":
      return guest.email ?? "";
    case "attending":
      return guest.attending === null ? 0 : guest.attending ? 2 : 1;
    case "dietary":
      return guest.dietary_restrictions
        ? getDietaryRestrictionLabel(guest.dietary_restrictions)
        : "";
    case "additionalDietary":
      return guest.additional_dietary_restrictions ?? "";
    case "companion":
      return guest.companionName ?? "";
    case "code":
      return guest.invitation?.code ?? "";
  }
}

function getGuestTypeLabel(value: GuestType): string {
  return guestTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function getDietaryRestrictionLabel(
  value: DietaryRestriction | null
): string {
  if (!value) {
    return "—";
  }

  return (
    dietaryRestrictionOptions.find((option) => option.value === value)?.label ??
    value
  );
}

function getInvitationSortValue(
  invitation: InvitationRow,
  column: InvitationSortColumn,
  firstNamesById: Map<number, string[]>
): string | number {
  switch (column) {
    case "code":
      return invitation.code;
    case "firstNames":
      return (firstNamesById.get(invitation.id) ?? []).join(" ");
    case "created":
      return invitation.created_at ?? "";
    case "invitationSent":
      return invitation.invitation_sent ? 1 : 0;
    case "saveTheDateSent":
      return invitation.save_the_date_sent ? 1 : 0;
    case "guestFrom":
      return invitation.guest_from ?? "";
    case "category":
      return invitation.category ?? "";
    case "street":
      return getStreetLine(invitation);
    case "postalCode":
      return invitation.postal_code ?? "";
    case "city":
      return invitation.city ?? "";
    case "country":
      return invitation.country ?? "";
  }
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1-1 4Z" />
    </svg>
  );
}

function EditableTextField({
  label,
  value,
  maxLength,
  disabled,
  onSave,
}: {
  label: string;
  value: string | null;
  maxLength: number;
  disabled: boolean;
  onSave: (value: string | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const savingRef = useRef(false);

  function startEditing() {
    setDraft(value ?? "");
    setLocalError("");
    setEditing(true);
  }

  function cancelEditing() {
    setLocalError("");
    setEditing(false);
  }

  async function save() {
    if (savingRef.current) {
      return;
    }
    if (draft.trim().length > maxLength) {
      setLocalError(`Höchstens ${maxLength} Zeichen.`);
      return;
    }
    const next = normalizeAddressValue(draft);
    if (next === value) {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    const saved = await onSave(next);
    savingRef.current = false;
    if (saved) {
      setEditing(false);
    } else {
      setLocalError("Nicht gespeichert. Bitte erneut mit Enter versuchen.");
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <input
          autoFocus
          value={draft}
          maxLength={maxLength}
          aria-label={label}
          aria-invalid={localError ? true : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setLocalError("");
          }}
          onBlur={cancelEditing}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              cancelEditing();
            }
          }}
          className="w-full min-w-40 border border-[#596656] bg-white px-2 py-1 text-sm font-normal text-[#4d594a] outline-none focus:ring-2 focus:ring-[#596656]/25"
        />
        {localError && (
          <span
            role="alert"
            className="mt-1 block text-xs font-semibold text-[#8a3b2e]"
          >
            {localError}
          </span>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 break-words">{value ?? "—"}</span>
      <button
        type="button"
        onClick={startEditing}
        disabled={disabled}
        aria-label={`${label} bearbeiten`}
        title="Bearbeiten"
        className="shrink-0 p-1 text-[#657061] transition-colors hover:text-[#394438] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#596656] disabled:opacity-60"
      >
        <PencilIcon />
      </button>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onSort,
  children,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className="min-w-36 px-4 py-3 align-top"
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-2 text-left font-semibold hover:text-[#394438] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#596656]"
      >
        {label}
        <span aria-hidden="true" className="text-[#394438]">
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
      {children}
    </th>
  );
}

export default function AdminDashboard({ activeTab }: { activeTab: AdminTab }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [guests, setGuests] = useState<GuestWithInvitation[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingInvitation, setSavingInvitation] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const [updatingInvitationId, setUpdatingInvitationId] = useState<number | null>(null);
  const [updatingGuestId, setUpdatingGuestId] = useState<number | null>(null);
  const [guestFilters, setGuestFiltersState] = useState<GuestFilters>({
    firstName: "",
    lastName: "",
    email: "",
    attending: "all",
    guestType: "all",
    dietary: "all",
    additionalDietary: "",
    companion: "",
    code: "",
  });
  const [invitationFilters, setInvitationFiltersState] = useState<InvitationFilters>(
    {
      code: "",
      firstNames: "",
      created: "",
      invitationSent: "all",
      saveTheDateSent: "all",
      guestFrom: "all",
      category: "all",
      street: "",
      postalCode: "",
      city: "",
      country: "",
    }
  );
  const [guestSort, setGuestSort] = useState<{
    column: GuestSortColumn;
    direction: SortDirection;
  }>({ column: "firstName", direction: "asc" });
  const [invitationSort, setInvitationSort] = useState<{
    column: InvitationSortColumn;
    direction: SortDirection;
  }>({ column: "created", direction: "desc" });
  const [guestPage, setGuestPage] = useState(1);
  const [guestPageSize, setGuestPageSize] = useState<PageSize>(25);
  const [invitationPage, setInvitationPage] = useState(1);
  const [invitationPageSize, setInvitationPageSize] = useState<PageSize>(25);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(currentSession);
      setLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setErrorMessage("");
      setSuccessMessage("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      return;
    }

    async function loadAdminData() {
      setLoading(true);
      setErrorMessage("");

      const [
        { data: guestData, error: guestError },
        { data: invitationData, error: invitationError },
      ] = await Promise.all([
        supabase
          .from("guest")
          .select("*, invitation:invitation_id(code)")
          .order("created_at", { ascending: true })
          .returns<GuestWithInvitation[]>(),
        supabase
          .from("invitation")
          .select("*")
          .order("created_at", { ascending: true })
          .returns<InvitationRow[]>(),
      ]);

      if (guestError || invitationError) {
        setErrorMessage(
          "Die Daten konnten nicht geladen werden. Bitte prüfe deine Berechtigungen."
        );
        setLoading(false);
        return;
      }

      const companionNames = new Map<number, string>();
      for (const guest of guestData ?? []) {
        if (guest.companion_of_guest_id !== null) {
          companionNames.set(
            guest.companion_of_guest_id,
            [guest.first_name, guest.last_name].filter(Boolean).join(" ")
          );
        }
      }

      setGuests(
        (guestData ?? []).map((guest) => ({
          ...guest,
          companionName: companionNames.get(guest.id) ?? null,
        }))
      );
      setInvitations(invitationData ?? []);
      setLoading(false);
    }

    void loadAdminData();
  }, [session, supabase]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage("Die Abmeldung konnte nicht durchgeführt werden.");
    }
  }

  async function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingInvitation(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("invitation")
      .insert({})
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage(
        "Die Einladung konnte nicht erstellt werden. Bitte prüfe deine Berechtigungen."
      );
      setSavingInvitation(false);
      return;
    }

    setInvitations((current) => [data, ...current]);
    setSuccessMessage(
      `Einladung erstellt. Der Code lautet ${data.code}.`
    );
    setSavingInvitation(false);
  }

  async function handleUpdateInvitation(
    invitation: InvitationRow,
    changes: InvitationUpdate
  ): Promise<boolean> {
    setUpdatingInvitationId(invitation.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("invitation")
      .update(changes)
      .eq("id", invitation.id)
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage(
        "Die Einladung konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut."
      );
      setUpdatingInvitationId(null);
      return false;
    }

    setInvitations((current) =>
      current.map((item) => (item.id === data.id ? data : item))
    );
    setSuccessMessage(`Einladung ${data.code} wurde aktualisiert.`);
    setUpdatingInvitationId(null);
    return true;
  }

  async function handleUpdateGuest(
    guest: GuestWithInvitation,
    changes: GuestUpdate
  ): Promise<boolean> {
    setUpdatingGuestId(guest.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("guest")
      .update(changes)
      .eq("id", guest.id)
      .select("*")
      .single();

    const isNameChange = "first_name" in changes || "last_name" in changes;
    const isGuestTypeChange = "guest_type" in changes;
    const guestLabel = [guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Gast";

    if (error || !data) {
      setErrorMessage(
        isNameChange
          ? "Der Name konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut."
          : isGuestTypeChange
            ? "Die Gastart konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut."
            : "Die Ernährungsweise konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut."
      );
      setUpdatingGuestId(null);
      return false;
    }

    setGuests((current) =>
      current.map((item) =>
        item.id === data.id ? { ...data, invitation: item.invitation } : item
      )
    );
    setSuccessMessage(
      isNameChange
        ? `Name wurde auf ${[data.first_name, data.last_name].filter(Boolean).join(" ")} aktualisiert.`
        : isGuestTypeChange
          ? `Gastart von ${guestLabel} wurde auf ${getGuestTypeLabel(data.guest_type)} aktualisiert.`
          : `Ernährungsweise von ${guestLabel} wurde aktualisiert.`
    );
    setUpdatingGuestId(null);
    return true;
  }

  function renderGuestNameField(guest: GuestWithInvitation, key: "first_name" | "last_name") {
    const label = key === "first_name" ? "Vorname" : "Nachname";
    return (
      <EditableTextField
        label={`${label} von ${[guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Gast"}`}
        value={guest[key]}
        maxLength={100}
        disabled={updatingGuestId !== null}
        onSave={(value) => {
          if (value === null) {
            setErrorMessage(`Der ${label} darf nicht leer sein.`);
            return Promise.resolve(false);
          }
          return handleUpdateGuest(
            guest,
            key === "first_name" ? { first_name: value } : { last_name: value }
          );
        }}
      />
    );
  }

  async function handleCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingGuest(true);
    setErrorMessage("");
    setSuccessMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = getTextValue(formData, "firstName");
    const lastName = getTextValue(formData, "lastName");
    const invitationChoice = formData.get("invitationId");

    if (!firstName || !lastName || typeof invitationChoice !== "string" || !invitationChoice) {
      setErrorMessage("Bitte gib Vor- und Nachnamen an und wähle eine Einladung.");
      setSavingGuest(false);
      return;
    }

    let invitation: InvitationRow | undefined;
    if (invitationChoice === "new") {
      const { data: newInvitation, error: invitationError } = await supabase
        .from("invitation")
        .insert({})
        .select("*")
        .single();

      if (invitationError || !newInvitation) {
        setErrorMessage(
          "Die Einladung konnte nicht erstellt werden. Bitte prüfe deine Berechtigungen."
        );
        setSavingGuest(false);
        return;
      }

      invitation = newInvitation;
    } else {
      const selectedInvitation = Number(invitationChoice);
      invitation = invitations.find(
        (item) => item.id === selectedInvitation
      );
    }

    if (!invitation) {
      setErrorMessage("Bitte wähle eine gültige Einladung aus.");
      setSavingGuest(false);
      return;
    }
    const guestInvitation = invitation;

    const { data, error } = await supabase
      .from("guest")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: getTextValue(formData, "guestEmail"),
        invitation_id: invitation.id,
        attending: null,
        dietary_restrictions: null,
        additional_dietary_restrictions: null,
        guest_type: "adult",
      })
      .select("*")
      .single();

    if (error || !data) {
      if (invitationChoice === "new") {
        setInvitations((current) => [guestInvitation, ...current]);
        setErrorMessage(
          `Die Einladung ${guestInvitation.code} wurde erstellt, aber der Gast konnte nicht hinzugefügt werden. Bitte versuche es erneut und wähle diese Einladung aus.`
        );
      } else {
        setErrorMessage(
          "Der Gast konnte nicht hinzugefügt werden. Bitte prüfe deine Berechtigungen."
        );
      }
      setSavingGuest(false);
      return;
    }

    if (invitationChoice === "new") {
      setInvitations((current) => [guestInvitation, ...current]);
    }
    setGuests((current) => [
      { ...data, invitation: { code: guestInvitation.code } },
      ...current,
    ]);
    form.reset();
    setSuccessMessage(
      invitationChoice === "new"
        ? `${firstName} ${lastName} wurde hinzugefügt. Einladungscode: ${guestInvitation.code}.`
        : `${firstName} ${lastName} wurde hinzugefügt.`
    );
    setSavingGuest(false);
  }

  function setGuestFilters(update: SetStateAction<GuestFilters>) {
    setGuestFiltersState(update);
    setGuestPage(1);
  }

  function setInvitationFilters(update: SetStateAction<InvitationFilters>) {
    setInvitationFiltersState(update);
    setInvitationPage(1);
    setGuestPage(1);
  }

  function toggleGuestSort(column: GuestSortColumn) {
    setGuestPage(1);
    setGuestSort((current) => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function toggleInvitationSort(column: InvitationSortColumn) {
    setInvitationPage(1);
    setInvitationSort((current) => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  if (loading && !session) {
    return (
      <AdminFrame>
        <p className="text-[#657061]">Adminbereich wird geladen …</p>
      </AdminFrame>
    );
  }

  if (!session) {
    return (
      <AdminFrame>
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">
            Interner Bereich
          </p>
          <h1 className="mt-4 font-serif text-4xl text-[#394438]">
            Admin anmelden
          </h1>
          <p className="mt-4 leading-7 text-[#657061]">
            Dieser Bereich ist nur für die Hochzeitsorganisation bestimmt.
          </p>
          <SignInForm
            labels={{
              email: "E-Mail-Adresse",
              password: "Passwort",
              submit: "Anmelden",
              submitting: "Anmeldung läuft …",
            }}
            errorMessage="Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten."
          />
        </div>
      </AdminFrame>
    );
  }

  const invitationFirstNamesById = new Map(
    invitations.map((invitation) => [
      invitation.id,
      getInvitationFirstNames(invitation.id, guests),
    ])
  );
  const visibleInvitations = invitations
    .filter((invitation) => {
      const matchesCode = normalizeSearch(invitation.code).includes(
        normalizeSearch(invitationFilters.code)
      );
      const matchesDate =
        !invitationFilters.created ||
        invitation.created_at?.slice(0, 10) === invitationFilters.created;
      const firstNames = invitationFirstNamesById
        .get(invitation.id)
        ?.join(" ") ?? "";
      const matchesFirstNames = normalizeSearch(firstNames).includes(
        normalizeSearch(invitationFilters.firstNames)
      );
      const matchesInvitationSent = matchesBooleanFilter(
        invitationFilters.invitationSent,
        invitation.invitation_sent
      );
      const matchesSaveTheDate = matchesBooleanFilter(
        invitationFilters.saveTheDateSent,
        invitation.save_the_date_sent
      );
      const matchesGuestFrom = matchesOptionalFilter(
        invitationFilters.guestFrom,
        invitation.guest_from
      );
      const matchesCategory = matchesOptionalFilter(
        invitationFilters.category,
        invitation.category
      );
      const matchesStreet = normalizeSearch(
        [getStreetLine(invitation), invitation.address_addition]
          .filter(Boolean)
          .join(" ")
      ).includes(normalizeSearch(invitationFilters.street));
      const matchesPostalCode = normalizeSearch(invitation.postal_code).includes(
        normalizeSearch(invitationFilters.postalCode)
      );
      const matchesCity = normalizeSearch(invitation.city).includes(
        normalizeSearch(invitationFilters.city)
      );
      const matchesCountry = normalizeSearch(invitation.country).includes(
        normalizeSearch(invitationFilters.country)
      );
      return (
        matchesCode &&
        matchesDate &&
        matchesFirstNames &&
        matchesInvitationSent &&
        matchesSaveTheDate &&
        matchesGuestFrom &&
        matchesCategory &&
        matchesStreet &&
        matchesPostalCode &&
        matchesCity &&
        matchesCountry
      );
    })
    .sort((left, right) => {
      const leftValue = getInvitationSortValue(
        left,
        invitationSort.column,
        invitationFirstNamesById
      );
      const rightValue = getInvitationSortValue(
        right,
        invitationSort.column,
        invitationFirstNamesById
      );
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "de", {
              sensitivity: "base",
              numeric: true,
            });
      return invitationSort.direction === "asc" ? result : -result;
    });
  const visibleInvitationIds = new Set(
    visibleInvitations.map((invitation) => invitation.id)
  );
  const visibleGuests = guests
    .filter((guest) => {
      return (
        visibleInvitationIds.has(guest.invitation_id) &&
        normalizeSearch(guest.first_name).includes(normalizeSearch(guestFilters.firstName)) &&
        normalizeSearch(guest.last_name).includes(normalizeSearch(guestFilters.lastName)) &&
        normalizeSearch(guest.email).includes(normalizeSearch(guestFilters.email)) &&
        (guestFilters.attending === "all" ||
          (guestFilters.attending === "open" && guest.attending === null) ||
          (guestFilters.attending === "yes" && guest.attending === true) ||
          (guestFilters.attending === "no" && guest.attending === false)) &&
        matchesOptionalFilter(guestFilters.guestType, guest.guest_type) &&
        matchesOptionalFilter(guestFilters.dietary, guest.dietary_restrictions) &&
        normalizeSearch(guest.additional_dietary_restrictions).includes(
          normalizeSearch(guestFilters.additionalDietary)
        ) &&
        normalizeSearch(guest.companionName ?? null).includes(
          normalizeSearch(guestFilters.companion)
        ) &&
        normalizeSearch(guest.invitation?.code).includes(
          normalizeSearch(guestFilters.code)
        )
      );
    })
    .sort((left, right) => {
      const leftValue = getGuestSortValue(left, guestSort.column);
      const rightValue = getGuestSortValue(right, guestSort.column);
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "de", {
              sensitivity: "base",
              numeric: true,
            });
      return guestSort.direction === "asc" ? result : -result;
    });
  const guestPageCount = getPageCount(visibleGuests.length, guestPageSize);
  const currentGuestPage = Math.min(guestPage, guestPageCount);
  const pagedGuests = getPageItems(visibleGuests, currentGuestPage, guestPageSize);
  const invitationPageCount = getPageCount(
    visibleInvitations.length,
    invitationPageSize
  );
  const currentInvitationPage = Math.min(invitationPage, invitationPageCount);
  const pagedInvitations = getPageItems(
    visibleInvitations,
    currentInvitationPage,
    invitationPageSize
  );
  const visibleAnsweredGuests = visibleGuests.filter(
    (guest) => guest.attending !== null
  ).length;
  const visibleAttendingGuests = visibleGuests.filter(
    (guest) => guest.attending === true
  ).length;
  const visibleDeclinedGuests = visibleGuests.filter(
    (guest) => guest.attending === false
  ).length;
  const invitationIdsWithVisibleGuests = new Set(
    visibleGuests.map((guest) => guest.invitation_id)
  );
  const chartInvitations = visibleInvitations.filter((invitation) =>
    invitationIdsWithVisibleGuests.has(invitation.id)
  );
  const categoryDistribution = [
    ...categoryOptions.map((category) => ({
      label: category,
      value: chartInvitations.filter(
        (invitation) => invitation.category === category
      ).length,
      color: categoryChartColors[category],
    })),
    {
      label: "Ohne Kategorie",
      value: chartInvitations.filter((invitation) => !invitation.category)
        .length,
      color: uncategorizedChartColor,
    },
  ];
  const responseDistribution = [
    {
      label: "Zusagen",
      value: visibleAttendingGuests,
      color: responseChartColors.attending,
    },
    {
      label: "Absagen",
      value: visibleDeclinedGuests,
      color: responseChartColors.declined,
    },
    {
      label: "Keine Antwort",
      value: visibleGuests.length - visibleAnsweredGuests,
      color: responseChartColors.unanswered,
    },
  ];
  const guestFromDistribution = [
    ...guestFromOptions.map((option) => ({
      label: option,
      value: chartInvitations.filter(
        (invitation) => invitation.guest_from === option
      ).length,
      color: guestFromChartColors[option],
    })),
    {
      label: "Keine Angabe",
      value: chartInvitations.filter((invitation) => !invitation.guest_from)
        .length,
      color: uncategorizedChartColor,
    },
  ];
  const dietaryDistribution = [
    ...dietaryRestrictionOptions.map((option) => ({
      label: option.label,
      value: visibleGuests.filter(
        (guest) => guest.dietary_restrictions === option.value
      ).length,
      color: dietaryChartColors[option.value],
    })),
    {
      label: "Keine Angabe",
      value: visibleGuests.filter((guest) => !guest.dietary_restrictions)
        .length,
      color: uncategorizedChartColor,
    },
  ];

  function renderAddressField(
    invitation: InvitationRow,
    key: keyof InvitationAddress
  ) {
    const field = addressFieldLimits[key];
    return (
      <EditableTextField
        label={`${field.label} für Einladung ${invitation.code}`}
        value={invitation[key]}
        maxLength={field.maxLength}
        disabled={updatingInvitationId !== null}
        onSave={(value) => handleUpdateInvitation(invitation, { [key]: value })}
      />
    );
  }

  return (
    <AdminFrame>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">
            Interner Bereich
          </p>
          <h1 className="mt-4 font-serif text-4xl text-[#394438]">
            {adminTabs.find((tab) => tab.id === activeTab)?.label}
          </h1>
        </div>
        <nav
          aria-label="Admin-Bereiche"
          className="flex flex-wrap justify-center gap-2 lg:justify-self-center"
        >
          {adminTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a] ${
                  isActive
                    ? "border-[#4d594a] text-[#394438]"
                    : "border-transparent text-[#657061] hover:border-[#c8cfc2] hover:text-[#394438]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-fit border border-[#74816f] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#4d594a] hover:bg-[#4d594a] hover:text-white lg:justify-self-end"
        >
          Abmelden
        </button>
      </div>

      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}

      {activeTab === "guests" &&
        (loading ? (
        <p className="mt-10 text-[#657061]">Daten werden geladen …</p>
      ) : (
        <div className="mt-10 space-y-10">
          <section aria-labelledby="invitations-heading">
            <h2
              id="invitations-heading"
              className="font-serif text-2xl text-[#394438]"
            >
              Einladungen ({visibleInvitations.length} / {invitations.length})
            </h2>
            <form
              onSubmit={handleCreateInvitation}
              className="mt-4 border border-[#c8cfc2] bg-white/60 p-5"
            >
              <button
                type="submit"
                disabled={savingInvitation}
                className="bg-[#4d594a] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#394438] disabled:cursor-wait disabled:opacity-65"
              >
                {savingInvitation
                  ? "Einladung wird erstellt …"
                  : "Einladung hinzufügen"}
              </button>
            </form>
            <div className="mt-4 overflow-x-auto border border-[#c8cfc2] bg-white/60">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#c8cfc2] text-xs uppercase tracking-[0.12em] text-[#7b876f]">
                  <tr>
                    <SortableHeader
                      label="Code"
                      active={invitationSort.column === "code"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("code")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.code}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Code filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Vornamen"
                      active={invitationSort.column === "firstNames"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("firstNames")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.firstNames}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            firstNames: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Vornamen filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Erstellt"
                      active={invitationSort.column === "created"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("created")}
                    >
                      <input
                        type="date"
                        value={invitationFilters.created}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            created: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Erstellungsdatum filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Einladung versendet"
                      active={invitationSort.column === "invitationSent"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("invitationSent")}
                    >
                      <select
                        value={invitationFilters.invitationSent}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            invitationSent: getBooleanFilter(event.target.value),
                          }))
                        }
                        aria-label="Einladungen nach Versand filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nein</option>
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Save the Date versendet"
                      active={invitationSort.column === "saveTheDateSent"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("saveTheDateSent")}
                    >
                      <select
                        value={invitationFilters.saveTheDateSent}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            saveTheDateSent: getBooleanFilter(event.target.value),
                          }))
                        }
                        aria-label="Einladungen nach Save the Date filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nein</option>
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Von"
                      active={invitationSort.column === "guestFrom"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("guestFrom")}
                    >
                      <select
                        value={invitationFilters.guestFrom}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            guestFrom: getOptionalFilter(
                              event.target.value,
                              guestFromOptions
                            ),
                          }))
                        }
                        aria-label="Einladungen nach Von filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="none">Keine Angabe</option>
                        {guestFromOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Kategorie"
                      active={invitationSort.column === "category"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("category")}
                    >
                      <select
                        value={invitationFilters.category}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            category: getOptionalFilter(
                              event.target.value,
                              categoryOptions
                            ),
                          }))
                        }
                        aria-label="Einladungen nach Kategorie filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="none">Keine Angabe</option>
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Straße"
                      active={invitationSort.column === "street"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("street")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.street}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            street: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Straße filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="PLZ"
                      active={invitationSort.column === "postalCode"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("postalCode")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.postalCode}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            postalCode: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach PLZ filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Ort"
                      active={invitationSort.column === "city"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("city")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.city}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Ort filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Land"
                      active={invitationSort.column === "country"}
                      direction={invitationSort.direction}
                      onSort={() => toggleInvitationSort("country")}
                    >
                      <input
                        type="search"
                        value={invitationFilters.country}
                        onChange={(event) =>
                          setInvitationFilters((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                        aria-label="Einladungen nach Land filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e4dc] text-[#4d594a]">
                  {pagedInvitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-4 py-3 font-mono text-xs">
                        {invitation.code}
                      </td>
                      <td className="px-4 py-3">
                        {invitationFirstNamesById.get(invitation.id)?.join(", ") ||
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {invitation.created_at
                          ? new Date(invitation.created_at).toLocaleString(
                              "de-DE"
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={invitation.invitation_sent}
                          disabled={updatingInvitationId !== null}
                          onChange={(event) =>
                            void handleUpdateInvitation(invitation, {
                              invitation_sent: event.target.checked,
                            })
                          }
                          aria-label={`Einladung ${invitation.code} als versendet markieren`}
                          className="h-4 w-4 accent-[#4d594a] disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={invitation.save_the_date_sent}
                          disabled={updatingInvitationId !== null}
                          onChange={(event) =>
                            void handleUpdateInvitation(invitation, {
                              save_the_date_sent: event.target.checked,
                            })
                          }
                          aria-label={`Save the Date für Einladung ${invitation.code} als versendet markieren`}
                          className="h-4 w-4 accent-[#4d594a] disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={invitation.guest_from ?? ""}
                          disabled={updatingInvitationId !== null}
                          onChange={(event) =>
                            void handleUpdateInvitation(invitation, {
                              guest_from: parseOption(
                                guestFromOptions,
                                event.target.value
                              ),
                            })
                          }
                          aria-label={`Von für Einladung ${invitation.code}`}
                          className={cellSelectClassName}
                        >
                          <option value="">Keine Angabe</option>
                          {guestFromOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={invitation.category ?? ""}
                          disabled={updatingInvitationId !== null}
                          onChange={(event) =>
                            void handleUpdateInvitation(invitation, {
                              category: parseOption(
                                categoryOptions,
                                event.target.value
                              ),
                            })
                          }
                          aria-label={`Kategorie für Einladung ${invitation.code}`}
                          className={cellSelectClassName}
                        >
                          <option value="">Keine Angabe</option>
                          {categoryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {renderAddressField(invitation, "street")}
                          {renderAddressField(invitation, "house_number")}
                          {renderAddressField(invitation, "address_addition")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {renderAddressField(invitation, "postal_code")}
                      </td>
                      <td className="px-4 py-3">
                        {renderAddressField(invitation, "city")}
                      </td>
                      <td className="px-4 py-3">
                        {renderAddressField(invitation, "country")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleInvitations.length > 0 && (
                <TablePagination
                  id="invitations"
                  totalItems={visibleInvitations.length}
                  page={currentInvitationPage}
                  pageSize={invitationPageSize}
                  onPageChange={setInvitationPage}
                  onPageSizeChange={(size) => {
                    setInvitationPageSize(size);
                    setInvitationPage(1);
                  }}
                />
              )}
              {visibleInvitations.length === 0 && (
                <p className="p-5 text-[#657061]">
                  {invitations.length === 0
                    ? "Noch keine Einladungen vorhanden."
                    : "Keine Einladungen entsprechen den Filtern."}
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="guests-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="guests-heading" className="font-serif text-2xl text-[#394438]">
                Gäste ({visibleGuests.length} / {guests.length})
              </h2>
            </div>
            <form
              onSubmit={handleCreateGuest}
              className="mt-4 grid gap-4 border border-[#c8cfc2] bg-white/60 p-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              <h3 className="font-serif text-xl text-[#394438] sm:col-span-2 lg:col-span-4">
                Gast hinzufügen
              </h3>
              <label className="text-sm font-semibold text-[#394438]">
                Vorname *
                <input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  className={inputClassName}
                />
              </label>
              <label className="text-sm font-semibold text-[#394438]">
                Nachname *
                <input
                  name="lastName"
                  required
                  autoComplete="family-name"
                  className={inputClassName}
                />
              </label>
              <label className="text-sm font-semibold text-[#394438]">
                E-Mail
                <input
                  name="guestEmail"
                  type="email"
                  autoComplete="email"
                  className={inputClassName}
                />
              </label>
              <label className="text-sm font-semibold text-[#394438]">
                Einladung *
                <select
                  name="invitationId"
                  required
                  defaultValue=""
                  className={inputClassName}
                >
                  <option value="" disabled>
                    Einladung auswählen
                  </option>
                  <option value="new">Neue Einladung erstellen</option>
                  {invitations.map((invitation) => (
                    <option key={invitation.id} value={invitation.id}>
                      {invitation.code}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  disabled={savingGuest}
                  className="bg-[#4d594a] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#394438] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingGuest ? "Gast wird hinzugefügt …" : "Gast hinzufügen"}
                </button>
              </div>
            </form>
            <div className="mt-4 overflow-x-auto border border-[#c8cfc2] bg-white/60">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#c8cfc2] text-xs uppercase tracking-[0.12em] text-[#7b876f]">
                  <tr>
                    <SortableHeader
                      label="Vorname"
                      active={guestSort.column === "firstName"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("firstName")}
                    >
                      <input
                        type="search"
                        value={guestFilters.firstName}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach Vorname filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Nachname"
                      active={guestSort.column === "lastName"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("lastName")}
                    >
                      <input
                        type="search"
                        value={guestFilters.lastName}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach Nachname filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Gastart"
                      active={guestSort.column === "guestType"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("guestType")}
                    >
                      <select
                        value={guestFilters.guestType}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            guestType: getOptionalFilter(
                              event.target.value,
                              guestTypeOptions.map((option) => option.value)
                            ),
                          }))
                        }
                        aria-label="Gäste nach Gastart filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        {guestTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="E-Mail"
                      active={guestSort.column === "email"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("email")}
                    >
                      <input
                        type="search"
                        value={guestFilters.email}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach E-Mail filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Rückmeldung"
                      active={guestSort.column === "attending"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("attending")}
                    >
                      <select
                        value={guestFilters.attending}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            attending: getAttendingFilter(event.target.value),
                          }))
                        }
                        aria-label="Gäste nach Rückmeldung filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="open">Offen</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nein</option>
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Ernährungsweise"
                      active={guestSort.column === "dietary"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("dietary")}
                    >
                      <select
                        value={guestFilters.dietary}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            dietary: getOptionalFilter(
                              event.target.value,
                              dietaryRestrictionValues
                            ),
                          }))
                        }
                        aria-label="Gäste nach Ernährungsweise filtern"
                        className={inputClassName}
                      >
                        <option value="all">Alle</option>
                        <option value="none">Keine Angabe</option>
                        {dietaryRestrictionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </SortableHeader>
                    <SortableHeader
                      label="Weitere Ernährungswünsche"
                      active={guestSort.column === "additionalDietary"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("additionalDietary")}
                    >
                      <input
                        type="search"
                        value={guestFilters.additionalDietary}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            additionalDietary: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach weiteren Ernährungswünschen filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Begleitperson"
                      active={guestSort.column === "companion"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("companion")}
                    >
                      <input
                        type="search"
                        value={guestFilters.companion}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            companion: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach Begleitperson filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                    <SortableHeader
                      label="Einladungscode"
                      active={guestSort.column === "code"}
                      direction={guestSort.direction}
                      onSort={() => toggleGuestSort("code")}
                    >
                      <input
                        type="search"
                        value={guestFilters.code}
                        onChange={(event) =>
                          setGuestFilters((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        aria-label="Gäste nach Einladungscode filtern"
                        placeholder="Filtern"
                        className={inputClassName}
                      />
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e4dc] text-[#4d594a]">
                  {pagedGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td className="px-4 py-3">
                        {renderGuestNameField(guest, "first_name")}
                      </td>
                      <td className="px-4 py-3">
                        {renderGuestNameField(guest, "last_name")}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={guest.guest_type}
                          disabled={updatingGuestId !== null}
                          onChange={(event) =>
                            void handleUpdateGuest(guest, {
                              guest_type: parseOption(
                                guestTypeOptions.map((option) => option.value),
                                event.target.value
                              ) ?? guest.guest_type,
                            })
                          }
                          aria-label={`Gastart für ${[guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Gast"}`}
                          className={cellSelectClassName}
                        >
                          {guestTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">{guest.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {guest.attending === null
                          ? "Offen"
                          : guest.attending
                            ? "Ja"
                            : "Nein"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={guest.dietary_restrictions ?? ""}
                          disabled={updatingGuestId !== null}
                          onChange={(event) =>
                            void handleUpdateGuest(guest, {
                              dietary_restrictions: parseOption(
                                dietaryRestrictionValues,
                                event.target.value
                              ),
                            })
                          }
                          aria-label={`Ernährungsweise für ${[guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Gast"}`}
                          className={cellSelectClassName}
                        >
                          <option value="">Keine Angabe</option>
                          {dietaryRestrictionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {guest.additional_dietary_restrictions ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {guest.companionName ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {guest.invitation?.code ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleGuests.length > 0 && (
                <TablePagination
                  id="guests"
                  totalItems={visibleGuests.length}
                  page={currentGuestPage}
                  pageSize={guestPageSize}
                  onPageChange={setGuestPage}
                  onPageSizeChange={(size) => {
                    setGuestPageSize(size);
                    setGuestPage(1);
                  }}
                />
              )}
              {visibleGuests.length === 0 && (
                <p className="p-5 text-[#657061]">
                  {guests.length === 0
                    ? "Noch keine Gäste vorhanden."
                    : "Keine Gäste entsprechen den Filtern."}
                </p>
              )}
            </div>
          </section>
          <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <BarChart
              title="Antworten der Gäste"
              emptyMessage={
                guests.length === 0
                  ? "Noch keine Gäste vorhanden."
                  : "Keine Gäste entsprechen den Filtern."
              }
              slices={responseDistribution}
            />
            <BarChart
              title="Kategorien der Einladungen"
              emptyMessage="Noch keine Einladungen für die Kategorieverteilung vorhanden."
              slices={categoryDistribution}
            />
            <BarChart
              title="Ernährungsweise der Gäste"
              emptyMessage={
                guests.length === 0
                  ? "Noch keine Gäste vorhanden."
                  : "Keine Gäste entsprechen den Filtern."
              }
              slices={dietaryDistribution}
            />
            <BarChart
              title="Einladungen Von"
              emptyMessage="Noch keine Einladungen für die Verteilung nach Von vorhanden."
              slices={guestFromDistribution}
            />
          </div>
        </div>
        ))}
      {activeTab === "activity" && <ActivityLog />}
      {activeTab === "seating" && <SeatingPlan />}
      {activeTab === "postcards" && <PostcardPrint />}
    </AdminFrame>
  );
}

function getTextValue(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8f5ef] px-6 py-12 text-[#3f493d] sm:px-10 sm:py-16">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-5 text-sm font-medium leading-6 text-[#9b3e32]">
      {children}
    </p>
  );
}

function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="mt-5 text-sm font-medium leading-6 text-[#394438]"
    >
      {children}
    </p>
  );
}
