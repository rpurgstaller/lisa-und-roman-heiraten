<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Projektüberblick

Diese Repository enthält die Hochzeitswebsite von Lisa und Roman. Ziel ist eine persönliche, elegante, schnelle und mobil optimierte Website für Gäste. Die Website soll Informationen zur Hochzeit bereitstellen und die Organisation rund um Zu- und Absagen, Begleitpersonen, Ernährungswünsche und weitere Gästedaten unterstützen.

## Technologiestack

- **Framework:** Next.js 16 mit App Router (`src/app`)
- **Sprache:** TypeScript im Strict Mode
- **Frontend:** React 19, React Compiler ist in `next.config.ts` aktiviert
- **Styling:** Tailwind CSS v4 über `@tailwindcss/postcss`, globale Styles in `src/app/globals.css`
- **Backend und Datenbank:** Supabase (`@supabase/supabase-js`)
- **Deployment:** Cloudflare Workers über `@opennextjs/cloudflare`, konfiguriert in `wrangler.jsonc` und `open-next.config.ts`
- **Domain und DNS:** Porkbun und Cloudflare
- **Paketmanager:** npm (`package-lock.json` ist maßgeblich, kein Wechsel auf pnpm oder yarn)

## Projektstruktur

- `src/app` – Routen, Layouts und Seiten des App Routers
- `src/app/lib/supabase.ts` – gemeinsamer Supabase-Client
- `db/ddl` – SQL-Schema, `db/ddl/dml/tests` – Testdaten-Skripte
- `public` – statische Assets
- `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts` – Build- und Deployment-Konfiguration
- `CLAUDE.md` importiert nur `AGENTS.md`. Regeländerungen daher ausschließlich in `AGENTS.md` pflegen.
- `db` - SQL scripts

## Grundregeln für Änderungen

1. Bestehende Architektur, Konventionen und Verzeichnisstruktur respektieren.
2. Vor einer Änderung zuerst die betroffenen Dateien und Abhängigkeiten prüfen.
3. Nur Änderungen durchführen, die für die konkrete Aufgabe erforderlich sind.
4. Keine bestehenden Funktionen, Inhalte oder Designs ohne ausdrücklichen Auftrag entfernen.
5. Wiederverwendbare Komponenten statt dupliziertem Code erstellen.
6. TypeScript strikt verwenden und `any` vermeiden.
7. Keine Zugangsdaten, API-Schlüssel oder personenbezogenen Gästedaten in den Quellcode schreiben.
8. Neue Abhängigkeiten nur hinzufügen, wenn sie einen klaren Mehrwert bieten.
9. Änderungen klein, nachvollziehbar und gut testbar halten.
10. Bei Unsicherheit die sicherste und wartbarste Lösung wählen.

## Sprache und Tonalität

- Sichtbare Inhalte der Website grundsätzlich auf **Deutsch** verfassen. 
- Tonalität: persönlich, herzlich, elegant und unkompliziert.
- Texte sollen zu Lisa und Roman passen und Gäste direkt ansprechen.
- Technische Fehlermeldungen für Gäste verständlich und freundlich formulieren.
- Keine Platzhaltertexte veröffentlichen, sofern nicht ausdrücklich gewünscht.

## Designprinzipien

- Mobile-First-Ansatz verwenden.
- Styling über Tailwind-Utility-Klassen umsetzen und die vorhandenen `dark:`-Varianten konsistent mitpflegen.
- Bestehende Farben, Typografie, Abstände und Komponenten konsistent weiterführen.
- Lesbarkeit und klare visuelle Hierarchie priorisieren.
- Interaktive Elemente mit eindeutigem Hover-, Focus-, Loading-, Success- und Error-State versehen.
- Animationen dezent einsetzen und `prefers-reduced-motion` berücksichtigen.
- Keine grundlegende visuelle Neugestaltung ohne ausdrücklichen Auftrag durchführen.

## Barrierefreiheit

- Semantisches HTML verwenden.
- Formularelemente mit sichtbaren Labels versehen.
- Tastaturbedienung und sinnvolle Focus-Reihenfolge sicherstellen.
- Ausreichende Farbkontraste beachten.
- Bilder mit passenden Alternativtexten versehen. Dekorative Bilder erhalten leere Alternativtexte.
- Fehlermeldungen nicht ausschließlich über Farbe kommunizieren.
- ARIA nur verwenden, wenn semantisches HTML nicht ausreicht.

