"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDietaryRestriction } from "./lib/dietary-restrictions";
import { findGuestByInvitationCode, isInvitationCode } from "./lib/invitations";
import { supabase } from "./lib/supabase";

export type InvitationAccessState = {
  message: string;
};

export type RsvpState = {
  message: string;
  success: boolean;
};

function getTextValue(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

  const result = await findGuestByInvitationCode(invitationCode);

  if (result.status === "error") {
    return {
      message:
        "Eure Einladung kann gerade nicht geprüft werden. Bitte versucht es später noch einmal.",
    };
  }

  if (result.status === "not-found") {
    return {
      message:
        "Dieser Einladungscode ist ungültig. Bitte prüft die Schreibweise.",
    };
  }

  redirect(`/invite/${invitationCode.trim().toLowerCase()}`);
}

export async function saveRsvp(
  _previousState: RsvpState,
  formData: FormData
): Promise<RsvpState> {
  const code = formData.get("code");
  const attending = formData.get("attending");

  if (
    typeof code !== "string" ||
    !isInvitationCode(code) ||
    (attending !== "yes" && attending !== "no")
  ) {
    return {
      message: "Bitte wählt aus, ob ihr dabei seid.",
      success: false,
    };
  }

  const dietaryRestrictions = getTextValue(formData, "dietaryRestrictions");

  if (
    dietaryRestrictions !== null &&
    !isDietaryRestriction(dietaryRestrictions)
  ) {
    return {
      message: "Bitte wählt eine der angebotenen Ernährungsweisen aus.",
      success: false,
    };
  }

  const { data, error } = await supabase.rpc("update_guest_rsvp", {
    provided_code: code.trim().toLowerCase(),
    provided_attending: attending === "yes",
    provided_dietary_restrictions: dietaryRestrictions,
    provided_companion_name: getTextValue(formData, "companionName"),
    provided_additional_dietary_restrictions: getTextValue(
      formData,
      "additionalDietaryRestrictions"
    ),
  });

  if (error || data !== true) {
    return {
      message:
        "Eure Angaben konnten gerade nicht gespeichert werden. Bitte versucht es später noch einmal.",
      success: false,
    };
  }

  // Die Seite neu rendern, damit das Formular die gespeicherten Werte als Standard erhält.
  revalidatePath("/invite/[code]", "page");

  return {
    message: "Danke für eure Rückmeldung – eure Angaben wurden gespeichert.",
    success: true,
  };
}
