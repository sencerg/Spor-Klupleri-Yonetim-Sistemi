"use client";

import Link from "next/link";
import { useState } from "react";

type Session = {
  id: string;
  facilityId: string;
  sportId: string;
  title: string;
  date: string;
  start: string;
  coach: string;
  salon: string;
  taken: boolean;
};

const hours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
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

function addDays(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekDates(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const start = addDays(iso, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function RollWeek({
  day,
  today,
  sessions,
  places,
  sports,
}: {
  day: string;
  today: string;
  sessions: Session[];
  places: { id: string; name: string }[];
  sports: { id: string; name: string }[];
}) {
  const [sportId, setSportId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const week = weekDates(day);
  const shown = sessions.filter((session) => (!sportId || session.sportId === sportId) && (!placeId || session.facilityId === placeId));
  const href = (next: string) => `/yoklama?gun=${next}`;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(addDays(day, -7))} className="admin-text-btn">Önceki</Link>
        <Link href={href(today)} className="admin-text-btn">Bugün</Link>
        <Link href={href(addDays(day, 7))} className="admin-text-btn">Sonraki</Link>
        <span className="text-sm text-[var(--muted)]">{week[0]} – {week[6]}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={!sportId ? "btn-club" : "btn-line"} onClick={() => setSportId("")}>Tümü</button>
        {sports.map((sport) => (
          <button key={sport.id} type="button" className={sportId === sport.id ? "btn-club" : "btn-line"} onClick={() => setSportId(sport.id)}>{sport.name}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={!placeId ? "btn-club" : "btn-line"} onClick={() => setPlaceId("")}>Tüm salonlar</button>
        {places.map((place) => {
          const tone = salonTone(place.id, places);
          const on = placeId === place.id;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => setPlaceId(place.id)}
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold"
              style={{ background: tone.wash, color: tone.ink, borderColor: tone.line, boxShadow: on ? `inset 0 0 0 2px ${tone.line}` : undefined }}
            >
              {place.name}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-2 py-2">Saat</th>
              {week.map((date, index) => <th key={date} className="px-2 py-2">{dayNames[index]} {date.slice(8)}</th>)}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour} className="border-t border-[var(--line)]">
                <td className="px-2 py-2 text-[var(--muted)]">{hour}:00</td>
                {week.map((date) => {
                  const here = shown.filter((session) => session.date === date && session.start.slice(0, 2) === hour);
                  return (
                    <td key={`${date}-${hour}`} className="min-w-28 px-1.5 py-1.5 align-top">
                      <div className="grid gap-1">
                        {here.map((session) => {
                          const tone = salonTone(session.facilityId, places);
                          return (
                            <Link
                              key={session.id}
                              href={`/yoklama?seans=${session.id}&gun=${day}`}
                              className="block rounded-xl px-2 py-1.5 text-xs font-semibold"
                              style={{ background: tone.wash, color: tone.ink, boxShadow: `inset 3px 0 0 ${tone.line}` }}
                            >
                              {session.start} {session.title}
                              <span className="mt-0.5 block font-normal">{session.coach}</span>
                              <span className="mt-0.5 block font-normal">{session.salon}</span>
                              <span className="mt-1 block underline">Yoklama al</span>
                              {session.taken ? <span className="block font-normal">Alındı</span> : null}
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
