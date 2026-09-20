export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#3f493d]">
      <header className="absolute inset-x-0 top-0 z-10">
        <nav
          aria-label="Hauptnavigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7"
        >
          <a
            href="#home"
            className="font-serif text-xl tracking-[0.18em] text-[#394438]"
          >
            L & R
          </a>
          <a
            href="#details"
            className="text-xs font-medium uppercase tracking-[0.2em] text-[#596656] transition-colors hover:text-[#8b7355]"
          >
            Zur Feier
          </a>
        </nav>
      </header>

      <main>
        <section
          id="home"
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-28 text-center"
        >
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
              <span aria-hidden="true" className="text-xl">
                ♡
              </span>
              <span className="h-px flex-1 bg-current" />
            </div>
            <p className="mx-auto max-w-xl text-lg leading-8 text-[#657061] sm:text-xl">
              Wir freuen uns darauf, diesen besonderen Tag gemeinsam mit
              unseren liebsten Menschen zu feiern.
            </p>
            <a
              href="#details"
              className="mt-11 inline-flex border border-[#74816f] px-8 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#4d594a] transition-colors hover:bg-[#4d594a] hover:text-[#f8f5ef]"
            >
              Mehr erfahren
            </a>
          </div>
        </section>

        <section
          id="details"
          className="bg-[#e9ede5] px-6 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7b876f]">
              Unsere Feier
            </p>
            <h2 className="mt-5 font-serif text-4xl text-[#394438] sm:text-5xl">
              Ein Tag voller Liebe
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#657061] sm:text-lg">
              Alle Informationen zu Datum, Ort und Ablauf unserer Hochzeit
              findet ihr bald hier. Bis dahin freuen wir uns schon sehr darauf,
              mit euch anzustoßen, zu lachen und zu tanzen.
            </p>

            <div className="mt-14 grid gap-px overflow-hidden border border-[#bdc5b8] bg-[#bdc5b8] sm:grid-cols-3">
              {[
                ["Wann", "Details folgen"],
                ["Wo", "Details folgen"],
                ["Dresscode", "Festlich & bequem"],
              ].map(([title, detail]) => (
                <div key={title} className="bg-[#f8f5ef] px-6 py-9">
                  <h3 className="font-serif text-2xl text-[#394438]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm uppercase tracking-[0.16em] text-[#7b876f]">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#455043] px-6 py-10 text-center text-[#edf0ea]">
        <p className="font-serif text-2xl">Lisa & Roman</p>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#cbd2c5]">
          Wir freuen uns auf euch
        </p>
      </footer>
    </div>
  );
}
