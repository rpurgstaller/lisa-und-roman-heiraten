import { InvitationAccessForm } from "../invitation-access-form";
import { getInvitationCode, SiteShell } from "../site-shell";

export default async function InvitePage(
  props: PageProps<"/invite">
) {
  const invitationCode = await getInvitationCode(props.searchParams);

  return (
    <SiteShell invitationCode={invitationCode}>
      <main className="bg-[#f8f5ef] px-6 pb-24 pt-36 text-[#3f493d] sm:pb-32 sm:pt-44">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">Eure persönliche Einladung</p>
            <h1 className="mt-5 font-serif text-4xl text-[#394438] sm:text-5xl">Schön, dass ihr dabei seid</h1>
            <p className="mt-6 max-w-xl leading-8 text-[#657061]">
              Gebt euren persönlichen Einladungscode ein. Damit können wir euch eindeutig zuordnen und euch sicher zu eurer Einladung weiterleiten.
            </p>
          </div>
          <InvitationAccessForm />
        </div>
      </main>
    </SiteShell>
  );
}
