"use client";

import { useEffect, useState } from "react";

const readMs = 12000;

export function SavedPopup({
  title,
  name,
  rows,
}: {
  title: string;
  name: string;
  rows: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), readMs);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#101a42]/30 p-4" role="status" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-5">
          <p className="text-sm font-semibold text-[#1f6b45]">{title}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--heading)]">{name}</h2>
          <dl className="mt-3 grid gap-1.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                <dt className="text-[var(--muted)]">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="h-1 bg-[#f3f5f8]">
          <div className="popup-timer h-full bg-[var(--club)]" />
        </div>
      </div>
    </div>
  );
}
