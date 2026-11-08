import Link from "next/link";
import type { Club, Viewer } from "@skys/domain";
import { PageHeader, Panel, Table } from "@/components/bits";
import { ReportDownload } from "@/components/report-download";
import { addIsoDays, rankText, shiftMonth } from "@/lib/roll-report";
import { loadRollReport, reportSearch } from "@/lib/roll-report-data";

function keep(query: Record<string, string | undefined>, extra: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...extra })) {
    if (value) params.set(key, value);
  }
  return `/yoklama-raporu?${params.toString()}`;
}

function RateBar({ rate }: { rate: number | null }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eef2f7]">
      <div className="h-full rounded-full bg-[var(--club)]" style={{ width: `${rate ?? 0}%` }} />
    </div>
  );
}

export function RollReportScreen({ club, viewer, query }: { club: Club; viewer: Viewer; query: Record<string, string | undefined> }) {
  const { window, report, teams, sports, takim, brans } = loadRollReport(club.id, viewer, query);
  const modes = [
    ["ay", "Ay"],
    ["hafta", "Hafta"],
    ["gun", "Gün"],
    ["aralik", "Aralık"],
  ] as const;
  const back = window.mode === "ay"
    ? keep(query, { donem: "ay", ay: shiftMonth(window.ay, -1) })
    : keep(query, { donem: window.mode, gun: addIsoDays(window.gun, window.mode === "hafta" ? -7 : -1) });
  const next = window.mode === "ay"
    ? keep(query, { donem: "ay", ay: shiftMonth(window.ay, 1) })
    : keep(query, { donem: window.mode, gun: addIsoDays(window.gun, window.mode === "hafta" ? 7 : 1) });
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Yoklama raporu" description="Aralık yazılmazsa ay gelir. Hafta ve gün ayrıca açılır. Katılım sayısı, işaretlenen gelişlerdir.">
        <ReportDownload search={reportSearch(window, takim, brans)} />
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {modes.map(([id, label]) => (
          <Link key={id} href={keep(query, { donem: id })} className={window.mode === id ? "btn-club" : "btn-line"}>{label}</Link>
        ))}
        {window.mode === "aralik" ? null : <Link href={back} className="admin-text-btn">Önceki</Link>}
        {window.mode === "aralik" ? null : <Link href={next} className="admin-text-btn">Sonraki</Link>}
        <span className="text-sm text-[var(--muted)]">{window.label}</span>
      </div>
      <form method="get" className="mb-4 grid items-end gap-3 md:grid-cols-4">
        <input type="hidden" name="donem" value={window.mode} />
        <label className="grid gap-1 text-sm">Takım
          <select name="takim" defaultValue={takim} className="field">
            <option value="">Tümü</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Branş
          <select name="brans" defaultValue={brans} className="field">
            <option value="">Tümü</option>
            {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
          </select>
        </label>
        {window.mode === "ay" ? (
          <label className="grid gap-1 text-sm">Ay
            <input name="ay" type="month" defaultValue={window.ay} className="field" />
          </label>
        ) : null}
        {window.mode === "hafta" || window.mode === "gun" ? (
          <label className="grid gap-1 text-sm">{window.mode === "hafta" ? "Haftanın günü" : "Gün"}
            <input name="gun" type="date" defaultValue={window.gun} className="field" />
          </label>
        ) : null}
        {window.mode === "aralik" ? (
          <>
            <label className="grid gap-1 text-sm">Başlangıç
              <input name="bas" type="date" defaultValue={query.bas ?? window.from} className="field" />
            </label>
            <label className="grid gap-1 text-sm">Bitiş
              <input name="bit" type="date" defaultValue={query.bit ?? window.until} className="field" />
            </label>
          </>
        ) : null}
        <button className="btn-line">Süz</button>
      </form>
      <p className="mb-4 text-sm text-[var(--muted)]">İşaretlenmeyen seans katılım sayısına yazılmaz. Oran, takımın bu aralıktaki seans sayısına göredir.</p>
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Panel title="Takım bazında">
          {report.teams.length ? report.teams.map((team) => (
            <article key={team.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{team.name}</span><span>{team.rate == null ? "—" : `%${team.rate}`}</span></div>
              <RateBar rate={team.rate} />
              <p className="mt-1 text-xs text-[var(--muted)]">{team.present} katılım · {team.sessions} seans · {team.players} sporcu</p>
              <p className="text-sm">En çok katılan: {rankText(team.most)}</p>
              <p className="text-sm">En az katılan: {rankText(team.least)}</p>
            </article>
          )) : <p className="text-sm text-[var(--muted)]">Bu aralıkta takım seansı yok.</p>}
        </Panel>
        <Panel title="Branş bazında">
          {report.sports.length ? report.sports.map((sport) => (
            <article key={sport.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{sport.name}</span><span>{sport.rate == null ? "—" : `%${sport.rate}`}</span></div>
              <RateBar rate={sport.rate} />
              <p className="mt-1 text-xs text-[var(--muted)]">{sport.present} katılım · {sport.sessions} seans · {sport.players} sporcu</p>
              <p className="text-sm">En çok katılan: {rankText(sport.most)}</p>
              <p className="text-sm">En az katılan: {rankText(sport.least)}</p>
            </article>
          )) : <p className="text-sm text-[var(--muted)]">Bu aralıkta branş seansı yok.</p>}
        </Panel>
      </div>
      <div className="grid gap-4">
        {report.teams.map((team) => {
          const rows = report.players.filter((player) => player.teamId === team.id);
          return (
            <Panel key={team.id} title={team.name}>
              {rows.length ? (
                <Table
                  columns={["Sporcu", "Seans", "Katılım", "Katılmadı", "İzinli", "Bekleyen", "Oran"]}
                  rows={rows.map((player) => [
                    player.name,
                    String(player.sessions),
                    String(player.present),
                    String(player.absent),
                    String(player.excused),
                    String(player.pending),
                    player.rate == null ? "—" : `%${player.rate}`,
                  ])}
                />
              ) : <p className="text-sm text-[var(--muted)]">Bu takımda sporcu yok.</p>}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
