import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTry, todayISO, type PlatformAthlete } from "@skys/domain";
import {
  clearClubAthleteAllPlay,
  createPlatformAthlete,
  enrollClubAthleteAsAllPlay,
  saveClubStudentRate,
  savePlatformMembershipType,
  updatePlatformAthlete,
} from "@/app/actions";
import { ClubMark, PageHeader, Panel, Stat, statusLabel, Table, Tag } from "@/components/bits";
import {
  billMonth,
  findPlatformAthlete,
  isAllPlayMember,
  listMembershipTypes,
  listPlatformAthletes,
} from "@/lib/platform-athletes";
import { managedClubs } from "@/lib/live";

function AllPlayMark({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "admin-logo admin-logo-sm" : size === "lg" ? "admin-logo admin-logo-lg" : "admin-logo";
  return <img src="/allplay360.png" alt="AllPlay360" className={cls} />;
}

function SourceCell({ row }: { row: PlatformAthlete }) {
  if (isAllPlayMember(row)) {
    return (
      <span className="inline-flex items-center gap-2">
        <AllPlayMark />
        <span>
          ALLPLAY360 özel üyesi
          {row.source === "club" ? <span className="block text-xs font-normal text-[var(--muted)]">Kulüpten alındı</span> : null}
        </span>
      </span>
    );
  }
  return <span>Kulüp sporcusu</span>;
}

function ClubCell({ clubId, fallback }: { clubId?: string; fallback?: string }) {
  const club = clubId ? managedClubs().find((item) => item.id === clubId) : undefined;
  if (!club) return <span>{fallback || "—"}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="sm" />
      <span>{club.name}</span>
    </span>
  );
}

