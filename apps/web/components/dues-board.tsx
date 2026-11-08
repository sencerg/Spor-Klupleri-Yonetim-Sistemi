import Link from "next/link";
import {
  canCollect,
  duesForMonth,
  duesSeasonMonths,
  formatDay,
  formatTry,
  monthLabel,
  monthsBetween,
  shiftMonth,
  todayISO,
  type Club,
  type DuePayment,
  type ExtraPayment,
  type MonthDue,
  type PayMethod,
  type Viewer,
} from "@skys/domain";
import { addExtraCharge, clearDueAmount, recordExtraPayment, recordPayment, removeExtraCharge, removeExtraPayment, removePayment, setDueAmount } from "@/app/actions";
import { PageHeader, Stat, statusLabel, statusTone, Tag } from "@/components/bits";
import { AthletePick, DuePayForm } from "@/components/dues-collect";
import { DuesList } from "@/components/dues-list";
import { listPeople, listSports, listStaff, listTeams, listYearSeasons, nameOf, staffName, teamName } from "@/lib/live";
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
  const seasons = listYearSeasons(club.id);
  const covering = seasons.find((item) => item.start.slice(0, 7) <= current && item.end.slice(0, 7) >= current);
  const earliest = people.reduce((min, person) => (person.since.slice(0, 7) < min ? person.since.slice(0, 7) : min), current);
  const latest = covering ? covering.end.slice(0, 7) : shiftMonth(current, 3);
  const months = monthsBetween(earliest, latest > current ? latest : shiftMonth(current, 3));
  const collect = canCollect(viewer, club.id);
  const opened = query.al;
  if (opened) {
    const person = opened === "yeni" ? undefined : people.find((item) => item.id === opened);
    const staff = listStaff(club.id, viewer).slice().sort((left, right) => left.name.localeCompare(right.name, "tr"));
    const history = person
      ? [
          ...state.duePayments.filter((item) => item.clubId === club.id && item.personId === person.id),
          ...state.dueOverrides.filter((item) => item.clubId === club.id && item.personId === person.id),
        ]
      : [];
    const span = person
      ? duesSeasonMonths(person, seasons, listTeams(club.id, viewer), listSports(club.id), todayISO, history)
      : { seasonName: "", months: [] as string[] };
    const dues = person
      ? span.months.map((month) => duesForMonth([person], month, todayISO, state.duePayments, state.dueOverrides)[0]).filter(Boolean)
      : [];
    const openMonth = span.months.includes(query.ay ?? "") ? query.ay! : "";
    const openDue = dues.find((due) => due.month === openMonth);
    const charges = person ? state.extraCharges.filter((item) => item.clubId === club.id && item.personId === person.id) : [];
    const chargePayments = person ? state.extraPayments.filter((item) => item.clubId === club.id && item.personId === person.id) : [];
    const openCharge = charges.find((item) => item.id === query.kalem);
    const confirming = state.duePayments.find((item) => item.id === query.sil && item.clubId === club.id && item.personId === person?.id);
    const confirmingExtra = chargePayments.find((item) => item.id === query.silode);
    const confirmingCharge = charges.find((item) => item.id === query.silkalem);
    const billed = dues.filter((due) => due.billed && due.amount > 0);
    const aidatTotal = billed.reduce((sum, due) => sum + due.amount, 0);
    const aidatPaid = dues.reduce((sum, due) => sum + due.paid, 0);
    const aidatLeft = billed.reduce((sum, due) => sum + due.remaining, 0);
    const openCount = billed.filter((due) => due.remaining > 0).length;
    const closedCount = billed.filter((due) => due.remaining === 0).length;
    const extraTotal = charges.reduce((sum, item) => sum + item.amount, 0);
    const extraPaid = chargePayments.reduce((sum, item) => sum + item.amount, 0);
    const extraLeft = charges.reduce((sum, item) => sum + Math.max(0, item.amount - paidOf(chargePayments, item.id)), 0);
    const first = span.months[0];
    const last = span.months[span.months.length - 1];
    return (
      <div>
        <PageHeader
          kicker="İşletme"
          title={person ? nameOf(person.id) : "Aidat al"}
          description={person && first && last
            ? `${span.seasonName} · ${monthLabel(first)} – ${monthLabel(last)}. Ödenen aylar listede kalır. Ödenmeyen aya basılınca tahsilat açılır.`
            : "Sporcu seçilir. Sezon ayları ve tahsilat aynı sayfada durur."}
        >
          <Link href="/aidat" className="btn-line">Listeye geri dön</Link>
        </PageHeader>
        <DueNotice query={query} />
        {confirming && person ? (
          <form action={removePayment.bind(null, club.id, confirming.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
            <p><span className="font-semibold">{paymentText(confirming)}</span> silinecek.</p>
            <div className="mt-3 flex gap-3">
              <input type="hidden" name="personId" value={person.id} />
              <input type="hidden" name="month" value={openMonth || confirming.month} />
              {openCharge ? <input type="hidden" name="chargeId" value={openCharge.id} /> : null}
              <Link href={aidatHref(person.id, { ay: openMonth || confirming.month, kalem: openCharge?.id })} className="admin-text-btn">Vazgeç</Link>
              <button className="btn-club">Sil</button>
            </div>
          </form>
        ) : null}
        {confirmingExtra && person && openCharge ? (
          <form action={removeExtraPayment.bind(null, club.id, confirmingExtra.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
            <p><span className="font-semibold">{paymentText(confirmingExtra)}</span> silinecek.</p>
            <div className="mt-3 flex gap-3">
              <input type="hidden" name="personId" value={person.id} />
              {openMonth ? <input type="hidden" name="month" value={openMonth} /> : null}
              <input type="hidden" name="chargeId" value={openCharge.id} />
              <Link href={aidatHref(person.id, { ay: openMonth, kalem: openCharge.id })} className="admin-text-btn">Vazgeç</Link>
              <button className="btn-club">Sil</button>
            </div>
          </form>
        ) : null}
        {confirmingCharge && person ? (
          <form action={removeExtraCharge.bind(null, club.id, confirmingCharge.id)} className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
            <p><span className="font-semibold">{confirmingCharge.title}</span> silinecek.</p>
            <div className="mt-3 flex gap-3">
              <input type="hidden" name="personId" value={person.id} />
              {openMonth ? <input type="hidden" name="month" value={openMonth} /> : null}
              <Link href={aidatHref(person.id, { ay: openMonth })} className="admin-text-btn">Vazgeç</Link>
              <button className="btn-club">Sil</button>
            </div>
          </form>
        ) : null}
        <section className="admin-card">
          <div className="admin-card-body">
            <AthletePick
              people={people.slice().sort((left, right) => left.name.localeCompare(right.name, "tr")).map((item) => ({ id: item.id, name: item.name }))}
              value={person?.id ?? ""}
            />
          </div>
        </section>
        {person ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Aidat toplam" value={formatTry(aidatTotal)} hint={span.seasonName ? `${span.seasonName} aidatı` : "Sezon aidatı"} />
              <Stat label="Ödenen" value={formatTry(aidatPaid)} hint={closedCount ? `${closedCount} ay kapandı` : "Tahsilat yok"} />
              <Stat label="Kalan" value={formatTry(aidatLeft)} hint={openCount ? `${openCount} ay açık` : "Açık ay yok"} />
            </div>
            <section className="admin-card mt-4">
              <div className="admin-card-head"><h2>Aidat</h2></div>
              <div className="admin-card-body">
                {dues.length ? (
                  <div className="overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {["Ay", "Ücret", "Ödenen", "Kalan", "Durum", ""].map((column) => <th key={column}>{column}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {dues.map((due) => {
                          const stopped = isStopped(due);
                          const href = aidatHref(person.id, { ay: due.month, kalem: openCharge?.id });
                          const open = due.month === openMonth;
                          return (
                            <tr key={due.month}>
                              <td style={open ? { background: "#fdecee" } : undefined}>
                                {stopped ? <span className="font-semibold">{monthLabel(due.month)}</span> : <Link href={href} className="font-semibold">{monthLabel(due.month)}</Link>}
                                {due.month === current ? <span className="ml-2 text-xs text-[var(--muted)]">Bu ay</span> : null}
                              </td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{due.billed || due.custom ? formatTry(due.amount) : "—"}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{formatTry(due.paid)}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{due.billed ? formatTry(due.remaining) : "—"}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}><Tag tone={dueTone(due)}>{dueText(due)}</Tag></td>
                              <td style={open ? { background: "#fdecee" } : undefined}>
                                {stopped ? null : <Link href={href} className="admin-text-btn">{settled(due) ? "Ödemeler" : "Tahsil et"}</Link>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">Bu sezonda aidat ayı yok.</p>}
                {openDue ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{monthLabel(openDue.month)}</h3>
                      <Link href={aidatHref(person.id, { kalem: openCharge?.id })} className="admin-text-btn">Kapat</Link>
                    </div>
                    <div className="mb-2"><Tag tone={statusTone(openDue.personStatus)}>{statusLabel[openDue.personStatus] ?? openDue.personStatus}</Tag></div>
                    <p className="text-sm text-[var(--muted)]">
                      {teamName(openDue.teamId)}
                      {openDue.priceName ? ` · Anlaşma ${openDue.priceName}${openDue.agreed != null ? ` · ${formatTry(openDue.agreed)}` : ""}` : " · Anlaşma yok"}
                    </p>
                    {openDue.note ? <p className="mt-2 text-xs text-[var(--muted)]">{openDue.note}</p> : null}
                    <div className="mt-3 grid gap-2">
                      {openDue.payments.map((payment) => (
                        <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--paper)] px-3 py-2 text-sm">
                          <span>{paymentText(payment)}</span>
                          {collect && confirming?.id !== payment.id ? (
                            <Link href={aidatHref(person.id, { ay: openDue.month, kalem: openCharge?.id, sil: payment.id })} className="admin-text-btn">Sil</Link>
                          ) : null}
                        </div>
                      ))}
                      {openDue.payments.length === 0 ? <p className="text-sm text-[var(--muted)]">Bu ay ödeme yok.</p> : null}
                    </div>
                    {collect && !isStopped(openDue) ? (
                      <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 lg:grid-cols-2">
                        {!settled(openDue) ? (
                          <DuePayForm
                            key={openDue.month}
                            action={recordPayment.bind(null, club.id)}
                            hidden={[
                              { name: "personId", value: person.id },
                              { name: "month", value: openDue.month },
                              ...(openCharge ? [{ name: "chargeId", value: openCharge.id }] : []),
                            ]}
                            {...fillDue(openDue)}
                            today={todayISO}
                            staff={staff}
                          />
                        ) : <div />}
                        <div>
                          <form action={setDueAmount.bind(null, club.id)} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                            <input type="hidden" name="personId" value={person.id} />
                            <input type="hidden" name="month" value={openDue.month} />
                            {openCharge ? <input type="hidden" name="chargeId" value={openCharge.id} /> : null}
                            <label className="grid gap-1 text-xs">
                              Bu ayın aidatı
                              <input name="amount" type="number" min={0} required defaultValue={openDue.custom ? openDue.amount : openDue.agreed ?? ""} placeholder="Anlaşma tutarı" className="field" />
                            </label>
                            <button className="btn-line">Tutarı yaz</button>
                          </form>
                          {openDue.custom ? (
                            <form action={clearDueAmount.bind(null, club.id)} className="mt-2">
                              <input type="hidden" name="personId" value={person.id} />
                              <input type="hidden" name="month" value={openDue.month} />
                              {openCharge ? <input type="hidden" name="chargeId" value={openCharge.id} /> : null}
                              <button className="admin-text-btn">Anlaşma tutarına dön</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
            <section className="admin-card mt-4">
              <div className="admin-card-head"><h2>Diğer ödemeler</h2></div>
              <div className="admin-card-body">
                <p className="mb-4 text-sm text-[var(--muted)]">Özel lig, forma ve benzeri kalemler aidattan ayrı durur.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Toplam" value={formatTry(extraTotal)} hint="Aidat dışı kalem" />
                  <Stat label="Ödenen" value={formatTry(extraPaid)} hint="Tahsil edilen" />
                  <Stat label="Kalan" value={formatTry(extraLeft)} hint={extraLeft > 0 ? "Ödemesi gereken" : "Açık kalem yok"} />
                </div>
                {collect ? (
                  <form action={addExtraCharge.bind(null, club.id)} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                    <input type="hidden" name="personId" value={person.id} />
                    {openMonth ? <input type="hidden" name="month" value={openMonth} /> : null}
                    <label className="grid gap-1 text-xs">
                      Ad
                      <input name="title" required maxLength={80} placeholder="Forma, özel lig" className="field" />
                    </label>
                    <label className="grid gap-1 text-xs">
                      Tutar
                      <input name="amount" type="number" min={1} required className="field" />
                    </label>
                    <button className="btn-line">Kalem ekle</button>
                  </form>
                ) : null}
                {charges.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {["Kalem", "Tutar", "Ödenen", "Kalan", "Durum", ""].map((column) => <th key={column}>{column}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {charges.map((charge) => {
                          const paid = paidOf(chargePayments, charge.id);
                          const left = Math.max(0, charge.amount - paid);
                          const href = aidatHref(person.id, { ay: openMonth, kalem: charge.id });
                          const open = charge.id === openCharge?.id;
                          const tone = paid > charge.amount ? "warn" : left === 0 ? "good" : paid > 0 ? "warn" : "bad";
                          const label = paid > charge.amount ? "Fazla tahsilat" : left === 0 ? "Ödendi" : paid > 0 ? "Kısmi" : "Açık";
                          return (
                            <tr key={charge.id}>
                              <td style={open ? { background: "#fdecee" } : undefined}><Link href={href} className="font-semibold">{charge.title}</Link></td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{formatTry(charge.amount)}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{formatTry(paid)}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}>{formatTry(left)}</td>
                              <td style={open ? { background: "#fdecee" } : undefined}><Tag tone={tone}>{label}</Tag></td>
                              <td style={open ? { background: "#fdecee" } : undefined}>
                                <Link href={href} className="admin-text-btn">{left > 0 ? "Tahsil et" : "Ödemeler"}</Link>
                                {collect ? <Link href={aidatHref(person.id, { ay: openMonth, silkalem: charge.id })} className="admin-text-btn ml-3">Sil</Link> : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="mt-4 text-sm text-[var(--muted)]">Aidat dışı kalem yok.</p>}
                {openCharge ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{openCharge.title}</h3>
                      <Link href={aidatHref(person.id, { ay: openMonth })} className="admin-text-btn">Kapat</Link>
                    </div>
                    <div className="grid gap-2">
                      {chargePayments.filter((item) => item.chargeId === openCharge.id).map((payment) => (
                        <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--paper)] px-3 py-2 text-sm">
                          <span>{paymentText(payment)}</span>
                          {collect && confirmingExtra?.id !== payment.id ? (
                            <Link href={aidatHref(person.id, { ay: openMonth, kalem: openCharge.id, silode: payment.id })} className="admin-text-btn">Sil</Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {collect && Math.max(0, openCharge.amount - paidOf(chargePayments, openCharge.id)) > 0 ? (
                      <div className="mt-4 max-w-3xl">
                        <DuePayForm
                          key={openCharge.id}
                          action={recordExtraPayment.bind(null, club.id)}
                          hidden={[
                            { name: "personId", value: person.id },
                            { name: "chargeId", value: openCharge.id },
                            ...(openMonth ? [{ name: "month", value: openMonth }] : []),
                          ]}
                          {...fillCharge(openCharge.amount, paidOf(chargePayments, openCharge.id))}
                          today={todayISO}
                          staff={staff}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : opened !== "yeni" ? <p className="mt-4 text-sm text-[var(--muted)]">Bu sporcu listede yok.</p> : null}
      </div>
    );
  }

  const rows = months.flatMap((item) =>
    duesForMonth(people, item, todayISO, state.duePayments, state.dueOverrides).map((due) => ({
      name: nameOf(due.personId),
      team: teamName(due.teamId),
      month: monthLabel(item),
      monthKey: item,
      monthKeyLabel: monthLabel(item),
      fee: due.billed || due.custom ? formatTry(due.amount) : "—",
      paid: formatTry(due.paid),
      remaining: due.billed ? formatTry(due.remaining) : "—",
      status: dueText(due),
      tone: dueTone(due),
      href: collect ? aidatHref(due.personId, { ay: item }) : undefined,
    })),
  );
  const gearRows = state.extraCharges
    .filter((charge) => charge.clubId === club.id && people.some((person) => person.id === charge.personId))
    .map((charge) => {
      const person = people.find((item) => item.id === charge.personId);
      if (!person) return null;
      const paid = state.extraPayments.filter((item) => item.chargeId === charge.id).reduce((sum, item) => sum + item.amount, 0);
      const left = Math.max(0, charge.amount - paid);
      const monthKey = left > 0 ? current : charge.date.slice(0, 7);
      const status = charge.amount === 0 ? "Ücretsiz" : left === 0 ? "Ödendi" : paid > 0 ? "Kısmi" : "Borç";
      return {
        name: nameOf(person.id),
        team: teamName(person.teamId),
        month: `${charge.title} · ${formatDay(charge.date)}`,
        monthKey,
        monthKeyLabel: monthLabel(monthKey),
        fee: formatTry(charge.amount),
        paid: formatTry(paid),
        remaining: formatTry(left),
        status,
        tone: (status === "Ödendi" || status === "Ücretsiz" ? "good" : status === "Kısmi" ? "warn" : "bad") as "good" | "warn" | "bad",
        href: collect ? aidatHref(person.id, { ay: monthKey, kalem: charge.id }) : undefined,
      };
    })
    .filter((row) => row !== null);

  return (
    <div>
      <PageHeader
        kicker="İşletme"
        title="Aidatlar ve tahsilatlar"
        description="Liste buradadır. Ay süzgeci bu ayı açar. Alınmayan teslim ücreti bu ayın kalan hanesinde borç olarak durur."
      >
        {collect ? <Link href="/aidat?al=yeni" className="btn-club">Aidat al</Link> : null}
      </PageHeader>
      <DueNotice query={query} />
      <DuesList rows={[...rows, ...gearRows]} current={current} />
    </div>
  );
}

function fillDue(row: MonthDue) {
  const label = row.custom ? "Bu ayın tutarı" : "Anlaşma tutarı";
  if (!row.billed || row.amount < 1 || row.remaining < 1) {
    return { autoAmount: null, autoText: "", amountLabel: label, manualHint: "Anlaşma tutarı yok. Tutar elle yazılır." };
  }
  if (row.paid > 0 && row.remaining !== row.amount) {
    return { autoAmount: row.remaining, autoText: `${formatTry(row.remaining)} · anlaşma ${formatTry(row.amount)}`, amountLabel: label };
  }
  return { autoAmount: row.amount, autoText: formatTry(row.amount), amountLabel: label };
}

function fillCharge(amount: number, paid: number) {
  const remaining = Math.max(0, amount - paid);
  if (remaining < 1) return { autoAmount: null, autoText: "", amountLabel: "Kalem tutarı" };
  if (paid > 0 && remaining !== amount) {
    return { autoAmount: remaining, autoText: `${formatTry(remaining)} · kalem ${formatTry(amount)}`, amountLabel: "Kalem tutarı" };
  }
  return { autoAmount: amount, autoText: formatTry(amount), amountLabel: "Kalem tutarı" };
}

function paidOf(rows: { chargeId: string; amount: number }[], chargeId: string) {
  return rows.filter((item) => item.chargeId === chargeId).reduce((sum, item) => sum + item.amount, 0);
}

function settled(row: MonthDue) {
  return row.billed && row.remaining === 0;
}

function isStopped(row: MonthDue) {
  return row.note.startsWith("Ara verdi") || row.note.startsWith("Ayrıldı");
}

function dueTone(row: MonthDue): "neutral" | "good" | "warn" | "bad" | "club" {
  if (!row.billed) return row.paid > 0 ? "warn" : "neutral";
  if (row.paid > row.amount) return "warn";
  if (row.when === "future" && row.status === "open") return "neutral";
  return statusTone(row.status);
}

function dueText(row: MonthDue) {
  if (!row.billed) {
    if (row.paid > 0) return "Tahsilat var";
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

function methodLabel(method?: PayMethod) {
  if (!method) return "";
  return methods.find((item) => item.id === method)?.label ?? method;
}

function paymentText(payment: Pick<DuePayment | ExtraPayment, "date" | "amount" | "method" | "collectorStaffId" | "note">) {
  const bits = [payDate(payment.date)];
  if (payment.collectorStaffId) bits.push(staffName(payment.collectorStaffId));
  const channel = methodLabel(payment.method);
  if (channel) bits.push(channel);
  bits.push(formatTry(payment.amount));
  if (payment.note) bits.push(payment.note);
  return bits.join(" · ");
}

function payDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${Number(day)}.${Number(month)}.${year}`;
}

function aidatHref(personId: string, query: { ay?: string; kalem?: string; sil?: string; silkalem?: string; silode?: string } = {}) {
  const params = new URLSearchParams();
  params.set("al", personId);
  if (query.ay) params.set("ay", query.ay);
  if (query.kalem) params.set("kalem", query.kalem);
  if (query.sil) params.set("sil", query.sil);
  if (query.silkalem) params.set("silkalem", query.silkalem);
  if (query.silode) params.set("silode", query.silode);
  return `/aidat?${params.toString()}`;
}

function DueNotice({ query }: { query: Record<string, string | undefined> }) {
  if (query.hata === "yetki") return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Bu işlem için yetkin yok.</p>;
  if (query.hata === "odeme") return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Ödeme günü ve tutarı yazılmalı. Ödemeyi alan seçildiyse kanal da seçilir. Gün bugünden ileri olamaz.</p>;
  if (query.hata === "kalem") return <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kalem adı ve tutarı yazılmalı.</p>;
  const saved = query.eklendi === "odeme"
    ? "Tahsilat yazıldı."
    : query.eklendi === "kalem"
      ? "Kalem eklendi."
      : query.cikarildi === "odeme"
        ? "Tahsilat çıkarıldı."
        : query.cikarildi === "kalem"
          ? "Kalem çıkarıldı."
          : query.guncellendi === "aidat"
            ? "Bu ayın aidatı güncellendi."
            : "";
  if (!saved) return null;
  return <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">{saved}</p>;
}
