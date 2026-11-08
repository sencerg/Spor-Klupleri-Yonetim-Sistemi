"use client";

import { useState } from "react";

export function ReportDownload({ search }: { search: string }) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  async function pull(kind: "pdf" | "xlsx") {
    const response = await fetch(`/api/yoklama-raporu?${search}&tur=${kind}`);
    if (!response.ok) throw new Error("indirilemedi");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kind === "pdf" ? "yoklama-raporu.pdf" : "yoklama-raporu.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-club"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setNote("");
          try {
            await pull("pdf");
            await pull("xlsx");
          } catch {
            setNote("Rapor indirilemedi.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Hazırlanıyor" : "Rapor al"}
      </button>
      {note ? <span className="text-sm text-[#9f2d2d]">{note}</span> : null}
    </span>
  );
}
