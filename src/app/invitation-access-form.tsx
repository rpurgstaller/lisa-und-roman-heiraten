"use client";

import { useActionState } from "react";
import {
  accessInvitation,
  type InvitationAccessState,
} from "./invitation-actions";

const initialState: InvitationAccessState = {
  message: "",
};

export function InvitationAccessForm() {
  const [state, formAction, pending] = useActionState(
    accessInvitation,
    initialState
  );

  return (
    <form
      action={formAction}
      className="border border-[#71806d] bg-[#f8f5ef] p-6 text-[#3f493d] sm:p-8"
    >
      <label
        htmlFor="invitation-code"
        className="block text-sm font-semibold text-[#394438]"
      >
        Einladungscode
      </label>
      <p id="invitation-code-hint" className="mt-2 text-sm text-[#657061]">
        Ihr findet den Code auf eurer persönlichen Einladung.
      </p>
      <input
        id="invitation-code"
        name="invitationCode"
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={8}
        maxLength={8}
        pattern="[abcdefghjkmnpqrstvwxyzABCDEFGHJKMNPQRSTVWXYZ23456789]{8}"
        aria-describedby={`invitation-code-hint${
          state.message ? " invitation-code-error" : ""
        }`}
        aria-invalid={state.message ? true : undefined}
        className="mt-5 w-full border border-[#aab5a3] bg-white px-4 py-3 font-mono text-base tracking-[0.08em] text-[#394438] outline-none transition focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25"
      />
      {state.message && (
        <p
          id="invitation-code-error"
          role="alert"
          className="mt-4 text-sm font-medium leading-6 text-[#9b3e32]"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#4d594a] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#394438] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d594a] disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "Einladung wird geprüft …" : "Einladung öffnen"}
      </button>
    </form>
  );
}
