"use client";

import { useState, type FormEvent } from "react";
import { discountRates, formatTry, quoteFee } from "@skys/domain";
import { Tag } from "@/components/bits";

export type RegistrationInitial = {
  name: string;
  birthYear: number;
  enrollment: "school" | "squad";
  status: string;
  sportId: string;
  teamId: string;
  since: string;
  reference: string;
  mother?: { id?: string; name: string; phone: string };
  father?: { id?: string; name: string; phone: string };
  emergency?: { id?: string; name: string; phone: string; relation?: string };
  primary?: "mother" | "father";
  priceId?: string;
  discount: "none" | "percent" | "custom";
  discountPercent?: number;
  customAmount?: string;
};

export function AthleteForm({
  action,
  today,
  sports,
  teams,
  prices,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  today: string;
  sports: { id: string; name: string }[];
  teams: { id: string; name: string; kind: "school" | "squad" }[];
  prices: { id: string; name: string; amount: number }[];
  initial?: RegistrationInitial;
  submitLabel: string;
}) {
  const year = Number(today.slice(0, 4));
  const [enrollment, setEnrollment] = useState<"school" | "squad">(initial?.enrollment ?? "squad");
  const [teamId, setTeamId] = useState(initial?.teamId ?? "");
  const [primary, setPrimary] = useState<"mother" | "father">(initial?.primary === "father" ? "father" : "mother");
  const [veliNote, setVeliNote] = useState("");
  const groupOptions = teams.filter((team) => team.kind === enrollment);

  function keepOneGuardian(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const ready = (prefix: string) => {
      const name = String(data.get(`${prefix}Name`) ?? "").trim();
      const phone = String(data.get(`${prefix}Phone`) ?? "").replace(/\D/g, "");
      const started = Boolean(name || String(data.get(`${prefix}Phone`) ?? "").trim());
      return { started, done: Boolean(name) && phone.length >= 10 };
    };
    const mother = ready("mother");
    const father = ready("father");
    const emergencyName = String(data.get("emergencyName") ?? "").trim();
    const emergencyPhone = String(data.get("emergencyPhone") ?? "").replace(/\D/g, "");
    const emergencyStarted = Boolean(
      emergencyName || String(data.get("emergencyPhone") ?? "").trim() || String(data.get("emergencyRelation") ?? "").trim(),
    );
    const emergencyDone = Boolean(emergencyName) && emergencyPhone.length >= 10;
    const chosen = data.get("primary") === "father" ? father : mother;
    const halfFilled = mother.started !== mother.done || father.started !== father.done || emergencyStarted !== emergencyDone;
    if (!chosen.done || halfFilled) {
      event.preventDefault();
      setVeliNote("Listede görünecek velinin adı ve telefonu yazılır. Diğer veli ve acil yakın boş kalabilir.");
      return;
    }
    setVeliNote("");
  }

  return (
    <form id="sporcu-kayit" action={action} className="grid gap-3 md:grid-cols-2" onSubmit={keepOneGuardian}>
      <Field label="Ad soyad">
        <input name="name" required defaultValue={initial?.name} placeholder="Deniz Kaya" className="field" />
      </Field>
      <Field label="Doğum yılı">
        <input name="birthYear" type="number" required min={1940} max={year} defaultValue={initial?.birthYear ?? 2014} className="field" />
      </Field>
      <Field label="Tür">
        <select
          name="enrollment"
          className="field"
          value={enrollment}
          onChange={(event) => {
            const next = event.target.value === "school" ? "school" : "squad";
            setEnrollment(next);
            setTeamId("");
          }}
        >
          <option value="school">Spor okulu</option>
          <option value="squad">Takım oyuncusu</option>
        </select>
      </Field>
      <Field label="Durum">
        <select name="status" className="field" defaultValue={initial?.status ?? "active"}>
          <option value="active">Aktif</option>
          <option value="trial">Deneme dersi</option>
          <option value="paused">Ara verdi</option>
          <option value="left">Ayrıldı</option>
        </select>
      </Field>
      <Field label="Branş">
        <select name="sportId" className="field" defaultValue={initial?.sportId ?? sports[0]?.id}>
          {sports.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Grup">
        <select name="teamId" className="field" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          <option value="">Grup yok</option>
          {groupOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Kayıt tarihi">
        <input name="since" type="date" required defaultValue={initial?.since ?? today} max={today} className="field" />
      </Field>
      <Field label="Referans">
        <input name="reference" defaultValue={initial?.reference} placeholder="Kim yönlendirdi" className="field" />
      </Field>
      <p className="text-xs text-[var(--muted)] md:col-span-2">Kayıt tarihi bugün gelir, geçmiş bir gün seçilebilir. Referans isteğe bağlıdır.</p>
      <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
        <ContactFields title="Anne" prefix="mother" initial={initial?.mother} picked={primary === "mother"} onPick={() => setPrimary("mother")} />
        <ContactFields title="Baba" prefix="father" initial={initial?.father} picked={primary === "father"} onPick={() => setPrimary("father")} />
        <ContactFields title="Acil yakın" prefix="emergency" initial={initial?.emergency} relation />
      </div>
      <p className="text-xs text-[var(--muted)] md:col-span-2">Listede görünecek veli, Anne veya Baba kartında seçilir. Seçilenin adı ve telefonu yazılır. Diğeri ve acil yakın boş kalabilir.</p>
      {veliNote ? <p className="text-sm text-[#9f2d2d] md:col-span-2">{veliNote}</p> : null}
      <FeeFields prices={prices} initial={initial} />
      <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-[var(--line)] bg-white/95 px-1 py-3 md:col-span-2">
        <button className="btn-club">{submitLabel}</button>
      </div>
    </form>
  );
}

function FeeFields({
  prices,
  initial,
}: {
  prices: { id: string; name: string; amount: number }[];
  initial?: RegistrationInitial;
}) {
  const knownPrice = initial?.priceId && prices.some((item) => item.id === initial.priceId) ? initial.priceId : prices[0]?.id ?? "";
  const [priceId, setPriceId] = useState(knownPrice);
  const [mode, setMode] = useState<"none" | "percent" | "custom">(initial?.discount ?? "none");
  const [percent, setPercent] = useState(initial?.discountPercent ?? discountRates[0].percent);
  const [custom, setCustom] = useState(initial?.customAmount ?? "");
  const price = prices.find((item) => item.id === priceId);
  const customAmount = Number(custom);
  const charged = price ? quoteFee(price.amount, mode, percent, Number.isFinite(customAmount) ? customAmount : undefined) : 0;
  const discounted = Boolean(price) && charged < (price?.amount ?? 0);
  if (!prices.length) {
    return (
      <p className="text-sm text-[var(--muted)] md:col-span-2">
        Kayıt ücreti için önce Fiyatlar ekranından bir ücret tanımlanır.
      </p>
    );
  }
  return (
    <div className="grid gap-3 rounded-2xl bg-[var(--paper)] p-3 md:col-span-2 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="text-sm font-semibold">Ücret</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Fiyatlar ekranındaki ücret seçilir. İndirim varsa yüzde seçilir; yoksa özel fiyat yazılır.
        </p>
      </div>
      <Field label="Fiyat">
        <select name="priceId" className="field" value={priceId} onChange={(event) => setPriceId(event.target.value)} required>
          {prices.map((item) => (
            <option key={item.id} value={item.id}>{item.name} · {formatTry(item.amount)}</option>
          ))}
        </select>
      </Field>
      <Field label="İndirim">
        <select
          name="discount"
          className="field"
          value={mode}
          onChange={(event) => setMode(event.target.value === "percent" || event.target.value === "custom" ? event.target.value : "none")}
        >
          <option value="none">İndirim yok</option>
          <option value="percent">Yüzde indirim</option>
          <option value="custom">Özel fiyat</option>
        </select>
      </Field>
      {mode === "percent" ? (
        <Field label="Yüzde">
          <select
            name="discountPercent"
            className="field"
            value={percent}
            onChange={(event) => setPercent(Number(event.target.value))}
          >
            {discountRates.map((rate) => (
              <option key={rate.percent} value={rate.percent}>{rate.label}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {mode === "custom" ? (
        <Field label="Özel fiyat">
          <input
            name="customAmount"
            type="number"
            min={0}
            required
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            className="field"
            placeholder="0"
          />
        </Field>
      ) : null}
      {price ? (
        <div className="flex flex-wrap items-center gap-2 text-sm md:col-span-2">
          <span>Liste {formatTry(price.amount)}</span>
          {discounted ? <Tag tone="warn">İndirimli {formatTry(charged)}</Tag> : <span>{formatTry(charged)}</span>}
          {mode === "percent" && percent === 100 ? <Tag>Ücretsiz (%100 burslu)</Tag> : null}
        </div>
      ) : null}
    </div>
  );
}

function ContactFields({
  title,
  prefix,
  relation,
  initial,
  picked,
  onPick,
}: {
  title: string;
  prefix: "mother" | "father" | "emergency";
  relation?: boolean;
  initial?: { id?: string; name: string; phone: string; relation?: string };
  picked?: boolean;
  onPick?: () => void;
}) {
  return (
    <div className="grid content-start gap-3 rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {onPick ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="primary" value={prefix} checked={picked} onChange={onPick} />
            Veli bu
          </label>
        ) : null}
      </div>
      {initial?.id ? <input type="hidden" name={`${prefix}Id`} value={initial.id} /> : null}
      <Field label="Ad soyad">
        <input name={`${prefix}Name`} defaultValue={initial?.name} placeholder="Ad soyad" className="field" />
      </Field>
      <Field label="Telefon">
        <input
          name={`${prefix}Phone`}
          defaultValue={initial?.phone}
          placeholder="05xx"
          inputMode="tel"
          className="field"
        />
      </Field>
      {relation ? (
        <Field label="Yakınlık">
          <input name="emergencyRelation" defaultValue={initial?.relation} placeholder="Dayı, anneanne" className="field" />
        </Field>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}
