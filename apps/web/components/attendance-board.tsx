"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@skys/domain";

const options: { id: AttendanceStatus; label: string }[] = [
  { id: "present", label: "Geldi" },
  { id: "absent", label: "Gelmedi" },
  { id: "excused", label: "İzinli" },
];

export function AttendanceBoard({
  rows,
  past,
}: {
  rows: { personId: string; name: string; team: string; status: AttendanceStatus }[];
  past: boolean;
}) {
  const [marks, setMarks] = useState(rows);
  const [saved, setSaved] = useState(false);
  const counts = {
    present: marks.filter((row) => row.status === "present").length,
    absent: marks.filter((row) => row.status === "absent").length,
    excused: marks.filter((row) => row.status === "excused").length,
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-[#e5f2ea] px-3 py-1">{counts.present} geldi</span>
        <span className="rounded-full bg-[#f8e4e1] px-3 py-1">{counts.absent} gelmedi</span>
        <span className="rounded-full bg-[#f8efd4] px-3 py-1">{counts.excused} izinli</span>
      </div>
      <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--card)]">
        {marks.map((row) => (
          <div key={row.personId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-xs text-[var(--muted)]">{row.team}</div>
            </div>
            <div className="flex gap-1">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setMarks((current) =>
                      current.map((item) =>
                        item.personId === row.personId ? { ...item, status: option.id } : item,
                      ),
                    );
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    row.status === option.id ? "bg-[var(--club)] text-white" : "bg-[#efeae1] text-[var(--ink)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="btn-ink"
        >
          Yoklamayı kaydet
        </button>
        {saved ? (
          <p className="text-sm text-[var(--muted)]">
            {past
              ? "Düzeltme işlendi. Eski yoklama silinmedi, işlem geçmişine fark olarak yazılır."
              : "Katılım kaydedildi. Bildirim, yoklama işleminden ayrı kuyruğa alınır."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