## Next.js und React

- Server Components standardmäßig bevorzugen.
- Client Components nur einsetzen, wenn Browser-APIs, lokaler State oder Interaktivität erforderlich sind.
- Dateien mit `"use client"` so klein wie möglich halten.
- Daten möglichst serverseitig laden.
- Next.js-Komponenten wie `Image` und `Link` verwenden, wenn passend.
- Metadaten über die Next.js Metadata API pflegen.
- Lade-, Fehler- und Leerseiten für datenabhängige Bereiche berücksichtigen.
- Keine unnötigen Re-Renders oder großen Client-Bundles verursachen.

## Supabase und Datenschutz

- Supabase-Zugriffe über den bestehenden Client in `src/app/lib/supabase.ts` durchführen und keinen zweiten Client duplizieren.
- Aktuell wird ausschließlich der öffentliche Publishable Key verwendet (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Alles, was mit diesem Key erreichbar ist, gilt als öffentlich.
- Weil kein Service-Role-Zugriff existiert, ist Row Level Security die einzige Schutzschicht. Vor jeder neuen Tabelle oder Spalte prüfen, ob die RLS-Regeln den Zugriff ausreichend einschränken.
- Ein Service-Role-Key darf nur serverseitig eingesetzt werden, nie mit `NEXT_PUBLIC_`-Präfix und nie in Client Components.
- Tabellenzeilen typisieren (zum Beispiel über `.returns<T[]>()`) statt `any` zu verwenden.
- Eingaben immer validieren und normalisieren.
- Eingaben immer validieren und normalisieren.
- Nur personenbezogene Daten erheben, die für die Hochzeitsorganisation notwendig sind.
- Gästedaten nicht in Logs, Fehlermeldungen, Screenshots oder Testdaten offenlegen.
- Keine echten Gästedaten für automatisierte Tests verwenden.
- Löschen oder Überschreiben von Gästedaten nur mit klarer Absicherung durchführen.

## Formulare und RSVP

Bei Formularen für Zu- und Absagen sowie Gästedaten:

- Pflichtfelder klar kennzeichnen.
- Eingaben client- und serverseitig validieren.
- Doppelte Übermittlungen verhindern.
- Während des Speicherns einen Ladezustand anzeigen.
- Erfolg oder Fehler eindeutig und freundlich bestätigen.
- Bestehende Daten nur gezielt aktualisieren.
- Begleitpersonen, Ernährungswünsche, Allergien und Freitextangaben datensparsam behandeln.
- Sonderzeichen, Umlaute und mehrteilige Namen korrekt unterstützen.
- Bei fehlender Verbindung keine erfolgreiche Speicherung vortäuschen.

## Umgebungsvariablen

- Lokale Werte in `.env.local` pflegen. Alle `.env*`-Dateien sind über `.gitignore` ausgeschlossen und dürfen nicht committet werden.
- Eine `.env.example` existiert derzeit nicht. Wird eine angelegt, gehören dort nur Platzhalter hinein, niemals echte Schlüssel.
- Nur bewusst öffentliche Werte mit `NEXT_PUBLIC_`-Präfix versehen, da diese im Browser-Bundle landen.
- Produktionswerte für Cloudflare setzen: öffentliche Werte in `vars` in `wrangler.jsonc`, vertrauliche Werte ausschließlich über `wrangler secret put`.
- Beim Build keine zwingenden Umgebungsvariablen auf Modulebene voraussetzen, wenn dadurch der Build ohne Runtime-Kontext fehlschlägt.

## Cloudflare-Kompatibilität

- Nur APIs verwenden, die auf der Workers-Runtime laufen. `nodejs_compat` ist aktiviert, ersetzt aber keine vollständige Node.js-Umgebung.
- Kein Zugriff auf das Dateisystem, keine langlebigen In-Memory-Caches und keine Node-spezifischen Binärabhängigkeiten.
- Änderungen an `wrangler.jsonc` vorsichtig durchführen und bestehende Einträge wie `assets`, `compatibility_flags` und `observability` erhalten.
- Vertrauliche Werte nicht in `wrangler.jsonc` eintragen.
- Vor Abschluss einer risikoreichen Änderung `npm run preview` ausführen, um den OpenNext-Build gegen die Workers-Runtime zu prüfen.

## Qualitätssicherung

Verfügbare Prüfungen im Repository:

```bash
npm run lint          # ESLint über eslint.config.mjs
npx tsc --noEmit      # Typprüfung, es gibt kein typecheck-Script
npm run build         # Next.js Build
npm run preview       # optional: OpenNext-Build und lokale Workers-Vorschau
```

Ein `test`-Script existiert aktuell nicht. `npm run test` daher nicht behaupten und keine Testinfrastruktur ohne Auftrag einführen. Tatsächlich ausgeführte Prüfungen im Abschlussbericht benennen.

Zusätzlich manuell prüfen:

- Darstellung auf kleinen und großen Viewports
- Navigation und Links
- Formularvalidierung
- Lade-, Erfolgs- und Fehlerzustände
- Umlaute und Sonderzeichen
- Tastaturbedienung
- Verhalten ohne oder mit langsamer Netzwerkverbindung

## Tests

- Es gibt derzeit keinen Test-Runner im Projekt. Ein Test-Setup nur nach ausdrücklichem Auftrag einführen.
- Wird Testinfrastruktur ergänzt, neue Geschäftslogik mit Unit-Tests absichern und kritische Abläufe wie RSVP zusätzlich integrativ prüfen.
- Tests müssen deterministisch sein.
- Externe Dienste mocken oder gegen eine separate Testinstanz laufen lassen, niemals gegen das produktive Supabase-Projekt schreiben.
- SQL-Testdaten gehören nach `db/ddl/dml/tests` und dürfen keine echten Gästedaten enthalten.

## Dateien und Inhalte

- Bilder für das Web optimieren.
- Aussagekräftige Dateinamen verwenden.
- Große Binärdateien nicht ohne Notwendigkeit ins Repository aufnehmen.
- Datums-, Orts- und Ablaufangaben zentral pflegen, wenn sie an mehreren Stellen verwendet werden.
- Inhalte nicht duplizieren, wenn sie aus einer gemeinsamen Konfiguration geladen werden können.

## Git und Commits

- Keine generierten Dateien oder Geheimnisse committen.
- Bestehende Änderungen anderer Personen nicht überschreiben.
- Commits klein und thematisch zusammenhängend halten.
- Commit-Nachrichten kurz und konkret formulieren, zum Beispiel:

```text
feat: add RSVP confirmation state
fix: handle missing Supabase environment variables
style: improve mobile spacing on guest form
```

## Vorgehen für Coding Agents

1. Aufgabenstellung und relevante Projektdateien lesen.
2. Bestehende Komponenten, Typen und Utilities wiederverwenden.
3. Einen minimalen Änderungsplan erstellen.
4. Die kleinste sinnvolle Lösung implementieren.
5. Linting, Typprüfung und Build ausführen (`npm run lint`, `npx tsc --noEmit`, `npm run build`).
6. Fehler beheben, die durch die eigene Änderung entstanden sind.
7. Abschließend kurz dokumentieren:
   - welche Dateien geändert wurden,
   - was funktional geändert wurde,
   - welche Prüfungen ausgeführt wurden,
   - welche offenen Risiken oder manuellen Schritte verbleiben.

## Nicht ohne ausdrücklichen Auftrag ändern

- Domain- oder DNS-Konfiguration
- Cloudflare-Projekt- oder Account-Einstellungen
- Supabase-Schema, Migrationen oder Row-Level-Security-Regeln (`db/ddl`)
- Authentifizierungslogik
- produktive Gästedaten
- zentrale Designentscheidungen
- Hochzeitstermin, Orte, Zeitplan oder Kontaktdaten
- rechtliche Texte wie Datenschutz oder Impressum

## Definition of Done

Eine Aufgabe ist abgeschlossen, wenn:

- die gewünschte Funktion umgesetzt ist,
- bestehende Kernfunktionen weiterhin funktionieren,
- keine Geheimnisse oder Gästedaten offengelegt werden,
- die Änderung responsiv und barrierearm ist,
- Linting, Typprüfung und Build erfolgreich sind,
- Abweichungen oder nicht ausgeführte Prüfungen transparent dokumentiert sind.
