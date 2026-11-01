import { getInvitationCode, SiteShell } from "../site-shell";

const schedule = [
  ["11:00", "Empfang"], ["12:00", "Trauung"], ["13:00", "Einzug & Agape"],
  ["14:00", "Spiele spielen"], ["15:00", "Hochzeitstorte & Kaffee"],
  ["17:00", "Reden"], ["18:00", "Abendessen"], ["20:00", "Erster Tanz & Live-Musik"],
  ["23:00", "Disco"], ["00:00", "Mitternachtssnack"],
] as const;

export default async function SchedulePage(props: PageProps<"/schedule">) {
  const invitationCode = await getInvitationCode(props.searchParams);

  return (
    <SiteShell invitationCode={invitationCode}>
      <main className="bg-[#f8f5ef] px-6 pb-24 pt-36 sm:pb-32 sm:pt-44">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">Samstag, 29. Mai 2027</p>
            <h1 className="mt-5 font-serif text-4xl text-[#394438] sm:text-5xl">Ablauf unserer Hochzeit</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#657061] sm:text-lg">
              Wir feiern im Schloss Spielfeld, Schlossgasse 1, 8471 Spielfeld. Kommt in Ruhe an und verbringt mit uns einen unvergesslichen Tag.
            </p>
          </div>
          <ol className="relative mx-auto mt-16 max-w-3xl before:absolute before:bottom-5 before:left-[4.35rem] before:top-5 before:w-px before:bg-[#b2bba9] sm:before:left-1/2">
            {schedule.map(([time, event], index) => (
              <li key={`${time}-${event}`} className="relative grid min-h-20 grid-cols-[5.25rem_1fr] items-start pb-7 sm:grid-cols-2 sm:gap-14">
                <time dateTime={`2027-05-${index === schedule.length - 1 ? "30" : "29"}T${time}:00`} className="pr-7 pt-1 text-right text-xs font-semibold tracking-[0.16em] text-[#7b876f] sm:pr-0 sm:text-sm">{time}</time>
                <span className="absolute left-[4.08rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#f8f5ef] bg-[#8b7355] ring-1 ring-[#8b7355] sm:left-1/2 sm:-translate-x-1/2" />
                <div className="pl-5 sm:pl-0"><h2 className="font-serif text-xl text-[#394438] sm:text-2xl">{event}</h2></div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </SiteShell>
  );
}
