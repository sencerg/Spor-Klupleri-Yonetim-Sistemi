"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, Tag } from "@/components/bits";

export function DuesList({
  rows,
  current,
}: {
  rows: {
    name: string;
    team: string;
    month: string;
    monthKey: string;
    monthKeyLabel?: string;
    fee: string;
    paid: string;
    remaining: string;
    status: string;
    tone: "neutral" | "good" | "warn" | "bad" | "club";
    href?: string;
  }[];
  current: string;
}) {
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(current);
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const needle = q.trim().toLocaleLowerCase("tr");
  const visible = rows.filter((row) => {
    if (needle && !`${row.name} ${row.team}`.toLocaleLowerCase("tr").includes(needle)) return false;
    if (month && row.monthKey !== month) return false;
    if (team && row.team !== team) return false;
    if (status && row.status !== status) return false;
    return true;
  });
  const choices = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "tr"));
  const months = choices(rows.map((row) => row.monthKey)).sort();
  const filtered = Boolean(q.trim() || month !== current || team || status);
  return (
    <>
      <div className="my-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-44 flex-1 gap-1 text-sm">
          Sporcu
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Yazdıkça süzülür" className="field" />
        </label>
        <Filter
          label="Ay"
          value={month}
          options={months}
          labelOf={(value) => rows.find((row) => row.monthKey === value)?.monthKeyLabel ?? rows.find((row) => row.monthKey === value)?.month ?? value}
          onChange={setMonth}
          allLabel="Tüm aylar"
        />
        <Filter label="Takım" value={team} options={choices(rows.map((row) => row.team))} onChange={setTeam} />
        <Filter label="Durum" value={status} options={choices(rows.map((row) => row.status))} onChange={setStatus} />
        {filtered ? (
          <button
            type="button"
            className="admin-text-btn mb-2"
            onClick={() => {
              setQ("");
              setMonth(current);
              setTeam("");
              setStatus("");
            }}
          >
            Filtreleri temizle
          </button>
        ) : null}
      </div>
      <section className="admin-card">
        <div className="admin-card-body">
          {visible.length ? (
            <Table
              columns={["Sporcu", "Takım", "Ay", "Ücret", "Ödenen", "Kalan", "Durum", ""]}
              rows={visible.map((row, index) => [
                <span key={`${row.name}-${row.monthKey}-${index}`} className="font-semibold">{row.name}</span>,
                row.team,
                row.month,
                row.fee,
                row.paid,
                row.remaining,
                <Tag key={`${row.name}-${row.monthKey}-${index}-s`} tone={row.tone}>{row.status}</Tag>,
                row.href ? <Link key={`${row.name}-${row.monthKey}-${index}-e`} href={row.href} className="admin-text-btn">Yönet</Link> : null,
              ])}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Bu süzgeçte aidat yok.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
  labelOf,
  allLabel = "Tümü",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labelOf?: (value: string) => string;
  allLabel?: string;
}) {
  return (
    <label className="grid min-w-36 gap-1 text-sm">
      {label}
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{labelOf ? labelOf(option) : option}</option>
        ))}
      </select>
    </label>
  );
}
