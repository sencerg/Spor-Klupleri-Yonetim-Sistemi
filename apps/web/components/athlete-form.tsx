"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { discountRates, formatTry, quoteFee } from "@skys/domain";
import { Tag } from "@/components/bits";
import { caretAfterNational, maskTrPhone, nationalDigits, trPhone } from "@/lib/phone";

const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export type RegistrationInitial = {
  name: string;
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
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
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<string | null>(null);
  const [enrollment, setEnrollment] = useState<"school" | "squad">(initial?.enrollment ?? "squad");
  const [teamId, setTeamId] = useState(initial?.teamId ?? "");
  const [primary, setPrimary] = useState<"mother" | "father">(initial?.primary === "father" ? "father" : "mother");
  const [veliNote, setVeliNote] = useState("");

  function markDirty() {
    const form = formRef.current;
    if (!form || baseline.current == null) return;
    form.dataset.dirty = formSnapshot(form) !== baseline.current ? "1" : "0";
  }

  useLayoutEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (baseline.current == null) baseline.current = formSnapshot(form);
    markDirty();
  });
  const years = Array.from({ length: year - 1939 }, (_, index) => year - index);
  const groupOptions = teams.filter((team) => team.kind === enrollment);

  function keepOneGuardian(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const ready = (prefix: string) => {
      const name = String(data.get(`${prefix}Name`) ?? "").trim();
      const phone = String(data.get(`${prefix}Phone`) ?? "").trim();
      const started = Boolean(name || phone);
      return { started, done: Boolean(name) && Boolean(trPhone(phone)) };
    };
    const mother = ready("mother");
    const father = ready("father");
    const emergencyName = String(data.get("emergencyName") ?? "").trim();
    const emergencyPhone = String(data.get("emergencyPhone") ?? "").trim();
    const emergencyStarted = Boolean(
      emergencyName || emergencyPhone || String(data.get("emergencyRelation") ?? "").trim(),
    );
    const emergencyDone = Boolean(emergencyName) && Boolean(trPhone(emergencyPhone));
    const birthDay = String(data.get("birthDay") ?? "");
    const birthMonth = String(data.get("birthMonth") ?? "");
    if ((birthDay || birthMonth) && !(birthDay && birthMonth)) {
      event.preventDefault();
      setVeliNote("Doğum günü boş kalabilir. Yazılırsa gün ve ay birlikte seçilir.");
      return;
    }
    const chosen = data.get("primary") === "father" ? father : mother;
    const halfFilled = mother.started !== mother.done || father.started !== father.done || emergencyStarted !== emergencyDone;
    if (!chosen.done || halfFilled) {
      event.preventDefault();
      setVeliNote("Listede görünecek velinin adı ve telefonu yazılır. Telefon 0(xxx) xxx-xx-xx biçimindedir. Diğer veli ve acil yakın boş kalabilir.");
      return;
    }
    setVeliNote("");
  }

  return (
    <form ref={formRef} id="sporcu-kayit" action={action} className="grid gap-6" onSubmit={keepOneGuardian} onInput={markDirty} onChange={markDirty}>
      <Group title="Sporcu">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Ad soyad" required>
            <input name="name" required defaultValue={initial?.name} placeholder="Deniz Kaya" className="field" />
          </Field>
          <Field label="Doğum yılı" required>
            <select name="birthYear" required className="field" defaultValue={initial?.birthYear ? String(initial.birthYear) : ""}>
              <option value="">Yıl seçin</option>
              {years.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Doğum günü" aside="İsteğe bağlı">
            <span className="grid grid-cols-2 gap-2">
              <select name="birthDay" className="field" defaultValue={initial?.birthDay ? String(initial.birthDay) : ""}>
                <option value="">Gün</option>
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <select name="birthMonth" className="field" defaultValue={initial?.birthMonth ? String(initial.birthMonth) : ""}>
                <option value="">Ay</option>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </span>
          </Field>
        </div>
      </Group>
      <Group title="Kayıt" hint="Tarih bugün gelir, geçmiş bir gün seçilebilir. Referans boş kalabilir.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tür" required>
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
          <Field label="Durum" required>
            <select name="status" className="field" defaultValue={initial?.status ?? "active"}>
              <option value="active">Aktif</option>
              <option value="trial">Deneme dersi</option>
              <option value="paused">Ara verdi</option>
              <option value="left">Ayrıldı</option>
            </select>
          </Field>
          <Field label="Branş" required>
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
          <Field label="Kayıt tarihi" required>
            <input name="since" type="date" required defaultValue={initial?.since ?? today} max={today} className="field" />
          </Field>
          <Field label="Referans">
            <input name="reference" defaultValue={initial?.reference} placeholder="Kim yönlendirdi" className="field" />
          </Field>
        </div>
      </Group>
      <Group title="Veli" hint="Ana veli Anne veya Baba’dan seçilir. Telefon 0(xxx) xxx-xx-xx.">
        <div className="grid gap-3 lg:grid-cols-3">
          <ContactFields title="Anne" prefix="mother" required={primary === "mother"} initial={initial?.mother} picked={primary === "mother"} onPick={() => setPrimary("mother")} />
          <ContactFields title="Baba" prefix="father" required={primary === "father"} initial={initial?.father} picked={primary === "father"} onPick={() => setPrimary("father")} />
          <ContactFields title="Acil yakın" prefix="emergency" initial={initial?.emergency} relation />
        </div>
        {veliNote ? <p className="text-sm text-[#9f2d2d]">{veliNote}</p> : null}
      </Group>
      <FeeFields prices={prices} initial={initial} />
      <div className="flex justify-end border-t border-[var(--line)] pt-4">
        <button type="submit" className="btn-club">{submitLabel}</button>
      </div>
    </form>
  );
}

