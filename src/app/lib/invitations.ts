import type { DietaryRestriction } from "./database.types";
import { supabase } from "./supabase";

export type InvitationGuest = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  attending: boolean | null;
  dietary_restrictions: DietaryRestriction | null;
  additional_dietary_restrictions: string | null;
  companion_of_guest_id: number | null;
};

export type Invitation = {
  guests: InvitationGuest[];
  message: string | null;
};

type InvitationLookupResult =
  | { status: "found"; invitation: Invitation }
  | { status: "not-found" }
  | { status: "error" };

const invitationCodePattern = /^[abcdefghjkmnpqrstvwxyz23456789]{8}$/i;

export function isInvitationCode(value: string): boolean {
  return invitationCodePattern.test(value.trim());
}

export async function findInvitationByCode(
  code: string
): Promise<InvitationLookupResult> {
  if (!isInvitationCode(code)) {
    return { status: "not-found" };
  }

  const normalizedCode = code.trim().toLowerCase();
  const [guestsResult, messageResult] = await Promise.all([
    supabase.rpc("get_guests_by_invitation_code", {
      provided_code: normalizedCode,
    }),
    supabase.rpc("get_invitation_message", {
      provided_code: normalizedCode,
    }),
  ]);

  if (guestsResult.error || messageResult.error) {
    return { status: "error" };
  }

  const guests = guestsResult.data ?? [];

  if (guests.length === 0) {
    return { status: "not-found" };
  }

  return {
    status: "found",
    invitation: { guests, message: messageResult.data ?? null },
  };
}

export function getPrimaryGuests(guests: InvitationGuest[]): InvitationGuest[] {
  return guests.filter((guest) => guest.companion_of_guest_id === null);
}

export function getCompanion(guests: InvitationGuest[]): InvitationGuest | null {
  return guests.find((guest) => guest.companion_of_guest_id !== null) ?? null;
}
