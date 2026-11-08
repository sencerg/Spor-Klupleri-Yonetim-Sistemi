"use client";

import { useState } from "react";

type Coach = { id: string; name: string };
type Price = { id: string; name: string; coachStaffId: string; amountLabel: string };
type Person = { id: string; name: string };
type Team = { id: string; name: string };
type Place = { id: string; name: string };

export function PrivateLessonForm({
  mode,
  coaches,
  prices,
  people,
  teams,
  places,
  today,
  action,
  initial,
}: {
  mode: "request" | "place";
  coaches: Coach[];
  prices: Price[];
  people: Person[];
  teams: Team[];
  places: Place[];
  today: string;
  action: (formData: FormData) => void;
  initial?: {
    id?: string;
    personId?: string;
    title?: string;
    coachStaffId?: string;
    priceId?: string;
    teamId?: string;
    facilityId?: string;
    date?: string;
    start?: string;
    end?: string;
    note?: string;
  };
}) {
  const [coachId, setCoachId] = useState(initial?.coachStaffId || coaches[0]?.id || "");
  const mine = prices.filter((price) => price.coachStaffId === coachId);
  const [priceId, setPriceId] = useState(mine.some((price) => price.id === initial?.priceId) ? initial?.priceId ?? "" : mine[0]?.id ?? "");
  const formId = mode === "request" ? "ozel-talep" : "ozel-ders";
  const lessonForm = initial?.id || "yeni";

  function pickCoach(next: string) {
    setCoachId(next);
    const rows = prices.filter((price) => price.coachStaffId === next);
    setPriceId(rows[0]?.id ?? "");
  }

  return (
    <form id={formId} action={action} className="grid gap-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {mode === "request" ? <input type="hidden" name="talepForm" value="1" /> : <input type="hidden" name="lessonForm" value={lessonForm} />}
      {mode === "place" ? <input type="hidden" name="yerlestir" value="1" /> : null}
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-[var(--heading)]">Ders</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Ders adı
            <input name="title" required defaultValue={initial?.title} placeholder="Bireysel şut" className="field" />
          </label>
          <label className="grid gap-1 text-sm">
            Sporcu
            <select name="personId" required className="field" defaultValue={initial?.personId ?? people[0]?.id}>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        </div>
      </section>
      <section className="grid gap-3 border-t border-[var(--line)] pt-4">
        <h2 className="text-sm font-semibold text-[var(--heading)]">Hoca ve ücret</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Hoca
            <select name="coachStaffId" required className="field" value={coachId} onChange={(event) => pickCoach(event.target.value)}>
              {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Ücret
            <select name="priceId" required className="field" value={priceId} onChange={(event) => setPriceId(event.target.value)} disabled={!mine.length}>
              {mine.map((price) => <option key={price.id} value={price.id}>{price.name} · {price.amountLabel}</option>)}
            </select>
          </label>
        </div>
        {!mine.length ? <p className="text-sm text-[#9f2d2d]">Bu hoca için ücret yok. Önce ücret eklenir.</p> : null}
      </section>
      {mode === "place" ? (
        <>
          <section className="grid gap-3 border-t border-[var(--line)] pt-4">
            <h2 className="text-sm font-semibold text-[var(--heading)]">Yer</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Grup
                <select name="teamId" className="field" defaultValue={initial?.teamId ?? ""}>
                  <option value="">Grup yok</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Salon
                <select name="facilityId" required className="field" defaultValue={initial?.facilityId ?? places[0]?.id}>
                  {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </select>
              </label>
            </div>
          </section>
          <section className="grid gap-3 border-t border-[var(--line)] pt-4">
            <h2 className="text-sm font-semibold text-[var(--heading)]">Saat</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Tarih
                <input name="date" type="date" required min={today} defaultValue={initial?.date || today} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Başlangıç
                <input name="start" type="time" required step={600} defaultValue={initial?.start || "18:00"} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Bitiş
                <input name="end" type="time" required step={600} defaultValue={initial?.end || "19:00"} className="field" />
              </label>
            </div>
          </section>
        </>
      ) : (
        <input type="hidden" name="teamId" value={initial?.teamId ?? ""} />
      )}
      <label className="grid gap-1 border-t border-[var(--line)] pt-4 text-sm">
        Not
        <textarea name="note" rows={3} maxLength={240} defaultValue={initial?.note} placeholder="Veli notu, istenen saat" className="field" />
      </label>
    </form>
  );
}
