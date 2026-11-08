import type { ReactNode } from "react";

export function ClubMark({
  name,
  monogram,
  logo,
  accent,
  size = "md",
}: {
  name: string;
  monogram: string;
  logo?: string;
  accent?: string;
  size?: "sm" | "md" | "lg";
}) {
  const logoClass = size === "sm" ? "admin-logo admin-logo-sm" : size === "lg" ? "admin-logo admin-logo-lg" : "admin-logo";
  const markClass = size === "sm" ? "admin-mark admin-mark-sm" : size === "lg" ? "admin-mark admin-mark-lg" : "admin-mark";
  if (logo) return <img src={logo} alt={name} className={logoClass} />;
  return (
    <span className={markClass} style={accent ? { background: accent } : undefined} aria-hidden>
      {monogram}
    </span>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  mark,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  mark?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {mark}
        <div className="min-w-0">
          {kicker ? <div className="page-kicker">{kicker}</div> : null}
          <h1 className="page-title mt-1">{title}</h1>
          {description ? <p className="page-subtitle">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="admin-card">
      {title ? (
        <div className="admin-card-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="admin-card-body">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
  soft?: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--club)" }} />
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-hint">{hint}</div>
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "club";
}) {
  const tones = {
    neutral: "bg-[#eef1f7] text-[#475569]",
    good: "bg-[#dcfce7] text-[#166534]",
    warn: "bg-[#fef3c7] text-[#92400e]",
    bad: "bg-[#fee2e2] text-[#991b1b]",
    club: "bg-[var(--club-soft)] text-[var(--ink)]",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
  );
}

export function NoAccess({ label }: { label: string }) {
  return (
    <Panel>
      <h1 className="page-title">Bu ekran kapalı</h1>
      <p className="page-subtitle">
        {label} rolünüzün ekran yetkisinde yok. Kulüp sahibi, ekran yetkileri matrisinden açabilir.
      </p>
    </Panel>
  );
}

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function statusTone(status: string) {
  if (status === "paid" || status === "active" || status === "present" || status === "sent" || status === "completed") {
    return "good" as const;
  }
  if (status === "overdue" || status === "absent" || status === "retrying" || status === "trial") return "bad" as const;
  if (status === "partial" || status === "open" || status === "excused" || status === "paused" || status === "waitlist") {
    return "warn" as const;
  }
  return "neutral" as const;
}

export const statusLabel: Record<string, string> = {
  paid: "Ödendi",
  partial: "Kısmi",
  overdue: "Gecikti",
  open: "Açık",
  active: "Aktif",
  paused: "Ara verdi",
  trial: "Deneme dersi",
  left: "Ayrıldı",
  present: "Katıldı",
  absent: "Katılmadı",
  excused: "İzinli",
  pending: "Bekliyor",
  sent: "İletildi",
  retrying: "Yeniden denenecek",
  completed: "Tamam",
  booked: "Rezerve",
  waitlist: "Beklemede",
  athlete: "Sporcu",
  member: "Üye",
};
