import type { InvitationGuest } from "./invitations";

export type PersonFieldNames = {
  attending: string;
  dietaryRestrictions: string;
  additionalDietaryRestrictions: string;
};

// Feldnamen werden vom Formular und der Server Action gemeinsam genutzt.
export function getPersonFieldNames(prefix: string): PersonFieldNames {
  return {
    attending: `${prefix}-attending`,
    dietaryRestrictions: `${prefix}-dietaryRestrictions`,
    additionalDietaryRestrictions: `${prefix}-additionalDietaryRestrictions`,
  };
}

export function getGuestDisplayName(guest: InvitationGuest): string | null {
  const displayName = [guest.first_name, guest.last_name]
    .filter((name): name is string => Boolean(name?.trim()))
    .join(" ");

  return displayName || null;
}

export function getInvitationDisplayName(guests: InvitationGuest[]): string {
  const names = guests
    .map(getGuestDisplayName)
    .filter((name): name is string => name !== null);

  return names.length > 0 ? names.join(" & ") : "lieber Gast";
}
