import { getInvitationCode, SiteShell } from "../site-shell";

const hotels = [
  ["Weingut Holler", "Am Rosenberg 20, 8472 Straß in Steiermark", "1,6 km · ca. 23 Min. zu Fuß", "Chalet für bis zu 6 Personen", "https://www.holler-weine.at/"],
  ["Schoberhof", "Gersdorfer Landesstraße 10, 8472 Gersdorf an der Mur", "2 km · ca. 28 Min. zu Fuß", "", "https://www.schoberhof-gersdorf.at/"],
  ["Ferien am Rosenberg", "Am Rosenberg 9, 8472 Straß in Steiermark", "2 km · ca. 30 Min. zu Fuß", "", "https://www.ferienamrosenberg.at/index.html"],
  ["Ferienhaus Ronacher", "Spielfeld 87, 8472 Spielfeld", "2,2 km · ca. 33 Min. zu Fuß", "", "https://www.kulturinspielfeld.at/portfolio/ferienhaus-ronacher-2/"],
] as const;

const venueMapsUrl = "https://www.google.com/maps/search/?api=1&query=Schlossgasse%201%2C%208471%20Spielfeld";

export default async function TravelPage(props: PageProps<"/travel">) {
  const invitationCode = await getInvitationCode(props.searchParams);

  return (
    <SiteShell invitationCode={invitationCode}>
      <main className="px-6 pb-24 pt-36 sm:pb-32 sm:pt-44">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">Gut ankommen</p>
            <h1 className="mt-5 font-serif text-4xl text-[#394438] sm:text-5xl">Anreise & Übernachten</h1>
            <p className="mt-6 text-base leading-8 text-[#657061] sm:text-lg">
              Rund um Spielfeld findet ihr gemütliche Unterkünfte in Gehweite. Bitte reserviert frühzeitig und stimmt die Verfügbarkeit direkt mit der Unterkunft ab.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {hotels.map(([name, address, distance, note, href]) => (
              <article key={name} className="flex h-full flex-col border border-[#c8cfc2] bg-white/50 p-7 sm:p-8">
                <h2 className="font-serif text-2xl text-[#394438]">{name}</h2>
                <address className="mt-4 not-italic leading-7 text-[#657061]">{address}</address>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.1em] text-[#7b876f]">{distance}</p>
                {note && <p className="mt-3 text-sm text-[#657061]">{note}</p>}
                <a href={href} target="_blank" rel="noreferrer" className="mt-6 w-fit border-b border-[#8b7355] pb-1 text-sm font-semibold text-[#596656] transition-colors hover:text-[#8b7355]">
                  Unterkunft ansehen <span className="sr-only">: {name} (neuer Tab)</span>
                </a>
              </article>
            ))}
          </div>
          <div className="mt-14 grid gap-px overflow-hidden border border-[#bdc5b8] bg-[#bdc5b8] lg:grid-cols-3">
            <TravelCard title="Mit dem Auto">
              Ziel ist Schloss Spielfeld, Schlossgasse 1. Details zu den Parkplätzen direkt beim Schloss ergänzen wir noch. Am Bahnhof Spielfeld-Straß gibt es kostenlose Parkmöglichkeiten.
              <a href={venueMapsUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block border-b border-[#8b7355] pb-1 text-sm font-semibold text-[#596656]">Route öffnen<span className="sr-only"> (neuer Tab)</span></a>
            </TravelCard>
            <TravelCard title="Mit der Bahn">
              Reist bis zum Bahnhof Spielfeld-Straß. Für die letzte Strecke zum Schloss empfehlen wir, vorab ein Taxi zu reservieren oder Fahrgemeinschaften zu bilden.
              <a href="https://www.oebb.at/" target="_blank" rel="noreferrer" className="mt-5 inline-block border-b border-[#8b7355] pb-1 text-sm font-semibold text-[#596656]">Verbindung bei ÖBB suchen<span className="sr-only"> (neuer Tab)</span></a>
            </TravelCard>
            <TravelCard title="Noch Fragen?">
              Unser persönlicher Kontakt für Fragen zu Anreise und Unterkunft wird hier rechtzeitig bekannt gegeben.
              <span className="mt-5 block text-sm font-semibold uppercase tracking-[0.12em] text-[#7b876f]">Kontaktdaten folgen</span>
            </TravelCard>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}

function TravelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="bg-[#e9ede5] p-7 sm:p-9">
      <p aria-hidden="true" className="text-2xl text-[#a18565]">◇</p>
      <h2 className="mt-4 font-serif text-2xl text-[#394438]">{title}</h2>
      <div className="mt-4 leading-7 text-[#657061]">{children}</div>
    </article>
  );
}
