import Link from "next/link";
import { isInvitationCode } from "./lib/invitations";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/ablauf", label: "Ablauf" },
  { href: "/anreise", label: "Anreise" },
  { href: "/einladung", label: "Einladung" },
] as const;

export function SiteShell({
  children,
  className = "",
  invitationCode,
}: {
  children: React.ReactNode;
  className?: string;
  invitationCode?: string;
}) {
  const normalizedCode =
    invitationCode && isInvitationCode(invitationCode)
      ? invitationCode.trim().toLowerCase()
      : undefined;
  const withInvitationCode = (href: string) =>
    normalizedCode
      ? href === "/einladung"
        ? `/einladung/${encodeURIComponent(normalizedCode)}`
        : `${href}?code=${encodeURIComponent(normalizedCode)}`
      : href;

  return (
    <div className={`min-h-screen bg-[#f8f5ef] text-[#3f493d] ${className}`}>
      <header className="absolute inset-x-0 top-0 z-10">
        <nav
          aria-label="Hauptnavigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"
        >
          <Link
            href={withInvitationCode("/")}
            className="font-serif text-xl tracking-[0.18em] text-[#394438]"
          >
            L & R
          </Link>
          <div className="flex items-center gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#596656] sm:gap-7 sm:text-xs sm:tracking-[0.2em]">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className="transition-colors hover:text-[#8b7355]"
                href={withInvitationCode(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      {children}
      <footer className="bg-[#394438] px-6 py-10 text-center text-[#edf0ea]">
        <p className="font-serif text-2xl">Lisa & Roman</p>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#cbd2c5]">
          29. Mai 2027 · Schloss Spielfeld
        </p>
        <Link
          href={withInvitationCode("/")}
          className="mt-5 inline-block text-xs text-[#cbd2c5] underline-offset-4 hover:underline"
        >
          Zur Startseite
        </Link>
      </footer>
    </div>
  );
}

type InvitationSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function getInvitationCode(
  searchParams?: InvitationSearchParams
): Promise<string | undefined> {
  if (!searchParams) {
    return undefined;
  }

  const params = await searchParams;
  const code = params.code;
  const value = Array.isArray(code) ? code[0] : code;

  return value && isInvitationCode(value) ? value.trim().toLowerCase() : undefined;
}
