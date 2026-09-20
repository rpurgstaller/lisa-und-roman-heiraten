import { supabase } from "../lib/supabase";

type Guest = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  attending: boolean | null;
  menu_choice: string | null;
  dietary_restrictions: string | null;
  companion_name: string | null;
  created_at: string | null;
};

export default async function GuestsPage() {
  const { data: guests, error } = await supabase
    .from("guest")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Guest[]>();

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-6 py-16 px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Guest List
        </h1>

        {error && (
          <p className="text-red-600 dark:text-red-400">
            Could not load guests: {error.message}
          </p>
        )}

        {!error && (!guests || guests.length === 0) && (
          <p className="text-zinc-600 dark:text-zinc-400">No guests found.</p>
        )}

        {!error && guests && guests.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
            <table className="min-w-full divide-y divide-black/[.08] text-left text-sm dark:divide-white/[.145]">
              <thead className="bg-black/[.03] dark:bg-white/[.06]">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    First Name
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Last Name
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Attending
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Menu Choice
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Dietary Restrictions
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                    Companion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.08] dark:divide-white/[.145]">
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.first_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.last_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.attending === null
                        ? "—"
                        : guest.attending
                        ? "Yes"
                        : "No"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.menu_choice ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.dietary_restrictions ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {guest.companion_name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