function formSnapshot(form: HTMLFormElement) {
  return Array.from(new FormData(form).entries())
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-[var(--line)] pt-4 first:border-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-[var(--heading)]">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
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
      <Group title="Ücret" hint="Önce Fiyatlar ekranından bir ücret tanımlanır.">
        <span />
      </Group>
    );
  }
  return (
    <Group title="Ücret">
      <div className="grid gap-3 md:grid-cols-2">
      <Field label="Fiyat" required>
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
        <Field label="Özel fiyat" required>
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
    </Group>
  );
}

function TrPhone({ name, defaultValue, required }: { name: string; defaultValue?: string; required?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const [value, setValue] = useState(maskTrPhone(defaultValue ?? ""));

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || caret.current == null) return;
    input.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);

  function paint(raw: string, count: number) {
    const next = maskTrPhone(raw);
    const pos = caretAfterNational(next, count);
    if (next === value) {
      inputRef.current?.setSelectionRange(pos, pos);
      return;
    }
    caret.current = pos;
    setValue(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const start = event.currentTarget.selectionStart ?? 0;
    const end = event.currentTarget.selectionEnd ?? 0;
    if (start !== end) return;
    const digits = nationalDigits(value);
    if (event.key === "Backspace" && start > 0 && /\D/.test(value[start - 1] ?? "")) {
      event.preventDefault();
      const index = nationalDigits(value.slice(0, start)).length - 1;
      if (index < 0) {
        paint("", 0);
        return;
      }
      paint(digits.slice(0, index) + digits.slice(index + 1), index);
    }
    if (event.key === "Delete" && start < value.length && /\D/.test(value[start] ?? "")) {
      event.preventDefault();
      const index = nationalDigits(value.slice(0, start)).length;
      if (index >= digits.length) return;
      paint(digits.slice(0, index) + digits.slice(index + 1), index);
    }
  }

  return (
    <Field label="Telefon" required={required}>
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          const cursor = event.target.selectionStart ?? raw.length;
          paint(raw, nationalDigits(raw.slice(0, cursor)).length);
        }}
        onKeyDown={onKeyDown}
        placeholder="0(5xx) xxx-xx-xx"
        inputMode="numeric"
        autoComplete="tel"
        required={required}
        className="field"
      />
    </Field>
  );
}

function ContactFields({
  title,
  prefix,
  relation,
  required,
  initial,
  picked,
  onPick,
}: {
  title: string;
  prefix: "mother" | "father" | "emergency";
  relation?: boolean;
  required?: boolean;
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
      <Field label="Ad soyad" required={required}>
        <input name={`${prefix}Name`} required={required} defaultValue={initial?.name} placeholder="Ad soyad" className="field" />
      </Field>
      <TrPhone name={`${prefix}Phone`} required={required} defaultValue={initial?.phone} />
      {relation ? (
        <Field label="Yakınlık">
          <input name="emergencyRelation" defaultValue={initial?.relation} placeholder="Dayı, anneanne" className="field" />
        </Field>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  aside,
  children,
}: {
  label: string;
  required?: boolean;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex h-5 items-center justify-between gap-2">
        <span>
          {label}
          {required ? <span className="text-[var(--club)]"> *</span> : null}
        </span>
        {aside ? <span className="shrink-0 text-xs font-normal text-[var(--muted)]">{aside}</span> : null}
      </span>
      {children}
    </label>
  );
}
