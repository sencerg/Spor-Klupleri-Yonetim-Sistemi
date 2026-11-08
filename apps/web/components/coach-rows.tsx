"use client";

import { useState } from "react";

export function CoachRows({
  staff,
  defaultId,
}: {
  staff: { id: string; name: string; duty: string }[];
  defaultId: string;
}) {
  const [extraCount, setExtraCount] = useState(0);
  return (
    <>
      <label className="grid gap-1 text-sm">
        Antrenör
        <select name="coachStaffId" required className="field" defaultValue={defaultId}>
          {staff.map((item) => (
            <option key={item.id} value={item.id}>{item.name} · {item.duty}</option>
          ))}
        </select>
      </label>
      {Array.from({ length: extraCount }, (_, index) => (
        <label key={index} className="grid gap-1 text-sm">
          Ek antrenör
          <select name="extraCoachId" className="field" defaultValue="">
            <option value="">Seçme</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.duty}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="md:col-span-2">
        <button type="button" className="admin-text-btn" onClick={() => setExtraCount((count) => count + 1)}>
          Antrenör ekle
        </button>
      </div>
    </>
  );
}
