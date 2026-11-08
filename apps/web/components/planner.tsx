"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type Session = {
  id: string;
  facilityId: string;
  teamId?: string;
  sportId?: string;
  coachStaffId: string;
  coverStaffIds?: string[];
  title: string;
  date: string;
  start: string;
  end: string;
  kind: "training" | "class" | "match" | "private";
};

type Draft = {
  key: string;
  teamId: string;
  date: string;
  start: string;
  end: string;
  facilityId: string;
};

type DropResult = { ok: true; count: number } | { ok: false; error: string };

const hours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
const HOUR_PX = 56;
const GRID_START = 8 * 60;
const GRID_END = 22 * 60;
const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const salonTones = [
  { wash: "#e7eefc", ink: "#12245c", line: "#12245c" },
  { wash: "#fdecee", ink: "#9f2d2d", line: "#c8102e" },
  { wash: "#e5f6ee", ink: "#1b6b45", line: "#1b6b45" },
  { wash: "#fff3df", ink: "#8a5a12", line: "#c4841d" },
  { wash: "#f3eefe", ink: "#4c348b", line: "#4c348b" },
  { wash: "#e5f6f8", ink: "#0f5c6b", line: "#0f5c6b" },
  { wash: "#fdeee4", ink: "#8a3d12", line: "#c45c1d" },
  { wash: "#eef0f4", ink: "#3d465c", line: "#5c6b86" },
];

function salonTone(placeId: string, places: { id: string }[]) {
  const index = places.findIndex((place) => place.id === placeId);
  return salonTones[(index < 0 ? 0 : index) % salonTones.length];
}

export function Planner({
  day,
  view,
  today,
  canPlan,
  sessions,
  places,
  teams,
  sports,
  coaches,
  notices,
  placeDrops,
}: {
  day: string;
  view: "gun" | "hafta" | "ay";
  today: string;
  canPlan: boolean;
  sessions: Session[];
  places: { id: string; name: string }[];
  teams: { id: string; name: string; sportId?: string; sport?: string; coach?: string }[];
  sports?: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
  notices: string[];
  placeDrops?: (formData: FormData) => Promise<DropResult>;
}) {
  const [openFilters, setOpenFilters] = useState(true);
  const [salon, setSalon] = useState("");
  const [team, setTeam] = useState("");
  const [coach, setCoach] = useState("");
  const visiblePlaces = salon ? places.filter((place) => place.id === salon) : places;
  const visible = useMemo(
    () => sessions.filter((session) => {
      if (salon && session.facilityId !== salon) return false;
      if (team && session.teamId !== team) return false;
      if (coach && session.coachStaffId !== coach && !session.coverStaffIds?.includes(coach)) return false;
      return true;
    }),
    [sessions, salon, team, coach],
  );
  const month = monthCells(day);
  const href = (nextDay: string, nextView: string) => `/takvim?gun=${nextDay}&gorunum=${nextView}`;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["gun", "hafta", "ay"] as const).map((item) => (
          <Link key={item} href={href(day, item)} className={view === item ? "btn-club" : "admin-text-btn"}>
            {item === "gun" ? "Gün" : item === "hafta" ? "Hafta" : "Ay"}
          </Link>
        ))}
        <Link href={href(addDays(day, view === "ay" ? -30 : view === "hafta" ? -7 : -1), view)} className="admin-text-btn">Önceki</Link>
        <Link href={href(today, view)} className="admin-text-btn">Bugün</Link>
        <Link href={href(addDays(day, view === "ay" ? 30 : view === "hafta" ? 7 : 1), view)} className="admin-text-btn">Sonraki</Link>
        <button type="button" className="admin-text-btn" onClick={() => setOpenFilters((value) => !value)}>
          {openFilters ? "Filtreleri kapat" : "Filtreleri aç"}
        </button>
      </div>
      {openFilters ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Filter label="Salon" value={salon} onChange={setSalon} options={places} />
          <Filter label="Takım" value={team} onChange={setTeam} options={teams} />
          <Filter label="Antrenör" value={coach} onChange={setCoach} options={coaches} />
        </div>
      ) : null}
      <p className="mb-3 text-sm text-[var(--muted)]">
        {labelOf(day, view)} · {visible.length} kayıt · {visiblePlaces.length} salon. Hücreyi açmak kaydetmez.
      </p>
      {view === "gun" ? (
        <DayBoard day={day} today={today} canPlan={canPlan} sessions={visible} places={visiblePlaces} coaches={coaches} />
      ) : null}
      {view === "hafta" ? (
        <WeekBoard
          day={day}
          today={today}
          canPlan={canPlan}
          sessions={visible}
          places={places}
          teams={teams}
          sports={sports ?? []}
          coaches={coaches}
          placeDrops={placeDrops}
        />
      ) : null}
      {view === "ay" ? (
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((name) => <div key={name} className="px-2 text-xs uppercase text-[var(--muted)]">{name}</div>)}
          {month.map((date, index) => (
            <Link key={`${date}-${index}`} href={date ? href(date, "gun") : href(day, "ay")} className="min-h-20 rounded-xl border border-[var(--line)] bg-white p-2 text-sm">
              {date ? <span className="font-semibold">{Number(date.slice(8))}</span> : null}
              <div className="mt-1 text-xs text-[var(--muted)]">{date ? visible.filter((session) => session.date === date).length || "" : ""}</div>
            </Link>
          ))}
        </div>
      ) : null}
      {notices.length ? (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-semibold">Bildirime hazır</p>
          {notices.map((notice) => <p key={notice} className="mt-1 text-sm text-[var(--muted)]">{notice}</p>)}
        </div>
      ) : null}
    </div>
  );
}

