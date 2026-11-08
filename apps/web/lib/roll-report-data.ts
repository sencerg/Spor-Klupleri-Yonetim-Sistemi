import { attendance, todayISO, type Viewer } from "@skys/domain";
import { directory, facilityName, listPeople, listSports, listTeams, listTrainings } from "@/lib/live";
import { xlsxSheets } from "@/lib/xlsx";
import { buildRollReport, reportWindow, type MarkStatus } from "@/lib/roll-report";

export function loadRollReport(clubId: string, viewer: Viewer, query: Record<string, string | undefined>) {
  const window = reportWindow(query, todayISO);
  const takim = query.takim ?? "";
  const brans = query.brans ?? "";
  const sessions = listTrainings(clubId, viewer).filter((session) => session.kind === "training" && session.date >= window.from && session.date <= window.until && (!takim || session.teamId === takim) && (!brans || session.sportId === brans));
  const extra = directory().rollMarks ?? [];
  const covered = new Set(extra.map((mark) => `${mark.sessionId}:${mark.personId}`));
  const marks = [
    ...attendance.filter((mark) => !covered.has(`${mark.sessionId}:${mark.personId}`)),
    ...extra,
  ].filter((mark): mark is { sessionId: string; personId: string; status: MarkStatus } => mark.status === "present" || mark.status === "absent" || mark.status === "excused");
  const seen = new Set(sessions.map((session) => session.id));
  const marked = new Set(marks.filter((mark) => seen.has(mark.sessionId)).map((mark) => mark.personId));
  const people = listPeople(clubId, viewer).filter((person) => {
    if (person.kind !== "athlete" || person.status === "left") return false;
    if (!person.teamId && !marked.has(person.id)) return false;
    if (takim && person.teamId !== takim && !marked.has(person.id)) return false;
    if (brans && person.sportId !== brans && !marked.has(person.id)) return false;
    return true;
  });
  const teams = listTeams(clubId, viewer);
  const sports = listSports(clubId);
  const report = buildRollReport({
    sessions: sessions.map((session) => ({
      id: session.id,
      date: session.date,
      start: session.start,
      end: session.end,
      teamId: session.teamId || "",
      sportId: session.sportId,
      title: session.title,
      salon: facilityName(session.facilityId),
    })),
    people: people.map((person) => ({ id: person.id, name: person.name, teamId: person.teamId, sportId: person.sportId })),
    teams: teams.map((team) => ({ id: team.id, name: team.name })),
    sports: sports.map((sport) => ({ id: sport.id, name: sport.name })),
    marks,
  });
  return { window, report, teams, sports, takim, brans };
}

export function rollWorkbook(report: ReturnType<typeof buildRollReport>, from: string, until: string) {
  const rate = (value: number | null) => value ?? "";
  return xlsxSheets([
    {
      name: "Takımlar",
      headers: ["Başlangıç", "Bitiş", "Takım", "Seans", "Sporcu", "Katılım sayısı", "Oran", "En çok katılan", "En az katılan"],
      rows: report.teams.map((team) => [from, until, team.name, team.sessions, team.players, team.present, rate(team.rate), team.most.map((item) => item.name).join(", "), team.least.map((item) => item.name).join(", ")]),
    },
    {
      name: "Branşlar",
      headers: ["Başlangıç", "Bitiş", "Branş", "Seans", "Sporcu", "Katılım sayısı", "Oran", "En çok katılan", "En az katılan"],
      rows: report.sports.map((sport) => [from, until, sport.name, sport.sessions, sport.players, sport.present, rate(sport.rate), sport.most.map((item) => item.name).join(", "), sport.least.map((item) => item.name).join(", ")]),
    },
    {
      name: "Oyuncular",
      headers: ["Başlangıç", "Bitiş", "Takım", "Branş", "Sporcu", "Seans sayısı", "Katılım sayısı", "Katılmadı", "İzinli", "İşaretlenmedi", "Oran"],
      rows: report.players.map((player) => [from, until, player.team, player.sport, player.name, player.sessions, player.present, player.absent, player.excused, player.pending, rate(player.rate)]),
    },
    {
      name: "Seanslar",
      headers: ["Tarih", "Başlangıç", "Bitiş", "Takım", "Branş", "Salon", "Sporcu", "Durum"],
      rows: report.details.map((row) => [row.date, row.start, row.end, row.team, row.sport, row.salon, row.player, row.status]),
    },
  ]);
}

export function reportSearch(window: { mode: string; ay: string; gun: string; from: string; until: string }, takim: string, brans: string) {
  const params = new URLSearchParams({ donem: window.mode, ay: window.ay, gun: window.gun, takim, brans });
  if (window.mode === "aralik") {
    params.set("bas", window.from);
    params.set("bit", window.until);
  }
  return params.toString();
}
