"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "./lib/supabase-browser";

const styles = {
  form: "mt-8 space-y-5",
  label: "block text-sm font-semibold text-[#394438]",
  input:
    "mt-2 w-full border border-[#aab5a3] bg-white px-4 py-3 font-normal text-[#4d594a] outline-none focus:border-[#596656] focus:ring-2 focus:ring-[#596656]/25",
  error: "mt-5 text-sm font-medium leading-6 text-[#9b3e32]",
  button:
    "w-full bg-[#4d594a] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#394438] disabled:cursor-wait disabled:opacity-65",
};

type SignInFormProps = {
  labels: {
    email: string;
    password: string;
    submit: string;
    submitting: string;
  };
  errorMessage: string;
};

export function SignInForm({ labels, errorMessage }: SignInFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [showError, setShowError] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setShowError(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setShowError(true);
    }

    setSigningIn(false);
  }

  return (
    <form onSubmit={handleSignIn} className={styles.form}>
      <label className={styles.label}>
        {labels.email}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className={styles.input}
        />
      </label>
      <label className={styles.label}>
        {labels.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          className={styles.input}
        />
      </label>
      {showError && (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      )}
      <button type="submit" disabled={signingIn} className={styles.button}>
        {signingIn ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
