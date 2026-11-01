"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDietaryRestriction } from "./lib/dietary-restrictions";
import type {
  CompanionPayload,
  GuestRsvpPayload,
} from "./lib/database.types";
import {
  findInvitationByCode,
  getCompanion,
  getPrimaryGuests,
  isInvitationCode,
} from "./lib/invitations";
import { supabase } from "./lib/supabase";
import { getPersonFieldNames, type PersonFieldNames } from "./lib/rsvp-fields";

export type InvitationAccessState = {
  message: string;
};

export type RsvpState = {
  message: string;
  success: boolean;
};

type PersonAnswer = Omit<GuestRsvpPayload, "id">;

type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const invalidCodeMessage =
  "Dieser Einladungscode ist ungültig. Bitte prüft die Schreibweise.";
const lookupErrorMessage =
  "Eure Einladung kann gerade nicht geprüft werden. Bitte versucht es später noch einmal.";
const saveErrorMessage =
  "Eure Angaben konnten gerade nicht gespeichert werden. Bitte versucht es später noch einmal.";
const missingAttendingMessage =
  "Bitte wählt bei allen Personen aus, ob sie dabei sind.";
const invalidDietaryMessage =
  "Bitte wählt eine der angebotenen Ernährungsweisen aus.";
const companionNameMessage =
  "Bitte gebt Vor- und Nachnamen eurer Begleitperson an.";
const companionNotAllowedMessage =
  "Eine Begleitperson kann nur bei einer Einladung für eine Person hinterlegt werden.";
const maxMessageLength = 1000;
const messageTooLongMessage =
  "Euer Hinweis darf höchstens 1000 Zeichen lang sein.";

function getTextValue(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type DietaryAnswer = Omit<PersonAnswer, "attending">;

function readDietaryAnswer(
  formData: FormData,
  names: PersonFieldNames
): ParseResult<DietaryAnswer> {
  const dietaryRestrictions = getTextValue(formData, names.dietaryRestrictions);

  if (
    dietaryRestrictions !== null &&
    !isDietaryRestriction(dietaryRestrictions)
  ) {
    return { ok: false, message: invalidDietaryMessage };
  }

  return {
    ok: true,
    value: {
      dietary_restrictions: dietaryRestrictions,
      additional_dietary_restrictions: getTextValue(
        formData,
        names.additionalDietaryRestrictions
      ),
    },
  };
}

function readPersonAnswer(
  formData: FormData,
  names: PersonFieldNames
): ParseResult<PersonAnswer> {
  const attending = formData.get(names.attending);

  if (attending !== "yes" && attending !== "no") {
    return { ok: false, message: missingAttendingMessage };
  }

  const dietary = readDietaryAnswer(formData, names);

  if (!dietary.ok) {
    return dietary;
  }

  return {
    ok: true,
    value: { attending: attending === "yes", ...dietary.value },
  };
}

export async function accessInvitation(
  _previousState: InvitationAccessState,
  formData: FormData
): Promise<InvitationAccessState> {
  const invitationCode = formData.get("invitationCode");

  if (typeof invitationCode !== "string" || !isInvitationCode(invitationCode)) {
    return {
      message:
        "Dieser Einladungscode ist ungültig. Bitte prüft die Schreibweise.",
    };
  }

  const result = await findInvitationByCode(invitationCode);

  if (result.status === "error") {
    return { message: lookupErrorMessage };
  }

  if (result.status === "not-found") {
    return { message: invalidCodeMessage };
  }

  redirect(`/invite/${invitationCode.trim().toLowerCase()}`);
}

export async function saveRsvp(
  _previousState: RsvpState,
  formData: FormData
): Promise<RsvpState> {
  const code = formData.get("code");

  if (typeof code !== "string" || !isInvitationCode(code)) {
    return { message: invalidCodeMessage, success: false };
  }

  const normalizedCode = code.trim().toLowerCase();
  const lookup = await findInvitationByCode(normalizedCode);

  if (lookup.status !== "found") {
    return {
      message:
        lookup.status === "error" ? lookupErrorMessage : invalidCodeMessage,
      success: false,
    };
  }

  const { guests } = lookup.invitation;
  const primaryGuests = getPrimaryGuests(guests);
  const companion = getCompanion(guests);

  const guestAnswers: GuestRsvpPayload[] = [];

  for (const guest of primaryGuests) {
    const answer = readPersonAnswer(
      formData,
      getPersonFieldNames(`guest-${guest.id}`)
    );

    if (!answer.ok) {
      return { message: answer.message, success: false };
    }

    guestAnswers.push({ id: guest.id, ...answer.value });
  }

  const wantsCompanion = formData.get("hasCompanion") === "on";
  let companionPayload: CompanionPayload | null = null;
  let removeCompanionId: number | null = null;

  if (wantsCompanion) {
    const firstName = getTextValue(formData, "companionFirstName");
    const lastName = getTextValue(formData, "companionLastName");

    if (!firstName || !lastName) {
      return { message: companionNameMessage, success: false };
    }

    const dietary = readDietaryAnswer(formData, getPersonFieldNames("companion"));

    if (!dietary.ok) {
      return { message: dietary.message, success: false };
    }

    companionPayload = {
      ...(companion ? { id: companion.id } : {}),
      first_name: firstName,
      last_name: lastName,
      attending: true,
      ...dietary.value,
    };
  } else if (companion) {
    removeCompanionId = companion.id;
  }

  const message = getTextValue(formData, "message");

  if (message !== null && message.length > maxMessageLength) {
    return { message: messageTooLongMessage, success: false };
  }

  const { data, error } = await supabase.rpc("save_invitation_rsvp", {
    provided_code: normalizedCode,
    provided_guests: guestAnswers,
    provided_companion: companionPayload,
    provided_remove_companion_id: removeCompanionId,
    provided_message: message,
  });

  if (error) {
    return {
      message: error.message.includes("companion_not_allowed")
        ? companionNotAllowedMessage
        : saveErrorMessage,
      success: false,
    };
  }

  if (data !== true) {
    return { message: saveErrorMessage, success: false };
  }

  // Die Seite neu rendern, damit das Formular die gespeicherten Werte als Standard erhält.
  revalidatePath("/invite/[code]", "page");

  return {
    message: "Danke für eure Rückmeldung – eure Angaben wurden gespeichert.",
    success: true,
  };
}
