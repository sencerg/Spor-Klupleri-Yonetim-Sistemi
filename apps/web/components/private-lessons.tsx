import type { ReactNode } from "react";
import Link from "next/link";
import { can, formatTry, isCoachDuty, todayISO, type Club, type PrivateLesson, type Viewer } from "@skys/domain";
import { cancelPrivateLesson, savePrivateLesson, savePrivatePrice } from "@/app/actions";
import { facilityName, listFacilities, listPeople, listStaff, listTeams, listTitles, staffName, teamName } from "@/lib/live";
import { PageHeader, Panel, Table, Tag } from "@/components/bits";
import { PrivateLessonForm } from "@/components/private-lesson-form";
import { readState } from "@/lib/store";

function faultText(query: Record<string, string | undefined>) {
  if (query.hata === "yetki") return "Bu işlem için yetkin yok.";
  if (query.hata === "ucret") return "Ücret adı, hoca ve tutar yazılır.";
  if (query.hata === "ders") return "Sporcu, ders adı, hoca ve o hocanın ücreti seçilir.";
  if (query.hata === "saat") return "Salon, tarih ve saat yazılır. Bitiş, başlangıçtan sonra olur.";
  if (query.hata === "gecmis") return "Geçmiş güne yazılmaz.";
  if (query.hata === "hoca") return "Bu hoca bu saatte dolu.";
  if (query.hata === "takim") return "Bu takım bu saatte zaten var.";
  if (query.hata === "sporcu") return "Bu sporcu bu saatte başka yerde.";
  if (query.hata === "salon") return query.ad ? `Bu saatte bu salonda ${query.ad} var.` : "Bu saatte bu salonda başka grup var.";
  return "";
}

function savedText(flag?: string) {
  if (flag === "ucret") return "Ücret kaydedildi.";
  if (flag === "talep") return "Talep alındı. Takvime yazılmadı.";
  if (flag === "ders") return "Özel ders takvime yazıldı.";
  if (flag === "iptal") return "Özel ders takvimden kalktı.";
  return "";
}

