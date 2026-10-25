import type { DietaryRestriction } from "./database.types";
import { supabase } from "./supabase";

export type InvitationGuest = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  attending: boolean | null;
  dietary_restrictions: DietaryRestriction | null;
  additional_dietary_restrictions: string | null;
  companion_name: string | null;
};

type InvitationLookupResult =
  | { status: "found"; guest: InvitationGuest }
  | { status: "not-found" }
  | { status: "error" };

const invitationCodePattern = /^[abcdefghjkmnpqrstvwxyz23456789]{8}$/i;

export function isInvitationCode(value: string): boolean {
  return invitationCodePattern.test(value.trim());
}

export async function findGuestByInvitationCode(
  code: string
): Promise<InvitationLookupResult> {
  if (!isInvitationCode(code)) {
    return { status: "not-found" };
  }

  const { data, error } = await supabase
    .rpc("get_guest_by_invitation_code", {
      provided_code: code.trim().toLowerCase(),
    });

  if (error) {
    return { status: "error" };
  }

  const guest = data?.[0];

  return guest ? { status: "found", guest } : { status: "not-found" };
}

export function getGuestDisplayName(guest: InvitationGuest): string {
  const displayName = [guest.first_name, guest.last_name]
    .filter((name): name is string => Boolean(name?.trim()))
    .join(" ");

  return displayName || "lieber Gast";
}
