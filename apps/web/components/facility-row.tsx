"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag } from "@/components/bits";

const facilityKinds = [
  { id: "salon", label: "Salon" },
  { id: "saha", label: "Saha" },
  { id: "studyo", label: "Stüdyo" },
  { id: "havuz", label: "Havuz" },
] as const;

type FacilityKind = (typeof facilityKinds)[number]["id"];

export function FacilityRow({
  facility,
  inUse,
  editHref,
  removeAction,
}: {
  facility: { id: string; name: string; kind: FacilityKind; capacity: number };
  inUse: boolean;
  editHref: string;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const kindLabel = facilityKinds.find((kind) => kind.id === facility.kind)?.label ?? facility.kind;

  return (
    <div className="border-t border-[#e6ebf2] pt-3 text-sm first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{facility.name}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Tag>
            {kindLabel} · {facility.capacity}
          </Tag>
          <Link href={editHref} className="admin-text-btn">Düzelt</Link>
          {inUse ? (
            <span className="text-xs font-semibold text-[#9f2d2d]">Bu tesiste program var. Silinemez.</span>
          ) : (
            <button type="button" className="admin-text-btn" onClick={() => setConfirming((open) => !open)}>
              Sil
            </button>
          )}
        </span>
      </div>
      {confirming && !inUse ? (
        <div className="mt-3 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-[#9f2d2d]">
          <p>
            <span className="font-semibold">“{facility.name}”</span> silinecek. Bu işlem geri alınamaz.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="admin-text-btn" onClick={() => setConfirming(false)}>
              Vazgeç
            </button>
            <form action={removeAction}>
              <input type="hidden" name="onay" value="sil" />
              <button className="btn-club">Sil</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
