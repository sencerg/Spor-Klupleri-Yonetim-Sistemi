import Link from "next/link";
import {
  canCollect,
  duesForMonth,
  formatTry,
  monthLabel,
  monthsBetween,
  shiftMonth,
  todayISO,
  type Club,
  type MonthDue,
  type PayMethod,
  type Viewer,
} from "@skys/domain";
import { clearDueAmount, recordPayment, removePayment, setDueAmount } from "@/app/actions";
import { PageHeader, statusLabel, statusTone, Tag } from "@/components/bits";
import { DuesList } from "@/components/dues-list";
import { listPeople, nameOf, teamName } from "@/lib/live";
import { readState } from "@/lib/store";

const methods: { id: PayMethod; label: string }[] = [
  { id: "cash", label: "Nakit" },
  { id: "transfer", label: "Havale" },
  { id: "card", label: "Kart" },
];

export function DuesScreen({
  club,
  viewer,
  query,
}: {
  club: Club;
  viewer: Viewer;
  query: Record<string, string | undefined>;
}) {
  const state = readState();
  const people = listPeople(club.id, viewer).filter((person) => person.kind === "athlete");
  const current = todayISO.slice(0, 7);
  const earliest = people.reduce((min, person) => (person.since.slice(0, 7) < min ? person.since.slice(0, 7) : min), current);
  const latest = shiftMonth(current, 3);
  const months = monthsBetween(earliest, latest);
  const collect = canCollect(viewer, club.id);
  const opened = query.al;
  if (opened) {
    const month = months.includes(query.ay ?? "") ? query.ay! : current;
    const person = opened === "yeni" ? undefined : people.find((item) => item.id === opened);
    const due = person ? duesForMonth([person], month, todayISO, state.duePayments, state.dueOverrides)[0] : undefined;
    const confirming = state.duePayments.find((item) => item.id === query.sil && item.clubId === club.id && item.personId === person?.id);
    return (
      <div>
        <PageHeader
          kicker="İşletme"
          title={person ? nameOf(person.id) : "Aidat al"}
          description={person ? `${monthLabel(month)} aidatı burada yönetilir. Anlaşma tutarı otomatik gelir. Kısmi ödeme eklenebilir ve çıkarılabilir.` : "Sporcu ve ay seçilir. Tahsilat o sayfada yazılır."}
        >
          <Link href="/aidat" className="btn-club">Liste</Link>
        </PageHeader>
        <DueNotice query={query} />
        {person && due ? (
          <>
            {confirming ? (
              <form action={removePayment.bind(null, club.id, confirming.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
                <p>
                  <span className="font-semibold">{payDate(confirming.date)} {methodLabel(confirming.method)} {formatTry(confirming.amount)}</span> silinecek.
                </p>
                <div className="mt-3 flex gap-3">
                  <input type="hidden" name="personId" value={person.id} />
                  <input type="hidden" name="month" value={month} />
                  <Link href={manageHref(person.id, month)} className="admin-text-btn">Vazgeç</Link>
                  <button className="btn-club">Sil</button>
                </div>
              </form>
            ) : null}
            <AthleteDue row={due} clubId={club.id} collect={collect} today={todayISO} confirmingId={confirming?.id} />
          </>
        ) : (
          <section className="admin-card">
            <div className="admin-card-body">
              <form action="/aidat" className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Sporcu
                  <select name="al" required className="field" defaultValue="">
                    <option value="" disabled>Seç</option>
                    {people.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Ay
                  <select name="ay" className="field" defaultValue={month}>
                    {months.map((item) => (
                      <option key={item} value={item}>{monthLabel(item)}</option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
                  <button className="btn-club">Sayfayı aç</button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    );
  }

  const rows = months.flatMap((item) =>
    duesForMonth(people, item, todayISO, state.duePayments, state.dueOverrides).map((due) => ({
      name: nameOf(due.personId),
      team: teamName(due.teamId),
      month: monthLabel(item),
      monthKey: item,
      fee: due.billed || due.custom ? formatTry(due.amount) : "—",
      paid: formatTry(due.paid),
      remaining: due.billed ? formatTry(due.remaining) : "—",
      status: dueText(due),
      tone: dueTone(due),
      href: collect ? manageHref(due.personId, item) : undefined,
    })),
  );

  return (
    <div>
      <PageHeader
        kicker="İşletme"
        title="Aidatlar ve tahsilatlar"
        description="Liste buradadır. Ay süzgeci bu ayı açar. Aidat al sağ üstten açılır ve içeride yönetilir."
      >
        {collect ? <Link href="/aidat?al=yeni" className="btn-club">Aidat al</Link> : null}
      </PageHeader>
      <DueNotice query={query} />
      <DuesList rows={rows} current={current} />
    </div>
  );
}

function AthleteDue({
  row,
  clubId,
  collect,
  today,
  confirmingId,
}: {
  row: MonthDue;
  clubId: string;
  collect: boolean;
  today: string;
  confirmingId?: string;
}) {
  const person = row;
  const label = dueText(row);
  const tone = dueTone(row);
  return (
    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{nameOf(person.personId)}</p>
          <div className="mt-1"><Tag tone={statusTone(row.personStatus)}>{statusLabel[row.personStatus] ?? row.personStatus}</Tag></div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {teamName(person.teamId)}
            {person.priceName ? ` · Anlaşma ${person.priceName}${person.agreed != null ? ` · ${formatTry(person.agreed)}` : ""}` : " · Anlaşma yok"}
          </p>
        </div>
        <Tag tone={tone}>{label}</Tag>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="text-[var(--muted)]">Bu ay</dt><dd>{row.billed || row.custom ? formatTry(row.amount) : "—"}</dd></div>
        <div><dt className="text-[var(--muted)]">Ödenen</dt><dd>{formatTry(row.paid)}</dd></div>
        <div><dt className="text-[var(--muted)]">Kalan</dt><dd>{row.billed ? formatTry(row.remaining) : "—"}{row.paid > row.amount ? ` · fazla ${formatTry(row.paid - row.amount)}` : ""}</dd></div>
      </dl>
      {row.note ? <p className="mt-2 text-xs text-[var(--muted)]">{row.note}</p> : null}
      <div className="mt-3 grid gap-2">
        {row.payments.map((payment) => (
          <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--paper)] px-3 py-2 text-sm">
            <span>{payDate(payment.date)} · {methodLabel(payment.method)} · {formatTry(payment.amount)}</span>
            {collect && confirmingId !== payment.id ? (
              <Link href={`${manageHref(row.personId, row.month)}&sil=${payment.id}`} className="admin-text-btn">Sil</Link>
            ) : null}
          </div>
        ))}
        {row.payments.length === 0 ? <p className="text-sm text-[var(--muted)]">Bu ay ödeme yok.</p> : null}
      </div>
      {collect ? (
        <div className="mt-3 grid gap-3 border-t border-[var(--line)] pt-3 lg:grid-cols-2">
          <form action={recordPayment.bind(null, clubId)} className="grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="personId" value={row.personId} />
            <input type="hidden" name="month" value={row.month} />
            <label className="grid gap-1 text-xs">Gün<input name="date" type="date" required defaultValue={today} max={today} className="field" /></label>
            <label className="grid gap-1 text-xs">Tutar<input name="amount" type="number" min={1} required defaultValue={row.remaining || ""} placeholder="3000" className="field" /></label>
            <label className="grid gap-1 text-xs">Tür
              <select name="method" className="field" defaultValue="cash">
                {methods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <div className="flex items-end"><button className="btn-club">Tahsil et</button></div>
          </form>
          <form action={setDueAmount.bind(null, clubId)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="personId" value={row.personId} />
            <input type="hidden" name="month" value={row.month} />
            <label className="grid gap-1 text-xs">
              Bu ayın aidatı
              <input name="amount" type="number" min={0} required defaultValue={row.custom ? row.amount : row.agreed ?? ""} placeholder="Anlaşma tutarı" className="field" />
            </label>
            <div className="flex items-end gap-2">
              <button className="btn-club">Tutarı yaz</button>
            </div>
          </form>
          {row.custom ? (
            <form action={clearDueAmount.bind(null, clubId)}>
              <input type="hidden" name="personId" value={row.personId} />
              <input type="hidden" name="month" value={row.month} />
              <button className="admin-text-btn">Anlaşma tutarına dön</button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function dueTone(row: MonthDue): "neutral" | "good" | "warn" | "bad" | "club" {
  if (!row.billed) return "neutral";
  if (row.paid > row.amount) return "warn";
  if (row.when === "future" && row.status === "open") return "neutral";
  return statusTone(row.status);
}

function dueText(row: MonthDue) {
  if (!row.billed) {
    if (row.note.startsWith("Ara verdi")) return "Ara verdi";
    if (row.note.startsWith("Ayrıldı")) return "Ayrıldı";
    if (row.note.startsWith("Bu ay aidat yok")) return "Bu ay yok";
    return "Anlaşma yok";
  }
  if (row.amount === 0) return "Ücretsiz";
  if (row.paid > row.amount) return "Fazla tahsilat";
  if (row.status === "paid") return "Ödendi";
  if (row.status === "partial") return "Kısmi";
  if (row.when === "future") return "Gelecek";
  if (row.status === "overdue") return "Gecikti";
  return "Açık";
}

function methodLabel(method: PayMethod) {
  return methods.find((item) => item.id === method)?.label ?? method;
}

function payDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${Number(day)}.${Number(month)}.${year}`;
}

function manageHref(personId: string, month: string) {
  return `/aidat?al=${personId}&ay=${month}`;
}

function DueNotice({ query }: { query: Record<string, string | undefined> }) {
  if (query.hata === "yetki") return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p>;
  if (query.hata === "odeme") return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ödeme günü, tutarı ve türü yazılmalı. Gün bugünden ileri olamaz.</p>;
  const saved = query.eklendi === "odeme" ? "Tahsilat yazıldı." : query.cikarildi === "odeme" ? "Tahsilat çıkarıldı." : query.guncellendi === "aidat" ? "Bu ayın aidatı güncellendi." : "";
  if (!saved) return null;
  return <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">{saved}</p>;
}
