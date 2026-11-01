"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { GuestRow, InvitationRow } from "../lib/database.types";
import { getInvitationDisplayName } from "../lib/rsvp-fields";
import {
  getPostcardPlaceholders,
  postcardConfig,
} from "../lib/postcard-config";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type Side = "front" | "back";

type PostcardInvitation = Pick<InvitationRow, "id" | "code">;

type PostcardGuest = Pick<
  GuestRow,
  | "id"
  | "invitation_id"
  | "first_name"
  | "last_name"
  | "attending"
  | "dietary_restrictions"
  | "additional_dietary_restrictions"
  | "companion_of_guest_id"
>;

type PostcardData = {
  code: string;
  displayName: string;
  greetingNames: string;
  url: string;
};

function joinFirstNames(guests: PostcardGuest[]): string {
  const names = guests
    .map((guest) => guest.first_name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length <= 1) {
    return names[0] ?? "Gäste";
  }

  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

function getUrlWithoutProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function PostcardQrCode({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 600,
    })
      .then((dataUrl) => {
        if (active) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setSrc(null);
        }
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (!src) {
    return <div className="h-[40mm] w-[40mm] bg-white" aria-hidden />;
  }

  return (
    <Image
      src={src}
      alt="QR-Code zur Rückmeldung"
      width={600}
      height={600}
      unoptimized
      className="h-[40mm] w-[40mm]"
    />
  );
}

function PostcardFront({ greetingNames }: { greetingNames: string }) {
  return (
    <div className="flex flex-1 flex-col justify-between text-center">
      <div>
        <p className="font-serif text-2xl text-[#394438]">
          Lisa &amp; Roman heiraten!
        </p>
        <p className="mt-4 text-base text-[#394438]">
          Liebe {greetingNames},
        </p>
        <p className="mx-auto mt-2 max-w-[100mm] text-sm leading-6 text-[#4d594a]">
          wir freuen uns sehr, dass ihr dabei seid, wenn wir uns das Ja-Wort
          geben.
        </p>
      </div>
      <p className="text-sm text-[#4d594a]">
        {postcardConfig.date} · {postcardConfig.location}
      </p>
    </div>
  );
}

function PostcardBack({ url }: { url: string }) {
  return (
    <div className="flex flex-1 items-center gap-[6mm]">
      <div className="flex flex-col items-center gap-2">
        <PostcardQrCode value={url} />
      </div>
      <div className="flex flex-1 flex-col gap-2 text-[#394438]">
        <p className="font-serif text-lg">
          Bitte gebt uns bis {postcardConfig.responseDeadline} Bescheid.
        </p>
        <p className="text-xs leading-5 text-[#4d594a]">
          Scannt einfach den QR-Code oder öffnet diesen Link:
        </p>
        <p className="break-all text-sm font-semibold">
          {getUrlWithoutProtocol(url)}
        </p>
        <p className="text-xs leading-5 text-[#4d594a]">
          Ihr könnt uns auch gerne direkt schreiben, per E-Mail an{" "}
          {postcardConfig.email} oder per WhatsApp an{" "}
          {postcardConfig.whatsapp}.
        </p>
        <p className="mt-auto text-xs text-[#4d594a]">
          Wir freuen uns auf euch!
          <br />
          Lisa &amp; Roman
        </p>
      </div>
    </div>
  );
}

export default function PostcardPrint() {
  const supabase = getSupabaseBrowserClient();
  const [postcards, setPostcards] = useState<PostcardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [printRequest, setPrintRequest] = useState<{ side: Side } | null>(
    null
  );

  useEffect(() => {
    if (printRequest) {
      window.print();
    }
  }, [printRequest]);

  useEffect(() => {
    let mounted = true;

    async function loadPostcards() {
      const [
        { data: invitationData, error: invitationError },
        { data: guestData, error: guestError },
      ] = await Promise.all([
        supabase
          .from("invitation")
          .select("id, code")
          .order("created_at", { ascending: true })
          .returns<PostcardInvitation[]>(),
        supabase
          .from("guest")
          .select(
            "id, invitation_id, first_name, last_name, attending, dietary_restrictions, additional_dietary_restrictions, companion_of_guest_id"
          )
          .order("id", { ascending: true })
          .returns<PostcardGuest[]>(),
      ]);

      if (!mounted) {
        return;
      }

      if (invitationError || guestError) {
        setErrorMessage(
          "Die Einladungen konnten nicht geladen werden. Bitte prüfe deine Berechtigungen."
        );
        setLoading(false);
        return;
      }

      const guestsByInvitation = new Map<number, PostcardGuest[]>();
      for (const guest of guestData ?? []) {
        const list = guestsByInvitation.get(guest.invitation_id) ?? [];
        list.push(guest);
        guestsByInvitation.set(guest.invitation_id, list);
      }

      setPostcards(
        (invitationData ?? []).map((invitation) => {
          const guests = guestsByInvitation.get(invitation.id) ?? [];
          return {
            code: invitation.code,
            displayName:
              guests.length > 0 ? getInvitationDisplayName(guests) : "Gäste",
            greetingNames: joinFirstNames(guests),
            url: `${postcardConfig.siteUrl}/invite/${invitation.code}`,
          };
        })
      );
      setLoading(false);
    }

    void loadPostcards();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const placeholders = getPostcardPlaceholders();

  return (
    <section aria-labelledby="postcards-heading" className="mt-10 space-y-8">
      <div className="print:hidden">
        <h2 id="postcards-heading" className="font-serif text-2xl text-[#394438]">
          Postkarten ({postcards.length})
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#657061]">
          Druck in zwei Durchgängen: Zuerst alle Vorderseiten, dann die
          Rückseiten in gleicher Reihenfolge auf die Rückseite des Papiers
          legen. Format: 148 × 105 mm, Ränder auf „Keine“ oder „Minimal“
          stellen.
        </p>

        {placeholders.length > 0 && (
          <p className="mt-4 border border-[#d8b46a] bg-[#fbf3e2] p-4 text-sm leading-6 text-[#5c4a1f]">
            Datum, Ort, Frist oder Kontakt sind noch Platzhalter. Bitte vor dem
            Druck in <code>src/app/lib/postcard-config.ts</code> ergänzen.
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 border border-[#b44c3c] bg-[#fdf1ee] p-4 text-sm text-[#7a2a1f]">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading || postcards.length === 0}
            onClick={() => setPrintRequest({ side: "front" })}
            className="border border-[#4d594a] bg-[#4d594a] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[#394438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vorderseiten drucken
          </button>
          <button
            type="button"
            disabled={loading || postcards.length === 0}
            onClick={() => setPrintRequest({ side: "back" })}
            className="border border-[#74816f] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#4d594a] hover:bg-[#4d594a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d594a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rückseiten drucken
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[#657061] print:hidden">Karten werden geladen …</p>
      ) : (
        <div
          className="postcard-print-area space-y-10"
          data-print-side={printRequest?.side ?? "both"}
        >
          {postcards.map((postcard) => (
            <article key={postcard.code} className="space-y-4">
              <p className="text-sm text-[#657061] print:hidden">
                {postcard.displayName} · Einladung {postcard.code}
              </p>
              <div className="postcard postcard-front mx-auto flex aspect-[148/105] w-full max-w-[148mm] flex-col border border-[#d8dccf] bg-white p-[8mm] shadow-sm">
                <PostcardFront greetingNames={postcard.greetingNames} />
              </div>
              <div className="postcard postcard-back mx-auto flex aspect-[148/105] w-full max-w-[148mm] flex-col border border-[#d8dccf] bg-white p-[8mm] shadow-sm">
                <PostcardBack url={postcard.url} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
