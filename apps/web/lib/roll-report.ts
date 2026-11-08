export type MarkStatus = "present" | "absent" | "excused";

export type ReportSession = {
  id: string;
  date: string;
  start: string;
  end: string;
  teamId: string;
  sportId: string;
  title: string;
  salon: string;
};

export type ReportPerson = {
  id: string;
  name: string;
  teamId?: string;
  sportId: string;
};

export type ReportPlayer = {
  personId: string;
  name: string;
  teamId: string;
  team: string;
  sportId: string;
  sport: string;
  sessions: number;
  present: number;
  absent: number;
  excused: number;
  pending: number;
  rate: number | null;
};

export type ReportRank = {
  name: string;
  rate: number;
  present: number;
  sessions: number;
};

export type ReportGroup = {
  id: string;
  name: string;
  sessions: number;
  players: number;
  present: number;
  slots: number;
  rate: number | null;
  most: ReportRank[];
  least: ReportRank[];
};

export type ReportDetail = {
  date: string;
  start: string;
  end: string;
  team: string;
  sport: string;
  salon: string;
  player: string;
  status: string;
};

export type RollReport = {
  players: ReportPlayer[];
  teams: ReportGroup[];
  sports: ReportGroup[];
  details: ReportDetail[];
};

export type ReportMode = "ay" | "hafta" | "gun" | "aralik";

export type ReportWindow = {
  mode: ReportMode;
  from: string;
  until: string;
  ay: string;
  gun: string;
  label: string;
};

const statusText: Record<MarkStatus | "pending", string> = {
  present: "Katıldı",
  absent: "Katılmadı",
  excused: "İzinli",
  pending: "İşaretlenmedi",
};

export function markText(status: MarkStatus | "pending") {
  return statusText[status];
}

export function rankText(rows: ReportRank[]) {
  if (!rows.length) return "—";
  return `${rows.map((row) => row.name).join(", ")} · %${rows[0].rate}`;
}

