"use client";

import { useState } from "react";
import Link from "next/link";
import { athleteColumns } from "@/lib/athlete-sheet";
import { downloadXlsx } from "@/lib/xlsx";
import { statusLabel, statusTone, Table, Tag } from "@/components/bits";
import { foldTr } from "@/lib/search";

export function PeopleBrowser({
  people,
}: {
  people: {
    name: string;
    enrollment: string;
    guardian: string;
    sport: string;
    team: string;
    since: string;
    years: string;
    fee: string;
    status: string;
    cardHref: string;
    editHref?: string;
    sheet: (string | number)[];
  }[];
}) {
  const [q, setQ] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [sport, setSport] = useState("");
  const [team, setTeam] = useState("");
  const [fee, setFee] = useState("");
  const [since, setSince] = useState("");
  const [status, setStatus] = useState("");
  const needle = foldTr(q.trim());
  const rows = people.filter((person) => {
    if (needle && !foldTr(`${person.name} ${person.guardian}`).includes(needle)) return false;
    if (enrollment && person.enrollment !== enrollment) return false;
    if (sport && person.sport !== sport) return false;
    if (team && person.team !== team) return false;
    if (fee && person.fee !== fee) return false;
    if (since && person.since !== since) return false;
    if (status && person.status !== status) return false;
    return true;
  });
  const choices = (values: string[]) => [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "tr"));
  const filtered = Boolean(enrollment || sport || team || fee || since || status);
  function clearFilters() {
    setEnrollment("");
    setSport("");
    setTeam("");
    setFee("");
    setSince("");
    setStatus("");
  }
  return (
    <>
      <div className="my-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-44 flex-1 gap-1 text-sm">
          İsim veya veli
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Yazdıkça süzülür"
            className="field"
          />
        </label>
        <Filter label="Tür" value={enrollment} options={choices(people.map((person) => person.enrollment))} onChange={setEnrollment} />
        <Filter label="Branş" value={sport} options={choices(people.map((person) => person.sport))} onChange={setSport} />
        <Filter label="Grup" value={team} options={choices(people.map((person) => person.team))} onChange={setTeam} />
        <Filter label="Ücret" value={fee} options={choices(people.map((person) => person.fee))} onChange={setFee} />
        <Filter label="Kayıt" value={since} options={choices(people.map((person) => person.since))} onChange={setSince} />
        <Filter
          label="Durum"
          value={status}
          options={choices(people.map((person) => person.status))}
          labelOf={(value) => statusLabel[value] ?? value}
          onChange={setStatus}
        />
        {filtered ? (
          <button type="button" className="admin-text-btn mb-2" onClick={clearFilters}>
            Filtreleri temizle
          </button>
        ) : null}
        <button
          type="button"
          className="btn-club"
          onClick={() => downloadXlsx("sporcular.xlsx", "Sporcular", [...athleteColumns], rows.map((person) => person.sheet))}
        >
          Excel indir
        </button>
      </div>
      <section className="admin-card">
        <div className="admin-card-body">
          {rows.length ? (
            <Table
              columns={["Çocuk", "Tür", "Veli", "Branş", "Grup", "Ücret", "Kayıt", "Süre", "Durum", ""]}
              rows={rows.map((person, index) => [
                <Link key={`${person.name}-${index}`} href={person.cardHref} className="font-semibold">{person.name}</Link>,
                person.enrollment,
                person.guardian || "—",
                person.sport,
                person.team,
                person.fee,
                person.since,
                person.years,
                <Tag key={`${person.name}-${index}-s`} tone={statusTone(person.status)}>{statusLabel[person.status] ?? person.status}</Tag>,
                <span key={`${person.name}-${index}-a`} className="flex flex-wrap gap-3">
                  <Link href={person.cardHref} className="admin-text-btn">Kart</Link>
                  {person.editHref ? <Link href={person.editHref} className="admin-text-btn">Düzelt</Link> : null}
                </span>,
              ])}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Bu aramada kayıt yok.</p>
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
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labelOf?: (value: string) => string;
}) {
  return (
    <label className="grid min-w-36 gap-1 text-sm">
      {label}
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Tümü</option>
        {options.map((option) => (
          <option key={option} value={option}>{labelOf ? labelOf(option) : option}</option>
        ))}
      </select>
    </label>
  );
}

export function SportSeasonField({
  sports,
}: {
  sports: { id: string; name: string; season: string }[];
}) {
  const [sportId, setSportId] = useState(sports[0]?.id ?? "");
  const season = sports.find((sport) => sport.id === sportId)?.season ?? "Sezon seçilmedi";
  return (
    <>
      <label className="grid gap-1 text-sm">
        Branş
        <select
          name="sportId"
          required
          className="field"
          value={sportId}
          onChange={(event) => setSportId(event.target.value)}
        >
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>{sport.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Sezon
        <input readOnly tabIndex={-1} value={season} className="field text-[var(--muted)]" />
        <span className="text-xs text-[var(--muted)]">Sezon, branş açılırken seçilir. Sezonu sistem yöneticisi açar.</span>
      </label>
    </>
  );
}

export function GroupBoard({
  groups,
}: {
  groups: {
    id: string;
    name: string;
    meta: string;
    kind: string;
    opened: boolean;
    people: { id: string; name: string; guardian: string; status: string }[];
  }[];
}) {
  const [q, setQ] = useState("");
  const needle = foldTr(q.trim());
  const visible = groups
    .map((group) => ({
      ...group,
      people: needle
        ? group.people.filter((person) => foldTr(`${person.name} ${person.guardian}`).includes(needle))
        : group.people,
    }))
    .filter((group) => !needle || group.people.length > 0);
  return (
    <>
      <label className="mt-4 grid max-w-xs gap-1 text-sm">
        İsim veya veli
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Yazdıkça süzülür"
          className="field"
        />
      </label>
      {needle && visible.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Bu aramada sporcu veya veli yok.</p>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visible.map((group) => (
          <section key={group.id} className="admin-card">
            <div className="admin-card-head">
              <h2>{group.name}</h2>
            </div>
            <div className="admin-card-body">
              <p className="text-sm text-[var(--muted)]">{group.meta}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag tone="club">{group.kind}</Tag>
                {group.opened ? <Tag>Bu kulüpte açıldı</Tag> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.people.map((person) => (
                  <Link key={person.id} href={`/sporcular/${person.id}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-sm">
                    <span className="font-semibold">{person.name}</span>
                    {person.guardian ? <span className="text-[var(--muted)]">{person.guardian}</span> : null}
                    <Tag tone={statusTone(person.status)}>{statusLabel[person.status] ?? person.status}</Tag>
                  </Link>
                ))}
                {group.people.length === 0 ? <span className="text-sm text-[var(--muted)]">Kadro boş</span> : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
