"use client";

import { useActionState } from "react";
import { dietaryRestrictionOptions } from "./lib/dietary-restrictions";
import type { DietaryRestriction } from "./lib/database.types";
import { saveRsvp, type RsvpState } from "./invitation-actions";

const initialState: RsvpState = { message: "", success: false };

type RsvpFormProps = {
  code: string;
  attending: boolean | null;
  dietaryRestrictions: DietaryRestriction | null;
  additionalDietaryRestrictions: string | null;
  companionName: string | null;
};

export function RsvpForm({
  code,
  attending,
  dietaryRestrictions,
  additionalDietaryRestrictions,
  companionName,
}: RsvpFormProps) {
  const [state, formAction, pending] = useActionState(saveRsvp, initialState);

  return (
    <form
      action={formAction}
      className="mt-10 border border-[#c8cfc2] bg-white/60 p-6 text-left sm:p-8"
    >
      <input type="hidden" name="code" value={code} />
      <fieldset>
        <legend className="font-serif text-2xl text-[#394438]">
          Seid ihr dabei?
        </legend>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["yes", "Ja, wir freuen uns!"],
            ["no", "Leider nein"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 text-sm text-[#4d594a]"
            >
              <input
                type="radio"
                name="attending"
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

      <div className="mt-8">
        <label className="text-sm font-semibold text-[#394438]">
          Begleitperson
          <input
            name="companionName"
            type="text"
            defaultValue={companionName ?? ""}
            placeholder="Name der Begleitperson"
            className="mt-2 w-full border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 font-normal text-[#4d594a] outline-none placeholder:text-[#879083] focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25"
          />
        </label>
      </div>

      <label className="mt-6 block text-sm font-semibold text-[#394438]">
        Ernährungsweise
        <select
          name="dietaryRestrictions"
          defaultValue={dietaryRestrictions ?? ""}
          className="mt-2 w-full border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 font-normal text-[#4d594a] outline-none focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25"
        >
          <option value="">Bitte auswählen</option>
          {dietaryRestrictionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-6 block text-sm font-semibold text-[#394438]">
        Weitere Allergien oder Ernährungswünsche
        <textarea
          name="additionalDietaryRestrictions"
          defaultValue={additionalDietaryRestrictions ?? ""}
          rows={3}
          placeholder="Gibt es etwas, das wir wissen sollten?"
          className="mt-2 w-full border border-[#aab5a3] bg-[#f8f5ef] px-4 py-3 font-normal text-[#4d594a] outline-none placeholder:text-[#879083] focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25"
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