export function AthleteOverview({
  month,
  notice,
  error,
}: {
  month?: string;
  notice?: string;
  error?: string;
}) {
  const ay = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "") ? month! : todayISO.slice(0, 7);
  const rows = listPlatformAthletes();
  const bills = billMonth(ay);
  const types = listMembershipTypes();
  const clubs = managedClubs();
  const special = rows.filter((row) => isAllPlayMember(row)).length;
  const totalBill = bills.reduce((sum, row) => sum + row.total, 0);
  return (
    <div>
      <PageHeader
        kicker="Sistem"
        title="Sporcular"
        description="Kulüp sporcusu ile AllPlay360 özel üyesi ayrıdır. Birinden diğere yalnız bilinçli alınır; kulüp kartı buradan oluşmaz."
        mark={<AllPlayMark size="lg" />}
      >
        <Link href="/platform/sporcular/yeni" className="btn-club">AllPlay360 sporcu aç</Link>
      </PageHeader>
      {notice === "uyelik" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Üyelik tipi eklendi.</p> : null}
      {notice === "endeks" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Öğrenci fiyat endeksi kaydedildi.</p> : null}
      {error === "uyelik" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Üyelik tipi kaydedilemedi.</p> : null}
      {error === "endeks" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Endeks kaydedilemedi.</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Sporcu" value={String(rows.length)} hint="Sistem listesi" soft />
        <Stat label="AllPlay360 özel" value={String(special)} hint="Üyelik tipi bağlı olanlar" />
        <Stat label={`${ay} fatura`} value={formatTry(totalBill)} hint="Yalnız kulüp sporcusu × endeks" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Üyelik tipleri">
          <form action={savePlatformMembershipType} className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
            <label className="grid gap-1 text-sm">
              Tip adı
              <input name="name" required className="field" placeholder="Standart" />
            </label>
            <label className="grid gap-1 text-sm">
              Aylık ₺
              <input name="amount" type="number" min={0} step={1} required className="field" />
            </label>
            <div className="flex items-end">
              <button className="btn-club">Ekle</button>
            </div>
          </form>
          {types.length ? (
            <Table columns={["Tip", "Tutar"]} rows={types.map((row) => [row.name, formatTry(row.amount)])} />
          ) : (
            <p className="text-sm text-[var(--muted)]">Önce AllPlay360 üyelik tipi ekleyin.</p>
          )}
        </Panel>

        <Panel title="Kulüp öğrenci endeksi">
          <form action={saveClubStudentRate} className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm md:col-span-2">
              Ay
              <input name="month" type="month" defaultValue={ay} required className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Kulüp
              <select name="clubId" required className="field" defaultValue={clubs[0]?.id ?? ""}>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Öğrenci başı ₺
              <input name="unitPrice" type="number" min={0} step={1} required className="field" placeholder="50" />
            </label>
            <div className="md:col-span-2">
              <button className="btn-club">Endeksi kaydet</button>
            </div>
          </form>
          <Table
            columns={["Kulüp", "Öğrenci", "Birim", "Tutar"]}
            rows={bills.map((row) => [
              <ClubCell key={row.club.id} clubId={row.club.id} fallback={row.club.name} />,
              String(row.studentCount),
              row.unitPrice ? formatTry(row.unitPrice) : "—",
              formatTry(row.total),
            ])}
          />
          <p className="mt-3 text-sm text-[var(--muted)]">
            Ay: <Link href={`/platform/sporcular?ay=${ay}`} className="font-semibold text-[var(--heading)]">{ay}</Link>
            {" · "}AllPlay360 özel üyesi bu faturaya girmez.
          </p>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Sporcu listesi">
          {rows.length ? (
            <Table
              columns={["Sporcu", "Kaynak", "Kulüp", "Durum", ""]}
              rows={rows.map((row) => [
                row.name,
                <SourceCell key={`${row.id}-src`} row={row} />,
                <ClubCell key={`${row.id}-club`} clubId={row.clubId} fallback={row.clubName} />,
                statusLabel[row.status] ?? row.status,
                <Link key={row.id} href={`/platform/sporcular/${row.id}`} className="btn-line">Detay</Link>,
              ])}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">Henüz sporcu yok. Kulüp ekleyince veya buradan açınca gelir.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function AthleteCreate({ error }: { error?: string }) {
  const types = listMembershipTypes();
  const clubs = managedClubs();
  return (
    <div>
      <PageHeader
        kicker="Sistem"
        title="AllPlay360 sporcu aç"
        description="Bu kayıt yalnız sistem tarafındadır. Kulüp sporcu kartı oluşmaz. Kulüp alanı yalnızca bilgi referansıdır."
        mark={<AllPlayMark size="lg" />}
      >
        <Link href="/platform/sporcular" className="btn-line">Liste</Link>
      </PageHeader>
      {error ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Kayıt tamamlanamadı. Üyelik tipi ve zorunlu alanları kontrol edin.</p> : null}
      {!types.length ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">Önce sporcular ekranından üyelik tipi ekleyin.</p>
        </Panel>
      ) : (
        <Panel>
          <form action={createPlatformAthlete} className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm md:col-span-2">
              Ad soyad
              <input name="name" required className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Doğum yılı
              <input name="birthYear" type="number" required className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Telefon
              <input name="phone" className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Durum
              <select name="status" className="field" defaultValue="active">
                <option value="active">Aktif</option>
                <option value="trial">Deneme</option>
                <option value="paused">Ara verdi</option>
                <option value="left">Ayrıldı</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Başlangıç
              <input name="since" type="date" defaultValue={todayISO} className="field" />
            </label>
            <label className="grid gap-1 text-sm">
              Üyelik tipi
              <select name="membershipTypeId" required className="field" defaultValue={types[0]?.id}>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.name} · {formatTry(type.amount)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Kulüp referansı (isteğe bağlı)
              <select name="clubId" className="field" defaultValue="">
                <option value="">Yok — kulübe yazılmaz</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              Not
              <input name="note" className="field" maxLength={240} />
            </label>
            <p className="md:col-span-2 text-sm text-[var(--muted)]">
              Seçilen kulüp yalnız listede görünür. Kulüp kaydı, kadrosu ve öğrenci endeksi değişmez.
            </p>
            <div className="md:col-span-2">
              <button className="btn-club">Kaydet</button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

export function AthleteDetail({ id, notice, error }: { id: string; notice?: string; error?: string }) {
  const row = findPlatformAthlete(id);
  if (!row) notFound();
  const types = listMembershipTypes();
  const clubs = managedClubs();
  const club = row.clubId ? clubs.find((item) => item.id === row.clubId) : undefined;
  const clubOnly = row.source === "club";
  const allPlay = isAllPlayMember(row);
  return (
    <div>
      <PageHeader
        kicker="Sistem"
        title={row.name}
        description={clubOnly
          ? "Kulüpten çekilmiş kopya. AllPlay360 üyeliği istenirse ayrıca eklenir; kulüp kartı değişmez."
          : "ALLPLAY360 özel üyesi. Kulüp tarafında sporcu kartı yoktur."}
        mark={allPlay
          ? <AllPlayMark size="lg" />
          : club
            ? <ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="lg" />
            : <AllPlayMark size="lg" />}
      >
        <Link href="/platform/sporcular" className="btn-line">Liste</Link>
      </PageHeader>
      {notice === "uyelik" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">AllPlay360 üyeliği eklendi.</p> : null}
      {notice && notice !== "uyelik" ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">Kayıt güncellendi.</p> : null}
      {error === "uyelik" ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">Üyelik eklenemedi.</p> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {allPlay ? (
          <Tag>
            <span className="inline-flex items-center gap-1.5">
              <AllPlayMark />
              ALLPLAY360 özel üyesi
            </span>
          </Tag>
        ) : (
          <Tag>Kulüp sporcusu</Tag>
        )}
        {club ? (
          <Tag>
            <span className="inline-flex items-center gap-1.5">
              <ClubMark name={club.name} monogram={club.monogram} logo={club.logo} accent={club.accent} size="sm" />
              {club.name}
              {!clubOnly ? " · yalnız referans" : null}
            </span>
          </Tag>
        ) : <Tag>Kulüpsüz</Tag>}
        <Tag>{statusLabel[row.status] ?? row.status}</Tag>
        {row.membershipTypeName ? <Tag>{row.membershipTypeName} · {formatTry(row.membershipAmount ?? 0)}</Tag> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Özet">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Doğum</dt><dd className="font-semibold text-[var(--heading)]">{row.birthYear}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Telefon</dt><dd className="font-semibold text-[var(--heading)]">{row.phone || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Başlangıç</dt><dd className="font-semibold text-[var(--heading)]">{row.since}</dd></div>
            <div className="flex justify-between gap-3 items-center">
              <dt className="text-[var(--muted)]">Kulüp</dt>
              <dd className="font-semibold text-[var(--heading)]">
                {club ? <ClubCell clubId={club.id} fallback={club.name} /> : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Kaynak</dt><dd className="font-semibold text-[var(--heading)]">{clubOnly ? "Kulüp kopyası" : "AllPlay360"}</dd></div>
          </dl>
        </Panel>
        <Panel title={clubOnly ? "Sistem notu" : "Düzenle"}>
          {clubOnly ? (
            <form action={updatePlatformAthlete.bind(null, row.id)} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Not
                <input name="note" defaultValue={row.note ?? ""} className="field" maxLength={240} />
              </label>
              <button className="btn-club w-fit">Notu kaydet</button>
              <p className="text-sm text-[var(--muted)]">Ad ve durum kulüpten gelir. Kulüp kartı buradan değişmez.</p>
            </form>
          ) : (
            <form action={updatePlatformAthlete.bind(null, row.id)} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Ad soyad
                <input name="name" required defaultValue={row.name} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Doğum yılı
                <input name="birthYear" type="number" required defaultValue={row.birthYear} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Telefon
                <input name="phone" defaultValue={row.phone ?? ""} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Durum
                <select name="status" className="field" defaultValue={row.status}>
                  <option value="active">Aktif</option>
                  <option value="trial">Deneme</option>
                  <option value="paused">Ara verdi</option>
                  <option value="left">Ayrıldı</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Başlangıç
                <input name="since" type="date" defaultValue={row.since} className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Üyelik tipi
                <select name="membershipTypeId" required className="field" defaultValue={row.membershipTypeId}>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>{type.name} · {formatTry(type.amount)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Kulüp referansı
                <select name="clubId" className="field" defaultValue={row.clubId ?? ""}>
                  <option value="">Yok — kulübe yazılmaz</option>
                  {clubs.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Not
                <input name="note" defaultValue={row.note ?? ""} className="field" maxLength={240} />
              </label>
              <p className="text-sm text-[var(--muted)]">Kulüp referansı bilgi içindir. Kulüp kaydı ve öğrenci endeksi etkilenmez.</p>
              <button className="btn-club w-fit">Kaydet</button>
            </form>
          )}
        </Panel>
        {clubOnly ? (
          <Panel title="AllPlay360 üyeliği">
            {row.membershipTypeId ? (
              <div className="grid gap-3">
                <p className="text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--heading)]">
                    <AllPlayMark />
                    {row.membershipTypeName} · {formatTry(row.membershipAmount ?? 0)}
                  </span>
                </p>
                <p className="text-sm text-[var(--muted)]">Üyelik sistem kaydındadır. Kulüp kartına yazılmaz; öğrenci endeksine ek fatura eklemez.</p>
                <form action={clearClubAthleteAllPlay.bind(null, row.id)}>
                  <button className="btn-line">AllPlay360 üyeliğini kaldır</button>
                </form>
              </div>
            ) : types.length ? (
              <form action={enrollClubAthleteAsAllPlay.bind(null, row.id)} className="grid gap-3">
                <p className="text-sm text-[var(--muted)]">Kulüp açtıysa buradan AllPlay360 olarak alınır. Kulüp kartı değişmez.</p>
                <label className="grid gap-1 text-sm">
                  Üyelik tipi
                  <select name="membershipTypeId" required className="field" defaultValue={types[0]?.id}>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>{type.name} · {formatTry(type.amount)}</option>
                    ))}
                  </select>
                </label>
                <button className="btn-club w-fit">AllPlay360 olarak kaydet</button>
              </form>
            ) : (
              <p className="text-sm text-[var(--muted)]">Önce üyelik tipi ekleyin.</p>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
