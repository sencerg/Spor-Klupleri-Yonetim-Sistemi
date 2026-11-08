"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const methods = [
  { id: "cash", label: "Nakit" },
  { id: "transfer", label: "Havale" },
  { id: "card", label: "Kart" },
];

export function AthletePick({
  people,
  value,
}: {
  people: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <label className="grid max-w-md gap-1 text-sm">
      Sporcu
      <select
        className="field"
        value={value}
        onChange={(event) => {
          const id = event.target.value;
          router.push(id ? `/aidat?al=${id}` : "/aidat?al=yeni");
        }}
      >
        <option value="">Seç</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.name}</option>
        ))}
      </select>
    </label>
  );
}

export function DuePayForm({
  action,
  hidden,
  autoAmount,
  autoText,
  amountLabel,
  manualHint,
  today,
  staff,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: { name: string; value: string }[];
  autoAmount: number | null;
  autoText: string;
  amountLabel: string;
  manualHint?: string;
  today: string;
  staff: { id: string; name: string; duty: string }[];
}) {
  const locked = autoAmount != null && autoAmount >= 1;
  const [partial, setPartial] = useState(!locked);
  const [collector, setCollector] = useState("");
  const manual = partial || !locked;
  return (
    <form action={action} className="grid gap-3">
      {hidden.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <input type="hidden" name="partial" value={manual ? "1" : "0"} />
      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <label className="grid gap-1 text-xs">
          Gün
          <input name="date" type="date" required defaultValue={today} max={today} className="field" />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={manual}
            disabled={!locked}
            onChange={(event) => setPartial(event.target.checked)}
          />
          Kısmi
        </label>
      </div>
      {manual ? (
        <label className="grid max-w-xs gap-1 text-xs">
          Tutar
          <input name="amount" type="number" min={1} required className="field" />
          {manualHint ? <span className="text-[var(--muted)]">{manualHint}</span> : null}
        </label>
      ) : (
        <div className="max-w-md rounded-lg bg-[var(--paper)] px-3 py-2 text-sm">
          <span className="text-[var(--muted)]">{amountLabel}</span>
          <span className="ml-2 font-semibold">{autoText}</span>
          <input type="hidden" name="amount" value={autoAmount ?? ""} />
        </div>
      )}
      <label className="grid max-w-md gap-1 text-xs">
        Ödemeyi alan
        <select
          name="collectorStaffId"
          className="field"
          value={collector}
          onChange={(event) => setCollector(event.target.value)}
        >
          <option value="">Seçilmedi</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}{member.duty ? ` · ${member.duty}` : ""}
            </option>
          ))}
        </select>
      </label>
      {collector ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            Kanal
            <select name="method" required className="field" defaultValue="">
              <option value="" disabled>Seç</option>
              {methods.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Not
            <input name="note" maxLength={240} className="field" placeholder="Boş kalabilir" />
          </label>
        </div>
      ) : null}
      <div>
        <button className="btn-club">Tahsil et</button>
      </div>
    </form>
  );
}