export function addIsoDays(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + count);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(ym: string, delta: number) {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthEnd(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

function weekBounds(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const start = addIsoDays(iso, -((date.getDay() + 6) % 7));
  return { from: start, until: addIsoDays(start, 6) };
}

function trDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function isoDay(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function isoMonth(value: string | undefined, today: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : today.slice(0, 7);
}

export function reportWindow(query: Record<string, string | undefined>, today: string): ReportWindow {
  const asked = query.donem === "hafta" || query.donem === "gun" || query.donem === "aralik" ? query.donem : "ay";
  if (asked === "gun") {
    const gun = isoDay(query.gun) || today;
    return { mode: "gun", from: gun, until: gun, ay: gun.slice(0, 7), gun, label: trDate(gun) };
  }
  if (asked === "hafta") {
    const gun = isoDay(query.gun) || today;
    const week = weekBounds(gun);
    return { mode: "hafta", from: week.from, until: week.until, ay: gun.slice(0, 7), gun, label: `${trDate(week.from)} – ${trDate(week.until)}` };
  }
  if (asked === "aralik") {
    let from = isoDay(query.bas);
    let until = isoDay(query.bit);
    if (from && until) {
      if (from > until) [from, until] = [until, from];
      return { mode: "aralik", from, until, ay: from.slice(0, 7), gun: from, label: from === until ? trDate(from) : `${trDate(from)} – ${trDate(until)}` };
    }
  }
  const ay = isoMonth(query.ay, today);
  const from = `${ay}-01`;
  const until = monthEnd(ay);
  return { mode: "ay", from, until, ay, gun: today, label: `${trDate(from)} – ${trDate(until)}` };
}

export function buildRollReport(input: {
  sessions: ReportSession[];
  people: ReportPerson[];
  teams: { id: string; name: string }[];
  sports: { id: string; name: string }[];
  marks: { sessionId: string; personId: string; status: MarkStatus }[];
}): RollReport {
  const sessions = [...input.sessions].sort((left, right) => left.date.localeCompare(right.date) || left.start.localeCompare(right.start));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const teamName = new Map(input.teams.map((team) => [team.id, team.name]));
  const sportName = new Map(input.sports.map((sport) => [sport.id, sport.name]));
  const bySession = new Map<string, Map<string, MarkStatus>>();
  for (const mark of input.marks) {
    if (!sessionIds.has(mark.sessionId)) continue;
    const bag = bySession.get(mark.sessionId) ?? new Map<string, MarkStatus>();
    bag.set(mark.personId, mark.status);
    bySession.set(mark.sessionId, bag);
  }
  const players: ReportPlayer[] = [];
  for (const person of input.people) {
    const markedTeam = sessions.find((session) => bySession.get(session.id)?.has(person.id))?.teamId;
    const teamId = person.teamId || markedTeam || "";
    if (!teamId) continue;
    const mine = sessions.filter((session) => session.teamId === teamId);
    let present = 0;
    let absent = 0;
    let excused = 0;
    let pending = 0;
    for (const session of mine) {
      const status = bySession.get(session.id)?.get(person.id);
      if (status === "present") present += 1;
      else if (status === "absent") absent += 1;
      else if (status === "excused") excused += 1;
      else pending += 1;
    }
    const sportId = sessions.find((session) => session.teamId === teamId)?.sportId || person.sportId;
    players.push({
      personId: person.id,
      name: person.name,
      teamId,
      team: teamName.get(teamId) || "Takım",
      sportId,
      sport: sportName.get(sportId) || "Branş",
      sessions: mine.length,
      present,
      absent,
      excused,
      pending,
      rate: mine.length ? Math.round((present / mine.length) * 100) : null,
    });
  }
  players.sort((left, right) => left.team.localeCompare(right.team, "tr") || (right.rate ?? -1) - (left.rate ?? -1) || left.name.localeCompare(right.name, "tr"));

  function extremes(rows: ReportPlayer[]) {
    const ranked = rows.filter((row) => row.sessions > 0 && row.rate != null);
    if (!ranked.length) return { most: [] as ReportRank[], least: [] as ReportRank[] };
    const best = Math.max(...ranked.map((row) => row.rate ?? 0));
    const worst = Math.min(...ranked.map((row) => row.rate ?? 0));
    const toRank = (row: ReportPlayer): ReportRank => ({ name: row.name, rate: row.rate ?? 0, present: row.present, sessions: row.sessions });
    return {
      most: ranked.filter((row) => row.rate === best).sort((left, right) => left.name.localeCompare(right.name, "tr")).map(toRank),
      least: ranked.filter((row) => row.rate === worst).sort((left, right) => left.name.localeCompare(right.name, "tr")).map(toRank),
    };
  }

  function groups(kind: "team" | "sport"): ReportGroup[] {
    const ids = new Set<string>();
    for (const player of players) ids.add(kind === "team" ? player.teamId : player.sportId);
    for (const session of sessions) ids.add(kind === "team" ? session.teamId : session.sportId);
    return [...ids].filter(Boolean).map((id) => {
      const rows = players.filter((player) => (kind === "team" ? player.teamId : player.sportId) === id);
      const ownSessions = sessions.filter((session) => (kind === "team" ? session.teamId : session.sportId) === id);
      const present = rows.reduce((sum, row) => sum + row.present, 0);
      const slots = rows.reduce((sum, row) => sum + row.sessions, 0);
      const ends = extremes(rows);
      const name = kind === "team" ? rows[0]?.team || teamName.get(id) || "Takım" : rows[0]?.sport || sportName.get(id) || "Branş";
      return {
        id,
        name,
        sessions: ownSessions.length,
        players: rows.length,
        present,
        slots,
        rate: slots ? Math.round((present / slots) * 100) : null,
        most: ends.most,
        least: ends.least,
      };
    }).sort((left, right) => left.name.localeCompare(right.name, "tr"));
  }

  const details: ReportDetail[] = [];
  for (const session of sessions) {
    const roster = players.filter((player) => player.teamId === session.teamId);
    for (const player of roster) {
      const status = bySession.get(session.id)?.get(player.personId) ?? "pending";
      details.push({
        date: session.date,
        start: session.start,
        end: session.end,
        team: player.team,
        sport: sportName.get(session.sportId) || player.sport,
        salon: session.salon,
        player: player.name,
        status: markText(status),
      });
    }
  }

  return { players, teams: groups("team"), sports: groups("sport"), details };
}
