"use client";

import { useActionState, useState } from "react";
import { dietaryRestrictionOptions } from "./lib/dietary-restrictions";
import type { DietaryRestriction } from "./lib/database.types";
import type { InvitationGuest } from "./lib/invitations";
import {
  getGuestDisplayName,
  getPersonFieldNames,
  type PersonFieldNames,
} from "./lib/rsvp-fields";
import { saveRsvp, type RsvpState } from "./invitation-actions";

const initialState: RsvpState = { message: "", success: false };

const inputClassName =
  "mt-2 w-full border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 font-normal text-[#4d594a] outline-none placeholder:text-[#879083] focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25";
const labelClassName = "block text-sm font-semibold text-[#394438]";

type RsvpFormProps = {
  code: string;
  guests: InvitationGuest[];
  companion: InvitationGuest | null;
  message: string | null;
};

type PersonAnswerFieldsProps = {
  names: PersonFieldNames;
  attendingQuestion: string | null;
  attending: boolean | null;
  dietaryRestrictions: DietaryRestriction | null;
  additionalDietaryRestrictions: string | null;
};

function PersonAnswerFields({
  names,
  attendingQuestion,
  attending,
  dietaryRestrictions,
  additionalDietaryRestrictions,
}: PersonAnswerFieldsProps) {
  return (
    <>
      {attendingQuestion !== null && (
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-[#394438]">
          {attendingQuestion}
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["yes", "Ja, gerne!"],
            ["no", "Leider nein"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 text-sm text-[#4d594a]"
            >
              <input
                type="radio"
                name={names.attending}
                value={value}
                defaultChecked={attending === (value === "yes")}
                required
                className="accent-[#4d594a]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      )}

      <label className={`mt-6 ${labelClassName}`}>
        Ernährungsweise
        <select
          name={names.dietaryRestrictions}
          defaultValue={dietaryRestrictions ?? ""}
          className={inputClassName}
        >
          <option value="">Bitte auswählen</option>
          {dietaryRestrictionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={`mt-6 ${labelClassName}`}>
        Weitere Allergien oder Ernährungswünsche
        <textarea
          name={names.additionalDietaryRestrictions}
          defaultValue={additionalDietaryRestrictions ?? ""}
          rows={3}
          placeholder="Gibt es etwas, das wir wissen sollten?"
          className={inputClassName}
        />
      </label>
    </>
  );
}

export function RsvpForm({ code, guests, companion, message }: RsvpFormProps) {
  const [state, formAction, pending] = useActionState(saveRsvp, initialState);
  const [wantsCompanion, setWantsCompanion] = useState(companion !== null);
  const canHaveCompanion = guests.length === 1 || companion !== null;

  return (
    <form
      action={formAction}
      className="mt-10 border border-[#c8cfc2] bg-white/60 p-6 text-left sm:p-8"
    >
      <input type="hidden" name="code" value={code} />

      {guests.map((guest) => {
        const guestName = getGuestDisplayName(guest) ?? "Gast";

        return (
          <fieldset key={guest.id} className="mt-8 first:mt-0">
            <legend className="font-serif text-2xl text-[#394438]">
              {guestName}
            </legend>
            <PersonAnswerFields
              names={getPersonFieldNames(`guest-${guest.id}`)}
              attendingQuestion={`Ist ${guestName} dabei?`}
              attending={guest.attending}
              dietaryRestrictions={guest.dietary_restrictions}
              additionalDietaryRestrictions={
                guest.additional_dietary_restrictions
              }
            />
          </fieldset>
        );
      })}

      {canHaveCompanion && (
        <div className="mt-10 border-t border-[#c8cfc2] pt-8">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#394438]">
            <input
              type="checkbox"
              name="hasCompanion"
              value="on"
              defaultChecked={companion !== null}
              onChange={(event) => setWantsCompanion(event.target.checked)}
              className="h-5 w-5 accent-[#4d594a]"
            />
            Begleitperson
          </label>

          {companion && (
            <input type="hidden" name="companionId" value={companion.id} />
          )}

          {wantsCompanion && (
            <fieldset className="mt-6">
              <legend className="font-serif text-2xl text-[#394438]">
                Begleitperson
              </legend>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Vorname
                  <input
                    name="companionFirstName"
                    type="text"
                    required
                    autoComplete="off"
                    defaultValue={companion?.first_name ?? ""}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Nachname
                  <input
                    name="companionLastName"
                    type="text"
                    required
                    autoComplete="off"
                    defaultValue={companion?.last_name ?? ""}
                    className={inputClassName}
                  />
                </label>
              </div>
              <PersonAnswerFields
                names={getPersonFieldNames("companion")}
                attendingQuestion={null}
                attending={companion?.attending ?? null}
                dietaryRestrictions={companion?.dietary_restrictions ?? null}
                additionalDietaryRestrictions={
                  companion?.additional_dietary_restrictions ?? null
                }
              />
            </fieldset>
          )}
        </div>
      )}

      <label className={`mt-10 ${labelClassName}`}>
        Möchtet ihr uns sonst noch etwas mitteilen?
        <textarea
          name="message"
          defaultValue={message ?? ""}
          rows={4}
          maxLength={1000}
          placeholder="Zum Beispiel eine Anmerkung zur Anreise oder etwas, das wir wissen sollten."
          className={inputClassName}
        />
      </label>

      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-5 text-sm font-medium leading-6 ${
            state.success ? "text-[#596656]" : "text-[#9b3e32]"
          }`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#4d594a] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#394438] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d594a] disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Wird gespeichert …" : "Rückmeldung speichern"}
      </button>
    </form>
  );
}

