import Link from "next/link";
import { RsvpForm } from "../../rsvp-form";
import { getGuestDisplayName, findGuestByInvitationCode } from "../../lib/invitations";
import { SiteShell } from "../../site-shell";

export default async function InvitationPage(
  props: PageProps<"/einladung/[code]">
) {
  const { code } = await props.params;
  const result = await findGuestByInvitationCode(code);

  if (result.status !== "found") {
    return (
      <SiteShell invitationCode={code}>
        <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-6 py-20 text-[#3f493d]">
          <div className="w-full max-w-xl border border-[#bdc5b8] bg-[#f8f5ef] p-8 text-center sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">
              Persönliche Einladung
            </p>
            <h1 className="mt-5 font-serif text-4xl text-[#394438]">
              Einladung nicht gefunden
            </h1>
            <p className="mt-5 leading-7 text-[#657061]">
              {result.status === "error"
                ? "Eure Einladung kann gerade nicht geprüft werden. Bitte versucht es später noch einmal."
                : "Dieser Einladungslink ist ungültig. Bitte prüft, ob ihr den vollständigen Link geöffnet habt."}
            </p>
            <Link
              href="/einladung"
              className="mt-8 inline-flex border border-[#74816f] px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#4d594a] transition-colors hover:bg-[#4d594a] hover:text-white"
            >
              Code erneut eingeben
            </Link>
          </div>
        </main>
      </SiteShell>
    );
  }

  const guestName = getGuestDisplayName(result.guest);

  return (
    <SiteShell invitationCode={code}>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f5ef] px-6 py-20 text-center text-[#3f493d]">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#dce2d4]/70 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#eadfce]/80 blur-3xl" />
        <div className="absolute inset-5 border border-[#aab5a3]/40 sm:inset-8" />
        <div className="relative w-full max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">
            Eure persönliche Einladung
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-tight text-[#394438] sm:text-7xl">
            Hallo {guestName}
          </h1>
          <div className="mx-auto my-8 flex w-44 items-center gap-4 text-[#a18565]">
            <span className="h-px flex-1 bg-current" />
            <span aria-hidden="true" className="text-xl">
              ♡
            </span>
            <span className="h-px flex-1 bg-current" />
          </div>
          <p className="mx-auto max-w-xl text-lg leading-8 text-[#657061]">
            Wir freuen uns sehr, unseren Hochzeitstag am 29. Mai 2027 mit euch
            auf Schloss Spielfeld zu feiern.
          </p>
          <RsvpForm
            code={code}
            attending={result.guest.attending}
            dietaryRestrictions={result.guest.dietary_restrictions}
            additionalDietaryRestrictions={
              result.guest.additional_dietary_restrictions
            }
            companionName={result.guest.companion_name}
          />
          <Link
            href={`/ablauf?code=${encodeURIComponent(code)}`}
            className="mt-9 inline-flex border border-[#74816f] px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#4d594a] transition-colors hover:bg-[#4d594a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d594a]"
          >
            Hochzeitsdetails ansehen
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
