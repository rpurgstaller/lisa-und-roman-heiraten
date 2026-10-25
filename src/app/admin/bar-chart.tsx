export type ChartSlice = {
  label: string;
  value: number;
  color: string;
};

export default function BarChart({
  title,
  emptyMessage,
  slices,
}: {
  title: string;
  emptyMessage: string;
  slices: ChartSlice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <p className="text-sm text-[#657061]">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...slices.map((slice) => slice.value));

  return (
    <figure className="border border-[#c8cfc2] bg-white/60 p-5">
      <figcaption className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b876f]">
        {title}
      </figcaption>
      <ul className="mt-6 flex gap-4 text-sm text-[#3f493d] sm:gap-8">
        {slices.map((slice) => {
          const percent = Math.round((slice.value / total) * 100);
          const height = (slice.value / maxValue) * 100;
          return (
            <li
              key={slice.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              <span className="tabular-nums text-[#657061]">
                {slice.value} ({percent} %)
              </span>
              <span className="flex h-40 w-full max-w-16 items-end bg-[#eee9de]">
                <span
                  aria-hidden="true"
                  className="block w-full motion-safe:transition-[height] duration-500"
                  style={{ height: `${height}%`, backgroundColor: slice.color }}
                />
              </span>
              <span className="break-words">{slice.label}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
