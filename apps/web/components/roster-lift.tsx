"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export function RosterLift({
  name,
  team,
  action,
}: {
  name: string;
  team: string;
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="admin-text-btn" onClick={() => setOpen(true)}>Kadrodan çıkar</button>
      {open ? createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101a42]/30 p-4" role="dialog" aria-modal="true" aria-labelledby="kadro-soru">
          <div className="w-full max-w-md whitespace-normal rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="kadro-soru" className="whitespace-normal text-lg font-semibold text-[var(--heading)]">Kadrodan çıkarılsın mı?</h2>
            <p className="mt-2 whitespace-normal text-sm leading-6 text-[var(--muted)]">{name}, {team} kadrosundan çıkarılacak. Sporcu kaydı silinmez. Yalnız bu takımdan alınır.</p>
            <form action={action} className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-line" onClick={() => setOpen(false)}>Vazgeç</button>
              <button type="submit" className="btn-club">Evet, çıkar</button>
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
