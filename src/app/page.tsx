import Link from "next/link";
import { getInvitationCode, SiteShell } from "./site-shell";

export default async function Home(props: PageProps<"/">) {
  const invitationCode = await getInvitationCode(props.searchParams);

  return (
    <SiteShell invitationCode={invitationCode}>
      <main>
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-28 text-center">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#dce2d4]/70 blur-3xl" />
          <div className="absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-[#eadfce]/80 blur-3xl" />
          <div className="absolute inset-5 border border-[#aab5a3]/40 sm:inset-8" />
          <div className="relative mx-auto max-w-3xl">
            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#7b876f] sm:text-sm">
              Wir heiraten
            </p>
            <h1 className="font-serif text-6xl leading-none text-[#394438] sm:text-8xl md:text-9xl">
              Lisa
              <span className="mx-3 inline-block text-4xl font-light italic text-[#a18565] sm:mx-5 sm:text-6xl">
                &
              </span>
              Roman
            </h1>
            <div className="mx-auto my-9 flex w-52 items-center gap-4 text-[#a18565]">
              <span className="h-px flex-1 bg-current" />
              <span aria-hidden="true" className="text-xl">♡</span>
              <span className="h-px flex-1 bg-current" />
            </div>
            <p className="font-serif text-2xl text-[#4d594a] sm:text-3xl">29. Mai 2027</p>
            <p className="mt-3 text-sm uppercase tracking-[0.18em] text-[#657061] sm:text-base">
              Schloss Spielfeld · Steiermark
            </p>
            <Link
              href={
                invitationCode
                  ? `/schedule?code=${encodeURIComponent(invitationCode)}`
                  : "/schedule"
              }
              className="mt-11 inline-flex border border-[#74816f] px-8 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#4d594a] transition-colors hover:bg-[#4d594a] hover:text-[#f8f5ef] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d594a]"
            >
              Unser Tag
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