function laterHour(start: string) {
  if (!/^\d{2}:\d{2}$/.test(start)) return "17:30";
  const [hour, minute] = start.split(":").map(Number);
  const total = Math.min(hour * 60 + minute + 90, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && otherStart < end;
}

function WeekBoard({
  day,
  today,
  canPlan,
  sessions,
  places,
  teams,
  sports,
  coaches,
  placeDrops,
}: {
  day: string;
  today: string;
  canPlan: boolean;
  sessions: Session[];
  places: { id: string; name: string }[];
  teams: { id: string; name: string; sportId?: string; sport?: string; coach?: string }[];
  sports: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
  placeDrops?: (formData: FormData) => Promise<DropResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sportId, setSportId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [over, setOver] = useState("");
  const [note, setNote] = useState("");
  const week = weekDates(day);
  const shownTeams = teams.filter((team) => !sportId || team.sportId === sportId);
  const shownSessions = sessions.filter((session) => (!sportId || session.sportId === sportId) && (!placeId || session.facilityId === placeId));
  const openDrafts = drafts.filter((draft) => shownTeams.some((team) => team.id === draft.teamId) && (!placeId || draft.facilityId === placeId));

  function dropTeam(date: string, hour: string, teamId: string) {
    if (!canPlan || date < today) {
      setNote("Geçmiş güne yazılmaz.");
      return;
    }
    const start = `${hour}:00`;
    setDrafts((current) => [
      ...current,
      { key: `${teamId}-${date}-${start}-${Date.now()}`, teamId, date, start, end: laterHour(start), facilityId: placeId || places[0]?.id || "" },
    ]);
    setNote("");
  }

  function save(rows: Draft[]) {
    if (!placeDrops || !rows.length) return;
    const data = new FormData();
    for (const row of rows) {
      data.append("teamId", row.teamId);
      data.append("date", row.date);
      data.append("start", row.start);
      data.append("end", row.end);
      data.append("facilityId", row.facilityId);
    }
    startTransition(async () => {
      const result = await placeDrops(data);
      if (!result.ok) {
        setNote(result.error);
        return;
      }
      const keys = new Set(rows.map((row) => row.key));
      setDrafts((current) => current.filter((row) => !keys.has(row.key)));
      setNote(result.count === 1 ? "Bu saat kaydedildi. Antrenör ve kadro kendi takviminde görür." : `${result.count} antrenman kaydedildi. Antrenör ve kadro kendi takviminde görür.`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={!sportId ? "btn-club" : "btn-line"} onClick={() => setSportId("")}>Tümü</button>
        {sports.map((sport) => (
          <button key={sport.id} type="button" className={sportId === sport.id ? "btn-club" : "btn-line"} onClick={() => setSportId(sport.id)}>{sport.name}</button>
        ))}
      </div>
      {note ? <p className="rounded-2xl bg-[#e7ecf8] px-4 py-3 text-sm text-[var(--heading)]">{note}</p> : null}
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-3">
          <h2 className="text-sm font-semibold text-[var(--heading)]">Gruplar</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Günü saatine sürükle. Pencere üstte açılır.</p>
          <div className="mt-3 grid gap-2">
            {shownTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                draggable={canPlan}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", team.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="cursor-grab rounded-xl border border-[var(--line)] bg-[var(--club-soft)] px-3 py-2 text-left text-sm font-semibold text-[var(--heading)]"
              >
                {team.name}
                <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{[team.sport, team.coach].filter(Boolean).join(" · ")}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
          <div className="min-w-[1140px]">
            <div className="grid border-b border-[var(--line)]" style={{ gridTemplateColumns: "76px repeat(7, minmax(150px, 1fr))" }}>
              <div />
              {week.map((date, index) => (
                <div key={date} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{dayNames[index]} {date.slice(8)}</div>
              ))}
            </div>
            <WeekColumns
              week={week}
              today={today}
              canPlan={canPlan}
              sessions={shownSessions}
              drafts={openDrafts}
              places={places}
              teams={teams}
              coaches={coaches}
              over={over}
              setOver={setOver}
              dropTeam={dropTeam}
            />
          </div>
        </div>
        <section className="rounded-2xl border border-[var(--line)] bg-white p-3">
          <h2 className="text-sm font-semibold text-[var(--heading)]">Salonlar</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Önce hepsi. Birine basınca yalnız o salon kalır.</p>
          <div className="mt-3 grid gap-2">
            <button type="button" className={!placeId ? "btn-club" : "btn-line"} onClick={() => setPlaceId("")}>Tümü</button>
            {places.map((place) => {
              const tone = salonTone(place.id, places);
              const on = placeId === place.id;
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => setPlaceId(place.id)}
                  className="rounded-xl border px-3 py-2 text-left text-sm font-semibold break-words"
                  style={{ background: tone.wash, color: tone.ink, borderColor: tone.line, boxShadow: on ? `inset 0 0 0 2px ${tone.line}` : undefined }}
                >
                  {place.name}
                </button>
              );
            })}
          </div>
        </section>
      </div>
      {openDrafts.length ? (
        <DropDialog
          drafts={openDrafts}
          sessions={sessions}
          places={places}
          teams={teams}
          sports={sports}
          pending={pending}
          note={note}
          onClose={() => setDrafts([])}
          onChange={(key, patch) => setDrafts((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item))}
          onRemove={(key) => setDrafts((current) => current.filter((item) => item.key !== key))}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Tümü</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function DayBoard({
  day,
  today,
  canPlan,
  sessions,
  places,
  coaches,
}: {
  day: string;
  today: string;
  canPlan: boolean;
  sessions: Session[];
  places: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
}) {
  const past = day < today;
  const columns = Math.max(places.length, 1);
  const laid = places.map((place) => placeCards(sessions.filter((session) => session.date === day && session.facilityId === place.id).map((session) => ({ key: session.id, start: session.start, end: session.end }))));
  const columnHeight = columnExtent(laid);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
      <div style={{ minWidth: 180 + columns * 180 }}>
        <div className="grid border-b border-[var(--line)]" style={{ gridTemplateColumns: `76px repeat(${columns}, minmax(180px, 1fr))` }}>
          <div />
          {places.map((place) => {
            const tone = salonTone(place.id, places);
            return <div key={place.id} className="px-2 py-2 text-xs font-semibold" style={{ color: tone.ink, boxShadow: `inset 0 -3px 0 ${tone.line}` }}>{place.name}</div>;
          })}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `76px repeat(${columns}, minmax(180px, 1fr))` }}>
          <HourGutter height={columnHeight} marks={minuteMarks(sessions.filter((session) => session.date === day))} />
          {places.map((place, index) => {
            const here = sessions.filter((session) => session.date === day && session.facilityId === place.id);
            const cards = laid[index];
            return (
              <div key={place.id} className="relative border-l border-[var(--line)]" style={{ height: columnHeight }}>
                <HourLines />
                {here.map((session) => {
                  const box = cards.get(session.id);
                  return box ? <TimeCard key={session.id} session={session} view="gun" places={places} coaches={coaches} box={box} /> : null;
                })}
                {canPlan && !past ? hours.map((hour, hourIndex) => (
                  <Link key={hour} href={`/takvim?ayar=yeni&gun=${day}&saat=${hour}:00&salon=${place.id}&gorunum=gun`} className="absolute right-1 z-0 text-[11px] text-[var(--muted)]" style={{ top: hourIndex * HOUR_PX + 2 }}>Yerleştir</Link>
                )) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekColumns({
  week,
  today,
  canPlan,
  sessions,
  drafts,
  places,
  teams,
  coaches,
  over,
  setOver,
  dropTeam,
}: {
  week: string[];
  today: string;
  canPlan: boolean;
  sessions: Session[];
  drafts: Draft[];
  places: { id: string; name: string }[];
  teams: { id: string; name: string; coach?: string }[];
  coaches: { id: string; name: string }[];
  over: string;
  setOver: (next: string | ((current: string) => string)) => void;
  dropTeam: (date: string, hour: string, teamId: string) => void;
}) {
  const laid = week.map((date) => placeCards(sessions.filter((session) => session.date === date).map((session) => ({ key: session.id, start: session.start, end: session.end }))));
  const columnHeight = columnExtent(laid);
  return (
    <div className="grid" style={{ gridTemplateColumns: "76px repeat(7, minmax(150px, 1fr))" }}>
      <HourGutter height={columnHeight} marks={minuteMarks([...sessions, ...drafts])} />
      {week.map((date, index) => {
        const here = sessions.filter((session) => session.date === date);
        const cards = laid[index];
        return (
          <div
            key={date}
            onDragOver={(event) => {
              if (!canPlan || date < today) return;
              event.preventDefault();
              setOver(`${date}-${hourAt(event.currentTarget, event.clientY)}`);
            }}
            onDragLeave={() => setOver((current) => current.startsWith(`${date}-`) ? "" : current)}
            onDrop={(event) => {
              event.preventDefault();
              const hour = hourAt(event.currentTarget, event.clientY);
              setOver("");
              dropTeam(date, hour, event.dataTransfer.getData("text/plain"));
            }}
            className="relative border-l border-[var(--line)]"
            style={{ height: columnHeight }}
          >
            <HourLines hot={over.startsWith(`${date}-`) ? over.slice(date.length + 1) : ""} />
            {here.map((session) => {
              const box = cards.get(session.id);
              return box ? <TimeCard key={session.id} session={session} view="hafta" places={places} coaches={coaches} box={box} /> : null;
            })}
            {drafts.filter((draft) => draft.date === date).map((draft) => {
              const team = teams.find((item) => item.id === draft.teamId);
              const tone = salonTone(draft.facilityId, places);
              const box = spanBox(draft.start, draft.end);
              return (
                <div key={draft.key} className="pointer-events-none absolute z-[2] overflow-hidden rounded-lg border border-dashed px-2 py-1 text-[11px] font-semibold leading-4" style={{ top: box.top, height: Math.max(box.height, 28), left: 10, right: 4, borderColor: tone.line, background: `${tone.wash}ee`, color: tone.ink }}>
                  <span className="block truncate">{draft.start}–{draft.end}</span>
                  <span className="block truncate">{team?.name}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const TICKS = [1, 2, 3, 4, 5];
const CARD_STACK = 48;

function HourGutter({ height, marks }: { height: number; marks: string[] }) {
  const labeled = new Set(marks);
  return (
    <div className="relative" style={{ height }}>
      {hours.map((hour, index) => (
        <div key={hour}>
          <div className="absolute right-3 text-[11px] font-medium leading-none text-[var(--muted)]" style={{ top: index * HOUR_PX + 2 }}>{hour}:00</div>
          {TICKS.map((step) => {
            const stamp = `${hour}:${String(step * 10).padStart(2, "0")}`;
            const on = labeled.has(stamp);
            return <div key={step} className="absolute right-0" style={{ top: index * HOUR_PX + (step * HOUR_PX) / 6, width: on ? 10 : step === 3 ? 8 : 5, height: 1, background: on ? "#12245c" : "#d5dce8" }} />;
          })}
        </div>
      ))}
      {marks.map((mark) => (
        <div key={mark} className="absolute right-3 text-[9px] font-semibold leading-none text-[var(--heading)]" style={{ top: ((minutesOf(mark) - GRID_START) / 60) * HOUR_PX, transform: "translateY(-50%)" }}>{mark}</div>
      ))}
    </div>
  );
}

function minuteMarks(rows: { start: string; end: string }[]) {
  const found = new Set<string>();
  for (const row of rows) {
    for (const value of [row.start, row.end]) {
      if (!/^\d{2}:\d{2}$/.test(value) || value.endsWith(":00")) continue;
      const minute = minutesOf(value);
      if (minute <= GRID_START || minute >= GRID_END) continue;
      found.add(value);
    }
  }
  return [...found].sort();
}

function HourLines({ hot = "" }: { hot?: string }) {
  return (
    <>
      {hours.map((hour, index) => (
        <div key={hour} className={`pointer-events-none absolute inset-x-0 ${hot === hour ? "bg-[var(--club-soft)]" : ""}`} style={{ top: index * HOUR_PX, height: HOUR_PX }}>
          <div className="absolute inset-x-0 top-0 border-t border-[var(--line)]" />
          {TICKS.map((step) => (
            <div key={step} className="absolute inset-x-0 border-t" style={{ top: (step * HOUR_PX) / 6, borderColor: step === 3 ? "#d5dce8" : "#eef2f7" }} />
          ))}
        </div>
      ))}
    </>
  );
}

function TimeCard({
  session,
  view,
  places,
  coaches,
  box,
}: {
  session: Session;
  view: string;
  places: { id: string; name: string }[];
  coaches: { id: string; name: string }[];
  box: { top: number; height: number; spineTop: number; spineHeight: number };
}) {
  const title = session.kind === "match" ? "Maç" : session.title;
  const salon = places.find((item) => item.id === session.facilityId)?.name;
  const coach = coaches.find((item) => item.id === session.coachStaffId)?.name;
  const tone = salonTone(session.facilityId, places);
  const detail = [coach, salon].filter(Boolean).join(" · ");
  return (
    <>
      <div className="pointer-events-none absolute z-[1] w-1 rounded-full" style={{ top: box.spineTop, height: box.spineHeight, left: 3, background: tone.line }} />
      <Link
        href={session.kind === "private" ? `/ozel-ders?ders=${session.id}` : `/takvim?ayar=${session.id}&gun=${session.date}&gorunum=${view}`}
        title={`${session.start}–${session.end} ${title}${detail ? ` · ${detail}` : ""}`}
        className="absolute z-[1] overflow-hidden rounded-lg px-2 py-1 text-[11px] font-semibold leading-4"
        style={{ top: box.top, height: box.height, left: 10, right: 4, background: tone.wash, color: tone.ink, boxShadow: `inset 0 0 0 1px ${tone.line}` }}
      >
        <span className="block truncate">{session.start}–{session.end}</span>
        <span className="block truncate">{session.kind === "private" ? `Özel · ${title}` : title}</span>
        {detail && box.height >= 58 ? <span className="block truncate font-normal">{detail}</span> : null}
      </Link>
    </>
  );
}

function DropDialog({
  drafts,
  sessions,
  places,
  teams,
  sports,
  pending,
  note,
  onClose,
  onChange,
  onRemove,
  onSave,
}: {
  drafts: Draft[];
  sessions: Session[];
  places: { id: string; name: string }[];
  teams: { id: string; name: string; sportId?: string; sport?: string; coach?: string }[];
  sports: { id: string; name: string }[];
  pending: boolean;
  note: string;
  onClose: () => void;
  onChange: (key: string, patch: Partial<Pick<Draft, "start" | "end" | "facilityId">>) => void;
  onRemove: (key: string) => void;
  onSave: (rows: Draft[]) => void;
}) {
  if (typeof document === "undefined") return null;
  const clashes = drafts.map((draft) => clashFor(draft, drafts, sessions, teams, sports));
  const blocked = clashes.some((clash) => clash.hard);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#101a42]/40 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="saat-pencere">
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="saat-pencere" className="text-lg font-semibold text-[var(--heading)]">Saati ve salonu yaz</h2>
          <button type="button" className="btn-line" onClick={onClose}>Vazgeç</button>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Pilates aynı salonda durabilir. Diğer branşlar aynı saatte aynı salona yazılmaz. Aynı takım iki salona yazılmaz.</p>
        {note ? <p className="mt-3 rounded-xl bg-[#f8e4e1] px-3 py-2 text-sm text-[#9f2d2d]">{note}</p> : null}
        <div className="mt-4 grid gap-4">
          {drafts.map((draft, index) => {
            const team = teams.find((item) => item.id === draft.teamId);
            const clash = clashes[index];
            return (
              <section key={draft.key} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="text-sm font-semibold text-[var(--heading)]">{dayLabel(draft.date)} · {team?.name}{team?.coach ? ` · ${team.coach}` : ""}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">Başlangıç
                    <input className="field" type="time" step={600} value={draft.start} onChange={(event) => onChange(draft.key, { start: event.target.value })} />
                  </label>
                  <label className="grid gap-1 text-sm">Bitiş
                    <input className="field" type="time" step={600} value={draft.end} onChange={(event) => onChange(draft.key, { end: event.target.value })} />
                  </label>
                </div>
                <label className="mt-3 grid gap-1 text-sm">Salon
                  <select className="field" value={draft.facilityId} onChange={(event) => onChange(draft.key, { facilityId: event.target.value })}>
                    {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                  </select>
                </label>
                {clash.hard ? <p className="mt-3 text-sm text-[#9f2d2d]">{clash.hard}</p> : null}
                {!clash.hard && clash.soft ? <p className="mt-3 text-sm text-[#8a5a12]">{clash.soft}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-club" disabled={pending || Boolean(clash.hard)} onClick={() => onSave([draft])}>Kaydet</button>
                  <button type="button" className="btn-line" onClick={() => onRemove(draft.key)}>Kaldır</button>
                </div>
              </section>
            );
          })}
        </div>
        {drafts.length > 1 ? (
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-club" disabled={pending || blocked} onClick={() => onSave(drafts)}>Tümünü kaydet</button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function minutesOf(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return GRID_START;
  return Number(match[1]) * 60 + Number(match[2]);
}

function spanBox(start: string, end: string) {
  const from = Math.max(GRID_START, Math.min(GRID_END - 15, minutesOf(start)));
  const to = Math.max(from + 15, Math.min(GRID_END, minutesOf(end) > minutesOf(start) ? minutesOf(end) : minutesOf(start) + 60));
  return {
    top: ((from - GRID_START) / 60) * HOUR_PX,
    height: ((to - from) / 60) * HOUR_PX,
  };
}

function hourAt(node: HTMLDivElement, clientY: number) {
  const top = node.getBoundingClientRect().top;
  const index = Math.min(hours.length - 1, Math.max(0, Math.floor((clientY - top) / HOUR_PX)));
  return hours[index];
}

function placeCards(items: { key: string; start: string; end: string }[]) {
  const sorted = [...items].sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end) || left.key.localeCompare(right.key));
  const placed: { key: string; top: number; height: number; spineTop: number; spineHeight: number }[] = [];
  for (const item of sorted) {
    const box = spanBox(item.start, item.end);
    let top = box.top;
    let height = box.height;
    const hits = () => placed.some((card) => top < card.top + card.height + 3 && top + height > card.top);
    if (hits()) {
      height = CARD_STACK;
      let guard = 0;
      while (hits() && guard < 24) {
        const hit = placed.filter((card) => top < card.top + card.height + 3 && top + height > card.top).sort((left, right) => right.top + right.height - (left.top + left.height))[0];
        if (!hit) break;
        top = hit.top + hit.height + 4;
        guard += 1;
      }
    }
    placed.push({ key: item.key, top, height, spineTop: box.top, spineHeight: box.height });
  }
  return new Map(placed.map((card) => [card.key, card]));
}

function columnExtent(laid: Map<string, { top: number; height: number }>[]) {
  const bottoms = laid.flatMap((cards) => [...cards.values()].map((card) => card.top + card.height + 12));
  return Math.max(hours.length * HOUR_PX, ...bottoms);
}

function isPilates(sportId: string | undefined, sportName: string | undefined, sports: { id: string; name: string }[]) {
  const name = sports.find((sport) => sport.id === sportId)?.name || sportName || "";
  return name.toLocaleLowerCase("tr-TR").includes("pilates");
}

function clashFor(
  draft: Draft,
  drafts: Draft[],
  sessions: Session[],
  teams: { id: string; name: string; sportId?: string; sport?: string }[],
  sports: { id: string; name: string }[],
) {
  const team = teams.find((item) => item.id === draft.teamId);
  if (!team) return { hard: "Grup bulunamadı.", soft: "" };
  if (draft.start >= draft.end) return { hard: "Bitiş, başlangıçtan sonra olur.", soft: "" };
  const pilates = isPilates(team.sportId, team.sport, sports);
  const spots = [
    ...sessions.filter((session) => session.date === draft.date).map((session) => ({
      teamId: session.teamId,
      facilityId: session.facilityId,
      start: session.start,
      end: session.end,
      title: session.title,
    })),
    ...drafts.filter((item) => item.key !== draft.key && item.date === draft.date).map((item) => ({
      teamId: item.teamId,
      facilityId: item.facilityId,
      start: item.start,
      end: item.end,
      title: teams.find((row) => row.id === item.teamId)?.name ?? "Grup",
    })),
  ].filter((spot) => overlaps(draft.start, draft.end, spot.start, spot.end));
  if (spots.some((spot) => spot.teamId && spot.teamId === draft.teamId)) return { hard: `${team.name} bu saatte zaten var.`, soft: "" };
  const salonHits = spots.filter((spot) => spot.facilityId === draft.facilityId);
  if (!salonHits.length) return { hard: "", soft: "" };
  const names = salonHits.map((spot) => spot.title).join(", ");
  if (!pilates) return { hard: `Bu saatte bu salonda ${names} var.`, soft: "" };
  return { hard: "", soft: `Bu salonda ${names} de var.` };
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${dayNames[(date.getDay() + 6) % 7]} ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}`;
}

function addDays(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekDates(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const offset = (date.getDay() + 6) % 7;
  const start = addDays(iso, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function monthCells(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: lead }, () => "");
  for (let day = 1; day <= days; day += 1) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7) cells.push("");
  return cells;
}

function labelOf(day: string, view: string) {
  if (view === "ay") return day.slice(0, 7);
  if (view === "hafta") return `${weekDates(day)[0]} – ${weekDates(day)[6]}`;
  return day;
}
