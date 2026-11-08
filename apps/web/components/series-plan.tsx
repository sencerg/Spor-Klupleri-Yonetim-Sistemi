"use client";

import { useMemo, useState, type FormEvent } from "react";

const dayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type Session = {
  id: string;
  date: string;
  start: string;
  end: string;
  facilityId: string;
  facilityName: string;
  teamId?: string;
  teamName: string;
  coachStaffId: string;
  coachName: string;
};

type Team = { id: string; name: string; coachStaffId: string; coachName: string };
type Place = { id: string; name: string };

function addDays(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekday(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(year, month - 1, day).getDay() + 6) % 7 + 1;
}

function monthEnd(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return minutes(start) < minutes(otherEnd) && minutes(otherStart) < minutes(end);
}

function pretty(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}

function dayDistance(from: string, to: string) {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
}

function shortPlace(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

function programOf(sessions: Session[], teamId: string, today: string) {
  const upcoming = sessions
    .filter((session) => session.teamId === teamId && session.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date) || left.start.localeCompare(right.start));
  const salons: Record<number, string> = {};
  const days: number[] = [];
  let start = "";
  let end = "";
  for (const session of upcoming) {
    const day = weekday(session.date);
    if (salons[day]) continue;
    salons[day] = session.facilityId;
    days.push(day);
    if (!start) {
      start = session.start;
      end = session.end;
    }
  }
  days.sort((left, right) => left - right);
  return { first: upcoming[0]?.date ?? "", days, salons, start, end };
}