export function PrivateLessons({
  club,
  viewer,
  query,
}: {
  club: Club;
  viewer: Viewer;
  query: Record<string, string | undefined>;
}) {
  if (!can(viewer, club.id, "private.view")) return null;
  const titles = listTitles(club.id);
  const coaches = listStaff(club.id, viewer).filter((member) => isCoachDuty(member.duty, titles));
  const people = listPeople(club.id, viewer).filter((person) => person.kind === "athlete" && person.status !== "left");
  const teams = listTeams(club.id, viewer);
  const places = listFacilities(club.id, viewer).filter((place) => !place.branchId);
  const state = readState();
  const prices = state.privatePrices.filter((price) => price.clubId === club.id);
  const lessons = state.privateLessons.filter((lesson) => lesson.clubId === club.id);
  const fault = faultText(query);
  const saved = savedText(query.eklendi);
  const banner = (
    <>
      {saved ? <p className="mb-4 rounded-2xl bg-[#e5f2ea] px-4 py-3 text-sm text-[#1f6b45]">{saved}</p> : null}
      {fault ? <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">{fault}</p> : null}
    </>
  );

  if (query.ucret) {
    const editing = query.ucret === "yeni" ? undefined : prices.find((price) => price.id === query.ucret);
    if (query.ucret !== "yeni" && !editing) return <p className="text-sm text-[var(--muted)]">Bu ücret yok.</p>;
    return (
      <div>
        <PageHeader kicker="Spor operasyonları" title={editing ? editing.name : "Özel ders ücreti"} description="Ücret hocaya yazılır. Aynı ders, başka hocada başka tutar olabilir.">
          <span className="flex flex-wrap gap-2">
            {coaches.length ? <button form="ozel-ucret" className="btn-club">Kaydet</button> : null}
            <Link href="/ozel-ders" className="btn-line">Listeye geri dön</Link>
          </span>
        </PageHeader>
        {banner}
        {coaches.length ? (
          <Panel>
            <form id="ozel-ucret" action={savePrivatePrice.bind(null, club.id)} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="priceForm" value={editing?.id ?? "yeni"} />
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <label className="grid gap-1 text-sm">
                Ders adı
                <input name="name" required defaultValue={editing?.name} placeholder="60 dk bireysel" className="field" />
              </label>
              <label className="grid gap-1 text-sm">
                Hoca
                <select name="coachStaffId" required className="field" defaultValue={editing?.coachStaffId ?? coaches[0]?.id}>
                  {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Tutar
                <input name="amount" type="number" min={0} required defaultValue={editing?.amount} placeholder="1500" className="field" />
              </label>
            </form>
          </Panel>
        ) : <p className="text-sm text-[var(--muted)]">Önce antrenör unvanlı personel açılır.</p>}
      </div>
    );
  }

  const requested = query.talep ? lessons.find((lesson) => lesson.id === query.talep && lesson.status !== "scheduled") : undefined;
  if (query.talep === "yeni" || requested) {
    return (
      <LessonPage
        clubId={club.id}
        mode="request"
        title={requested ? requested.title : "Özel ders talebi"}
        description="Talep takvime yazılmaz. Kulüp veya antrenör sonra saati ve salonu seçer."
        formId="ozel-talep"
        banner={banner}
        coaches={coaches}
        prices={prices}
        people={people}
        teams={teams}
        places={places}
        lesson={requested}
      />
    );
  }

  const opened = query.ders
    ? lessons.find((lesson) => lesson.id === query.ders || lesson.trainingId === query.ders)
    : undefined;
  if (query.ders === "yeni" || opened) {
    return (
      <div>
        <LessonPage
          clubId={club.id}
          mode="place"
          title={opened?.status === "scheduled" ? opened.title : "Özel dersi takvime yaz"}
          description="Salon, saat ve hoca kontrolü antrenman takvimiyle aynıdır. Pilates aynı salonda durabilir."
          formId="ozel-ders"
          banner={banner}
          coaches={coaches}
          prices={prices}
          people={people}
          teams={teams}
          places={places}
          lesson={opened}
        />
        {opened?.status === "scheduled" ? (
          <form action={cancelPrivateLesson.bind(null, club.id, opened.id)} className="mt-4">
            <button className="admin-text-btn">Takvimden kaldır</button>
          </form>
        ) : null}
      </div>
    );
  }

  const waiting = lessons.filter((lesson) => lesson.status !== "scheduled");
  const placed = lessons.filter((lesson) => lesson.status === "scheduled");
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title="Özel ders" description="Öğrenci veya veli talep bırakır. Kulüp ya da antrenör dersi doğrudan takvime yazar. Ücret hocaya göre değişir.">
        <span className="flex flex-wrap gap-2">
          <Link href="/ozel-ders?ucret=yeni" className="btn-line">Ücret ekle</Link>
          <Link href="/ozel-ders?talep=yeni" className="btn-line">Talep aç</Link>
          <Link href="/ozel-ders?ders=yeni" className="btn-club">Takvime ekle</Link>
        </span>
      </PageHeader>
      {banner}
      <div className="grid gap-4">
        <Panel title="Ücretler">
          {prices.length ? (
            <Table
              columns={["Ders", "Hoca", "Tutar", ""]}
              rows={prices.map((price) => [
                price.name,
                staffName(price.coachStaffId),
                formatTry(price.amount),
                <Link key={price.id} href={`/ozel-ders?ucret=${price.id}`} className="admin-text-btn">Düzelt</Link>,
              ])}
            />
          ) : <p className="text-sm text-[var(--muted)]">Henüz özel ders ücreti yok.</p>}
        </Panel>
        <Panel title="Talepler">
          {waiting.length ? (
            <Table
              columns={["Sporcu", "Ders", "Hoca", "Ücret", "Durum", ""]}
              rows={waiting.map((lesson) => lessonRow(lesson, people, false))}
            />
          ) : <p className="text-sm text-[var(--muted)]">Açık talep yok.</p>}
        </Panel>
        <Panel title="Takvimde">
          {placed.length ? (
            <Table
              columns={["Tarih", "Saat", "Ders", "Sporcu", "Grup", "Salon", "Hoca", "Ücret", ""]}
              rows={placed.map((lesson) => lessonRow(lesson, people, true))}
            />
          ) : <p className="text-sm text-[var(--muted)]">Takvime yazılmış özel ders yok.</p>}
        </Panel>
      </div>
    </div>
  );
}

function lessonRow(lesson: PrivateLesson, people: { id: string; name: string }[], placed: boolean) {
  const person = people.find((item) => item.id === lesson.personId)?.name ?? "Sporcu";
  const money = formatTry(lesson.amount);
  const status = lesson.status === "cancelled" ? <Tag tone="bad">İptal</Tag> : lesson.status === "scheduled" ? <Tag tone="good">Takvimde</Tag> : <Tag tone="warn">Talep</Tag>;
  if (!placed) {
    return [
      person,
      lesson.title,
      staffName(lesson.coachStaffId),
      money,
      status,
      lesson.status === "requested" ? <Link key={lesson.id} href={`/ozel-ders?ders=${lesson.id}`} className="admin-text-btn">Takvime al</Link> : "—",
    ];
  }
  return [
    lesson.date ? lesson.date.split("-").reverse().join(".") : "—",
    lesson.start && lesson.end ? `${lesson.start}–${lesson.end}` : "—",
    lesson.title,
    person,
    lesson.teamId ? teamName(lesson.teamId) : "Grup yok",
    lesson.facilityId ? facilityName(lesson.facilityId) : "—",
    staffName(lesson.coachStaffId),
    money,
    <span key={lesson.id} className="flex flex-wrap gap-3">
      <Link href={`/ozel-ders?ders=${lesson.id}`} className="admin-text-btn">Düzelt</Link>
      {lesson.date ? <Link href={`/takvim?gun=${lesson.date}&gorunum=hafta`} className="admin-text-btn">Takvim</Link> : null}
    </span>,
  ];
}

function LessonPage({
  clubId,
  mode,
  title,
  description,
  formId,
  banner,
  coaches,
  prices,
  people,
  teams,
  places,
  lesson,
}: {
  clubId: string;
  mode: "request" | "place";
  title: string;
  description: string;
  formId: string;
  banner: ReactNode;
  coaches: { id: string; name: string }[];
  prices: { id: string; coachStaffId: string; name: string; amount: number }[];
  people: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  places: { id: string; name: string }[];
  lesson?: PrivateLesson;
}) {
  const ready = Boolean(coaches.length && people.length && prices.length && (mode === "request" || places.length));
  return (
    <div>
      <PageHeader kicker="Spor operasyonları" title={title} description={description}>
        <span className="flex flex-wrap gap-2">
          {ready ? <button form={formId} className="btn-club">Kaydet</button> : null}
          <Link href="/ozel-ders" className="btn-line">Listeye geri dön</Link>
        </span>
      </PageHeader>
      {banner}
      {!coaches.length ? <p className="text-sm text-[var(--muted)]">Önce antrenör unvanlı personel açılır.</p> : null}
      {coaches.length && !people.length ? <p className="text-sm text-[var(--muted)]">Aktif sporcu yok.</p> : null}
      {coaches.length && people.length && !prices.length ? <p className="text-sm text-[var(--muted)]">Önce bu ekrandan bir ücret eklenir.</p> : null}
      {mode === "place" && coaches.length && people.length && prices.length && !places.length ? <p className="text-sm text-[var(--muted)]">Önce bir tesis açılır.</p> : null}
      {ready ? (
        <Panel>
          <PrivateLessonForm
            mode={mode}
            coaches={coaches}
            prices={prices.map((price) => ({ id: price.id, name: price.name, coachStaffId: price.coachStaffId, amountLabel: formatTry(price.amount) }))}
            people={people}
            teams={teams}
            places={places}
            today={todayISO}
            action={savePrivateLesson.bind(null, clubId)}
            initial={lesson ? {
              id: lesson.id,
              personId: lesson.personId,
              title: lesson.title,
              coachStaffId: lesson.coachStaffId,
              priceId: lesson.priceId,
              teamId: lesson.teamId,
              facilityId: lesson.facilityId,
              date: lesson.date,
              start: lesson.start,
              end: lesson.end,
              note: lesson.note,
            } : undefined}
          />
        </Panel>
      ) : null}
    </div>
  );
}