export function SeriesPlan({
  action,
  today,
  view,
  teams,
  places,
  sessions,
  pickedDate,
  initialStart,
  initialEnd,
  initialPlace,
  error,
}: {
  action: (formData: FormData) => void;
  today: string;
  view: string;
  teams: Team[];
  places: Place[];
  sessions: Session[];
  pickedDate?: string;
  initialStart: string;
  initialEnd: string;
  initialPlace?: string;
  error?: string;
}) {
  const fallbackPlace = initialPlace && places.some((place) => place.id === initialPlace) ? initialPlace : places[0]?.id ?? "";
  const opened = programOf(sessions, teams[0]?.id ?? "", today);
  const pickedDay = pickedDate && pickedDate >= today ? weekday(pickedDate) : 0;
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [start, setStart] = useState(opened.start || initialStart);
  const [end, setEnd] = useState(opened.end || initialEnd);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [days, setDays] = useState<number[]>(opened.days.length ? opened.days : pickedDay ? [pickedDay] : []);
  const [salons, setSalons] = useState<Record<number, string>>(opened.salons);
  const [blocked, setBlocked] = useState(false);
  const team = teams.find((item) => item.id === teamId);
  const program = programOf(sessions, teamId, today);
  const clockOk = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;
  const resolvedFrom = from || program.first || today;
  const placeFrom = resolvedFrom < today ? today : resolvedFrom;
  const placeUntil = until || monthEnd(placeFrom);
  const rangeOk = !until || until >= placeFrom;

  const slots = useMemo(() => {
    if (!clockOk || !rangeOk || !days.length) return [];
    const rows: { date: string; day: number; facilityId: string }[] = [];
    for (let date = placeFrom; date <= placeUntil; date = addDays(date, 1)) {
      const day = weekday(date);
      if (!days.includes(day)) continue;
      rows.push({ date, day, facilityId: salons[day] || fallbackPlace });
    }
    return rows;
  }, [clockOk, rangeOk, days, placeFrom, placeUntil, salons, fallbackPlace]);

  const clashes = useMemo(() => {
    if (!clockOk || !team) return [];
    return slots.flatMap((slot) => {
      const hit = sessions.find((session) => {
        if (session.date !== slot.date || !overlaps(start, end, session.start, session.end)) return false;
        const replaced = session.teamId === team.id && session.date >= placeFrom && session.date <= placeUntil && days.includes(weekday(session.date));
        if (replaced) return false;
        return session.facilityId === slot.facilityId || session.teamId === team.id || (Boolean(team.coachStaffId) && session.coachStaffId === team.coachStaffId);
      });
      return hit ? [{ ...slot, hit }] : [];
    });
  }, [clockOk, team, slots, sessions, start, end, placeFrom, placeUntil, days]);

  const warnings = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const clash of clashes) {
      const text = clashText(clash.hit, team?.name ?? "Bu grup", clash.facilityId);
      grouped.set(text, [...(grouped.get(text) ?? []), pretty(clash.date)]);
    }
    return [...grouped.entries()];
  }, [clashes, team?.name]);

  function chooseTeam(id: string) {
    const next = programOf(sessions, id, today);
    setTeamId(id);
    setBlocked(false);
    setFrom("");
    setUntil("");
    if (next.days.length) {
      setDays(next.days);
      setSalons(next.salons);
      if (next.start) setStart(next.start);
      if (next.end) setEnd(next.end);
      return;
    }
    setDays(pickedDay ? [pickedDay] : []);
    setSalons(pickedDay ? { [pickedDay]: fallbackPlace } : {});
  }

  function toggle(day: number) {
    setBlocked(false);
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((left, right) => left - right));
    setSalons((current) => current[day] ? current : { ...current, [day]: fallbackPlace });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const missingSalon = days.some((day) => !(salons[day] || fallbackPlace));
    if (!days.length || !clockOk || !rangeOk || clashes.length || !team || missingSalon) {
      event.preventDefault();
      setBlocked(true);
    }
  }

  if (!teams.length || !places.length) {
    return <p className="text-sm text-[var(--muted)]">Seri için bir takım ve bir salon gerekir.</p>;
  }

  const firstMonday = addDays(placeFrom, 1 - weekday(placeFrom));
  const rowCount = Math.floor(dayDistance(firstMonday, placeUntil) / 7) + 1;

  return (
    <form id="plan-kayit" action={action} className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="assign" value="team" />
      <input type="hidden" name="gorunum" value={view} />
      <input type="hidden" name="eksen" value="salon" />
      <input type="hidden" name="seri" value="1" />
      <section className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--heading)]">Grup</span>
          <select name="teamId" required className="field" value={teamId} onChange={(event) => chooseTeam(event.target.value)}>
            {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <p className="self-end text-sm text-[var(--muted)]">
          {program.first ? `Bu grubun ilk planı ${pretty(program.first)}. Günlerin salonu aşağıda durur.` : "Bu grubun planı yok. Gün seç, her güne salonunu yaz."}
        </p>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--heading)]">Başlangıç saati</span>
          <input name="start" type="time" required className="field" value={start} onChange={(event) => { setBlocked(false); setStart(event.target.value); }} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--heading)]">Bitiş saati</span>
          <input name="end" type="time" required className="field" value={end} onChange={(event) => { setBlocked(false); setEnd(event.target.value); }} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="flex h-5 items-center justify-between gap-2">
            <span className="font-semibold text-[var(--heading)]">Başlangıç</span>
            <span className="text-xs font-normal text-[var(--muted)]">İsteğe bağlı</span>
          </span>
          <input name="date" type="date" className="field" value={from} min={today} onChange={(event) => { setBlocked(false); setFrom(event.target.value); }} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="flex h-5 items-center justify-between gap-2">
            <span className="font-semibold text-[var(--heading)]">Bitiş</span>
            <span className="text-xs font-normal text-[var(--muted)]">İsteğe bağlı</span>
          </span>
          <input name="until" type="date" className="field" value={until} min={placeFrom} onChange={(event) => { setBlocked(false); setUntil(event.target.value); }} />
        </label>
      </section>
      <p className="text-sm text-[var(--muted)]">
        {!from && program.first ? `Başlangıç boş. İlk plan günü ${pretty(program.first)} kabul edilir.` : !from ? "Başlangıç boş. Bugünden yazılır." : resolvedFrom < today ? "Geçmiş durur. Bugünden itibaren yazılır." : `Başlangıç ${pretty(from)}.`}
        {" "}
        {!until ? `Bitiş boş. ${pretty(placeUntil)} tarihine kadar, değişiklik olana dek.` : `Bitiş ${pretty(until)}.`}
      </p>
      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--heading)]">Gün ve salon</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Bir gün bir salonda, başka gün başka salonda durabilir. Seçilen gün her hafta aynı saate yerleşir.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {dayLabels.map((label, index) => {
            const day = index + 1;
            const on = days.includes(day);
            const facilityId = salons[day] || fallbackPlace;
            const busy = on && clashes.some((clash) => clash.day === day);
            return (
              <div key={label} className={`grid gap-2 rounded-2xl border px-3 py-3 text-sm ${on && busy ? "border-[#9f2d2d] bg-[#f8e4e1]" : on ? "border-[var(--club)] bg-[var(--club-soft)]" : "border-[var(--line)] bg-white"}`}>
                <label className="grid cursor-pointer gap-1">
                  <input className="sr-only" type="checkbox" name="gun" value={day} checked={on} onChange={() => toggle(day)} />
                  <span className="font-semibold text-[var(--heading)]">{label}</span>
                  <span className="text-xs text-[var(--muted)]">{clockOk ? `${start}–${end}` : "Saat yaz"}</span>
                </label>
                {on ? (
                  <select name={`salon-${day}`} className="field" value={facilityId} onChange={(event) => { setBlocked(false); setSalons((current) => ({ ...current, [day]: event.target.value })); }}>
                    {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                  </select>
                ) : <span className="text-xs text-[var(--muted)]">Kapalı</span>}
              </div>
            );
          })}
        </div>
      </section>
      {clockOk && rangeOk && days.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-[var(--heading)]">Takvime yazılacak günler</h2>
          <div className="grid gap-2">
            {Array.from({ length: Math.max(rowCount, 1) }, (_, week) => (
              <div key={week} className="grid grid-cols-7 gap-1">
                {dayLabels.map((_, offset) => {
                  const date = addDays(firstMonday, week * 7 + offset);
                  const slot = slots.find((item) => item.date === date);
                  const clash = clashes.find((item) => item.date === date);
                  const place = places.find((item) => item.id === slot?.facilityId);
                  return (
                    <div key={date} className={`min-h-14 overflow-hidden rounded-xl px-1.5 py-1 text-[11px] leading-4 ${!slot ? "bg-[#f7f9fc] text-[#c5ceda]" : clash ? "bg-[#f8e4e1] text-[#9f2d2d]" : "bg-[var(--club-soft)] text-[var(--heading)]"}`}>
                      <div className="font-semibold">{pretty(date)}</div>
                      <div>{clash ? clash.hit.teamName : slot && place ? shortPlace(place.name) : ""}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {!clockOk ? <p className="rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bitiş saati, başlangıç saatinden sonra olur.</p> : null}
      {!rangeOk ? <p className="rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bitiş, başlangıçtan önce olamaz.</p> : null}
      {clashes.length || error === "cakisma" ? (
        <div className="grid gap-2 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          {warnings.length ? warnings.map(([text, when]) => (
            <p key={text}>{text} {when.slice(0, 6).join(", ")}{when.length > 6 ? "…" : ""}</p>
          )) : <p>Bu salonda aynı saatte kayıt var. Bu grup o saate yazılamaz.</p>}
        </div>
      ) : null}
      {blocked && !days.length ? <p className="rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Seri için en az bir gün seçilir.</p> : null}
      {clockOk && rangeOk && days.length && !clashes.length ? (
        <p className="text-sm text-[var(--muted)]">
          {team?.name} · {slots.length} antrenman · {days.map((day) => `${dayLabels[day - 1]} ${places.find((place) => place.id === (salons[day] || fallbackPlace))?.name ?? ""}`).join(" · ")}
        </p>
      ) : null}
    </form>
  );
}

function clashText(hit: Session, ourName: string, facilityId: string) {
  if (hit.facilityId === facilityId && hit.teamName && hit.teamName !== ourName) {
    return `${hit.teamName}, ${hit.facilityName} salonunda ${hit.start}–${hit.end} dolu. ${ourName} bu saate yazılamaz.`;
  }
  if (hit.teamName === ourName) {
    return `${ourName} bu saatte ${hit.facilityName} salonunda zaten var.`;
  }
  return `${hit.coachName} bu saatte ${hit.teamName || "başka bir işte"} dolu. ${ourName} bu saate yazılamaz.`;
}
