"use client";

import { useMemo, useState } from "react";
import { openClub } from "@/app/actions";
import { putFileInInput, shrinkLogo } from "@/lib/logo-file";
import { turkeyCities, districtsOf } from "@/lib/turkey-places";

function hexOf(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function softOf(hex: string) {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return hexOf(Math.round(r + (255 - r) * 0.88), Math.round(g + (255 - g) * 0.88), Math.round(b + (255 - b) * 0.88));
}

function splashOf(hex: string) {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return hexOf(Math.max(8, Math.round(r * 0.18)), Math.max(12, Math.round(g * 0.22)), Math.max(24, Math.round(b * 0.38)));
}

async function colorsFromLogo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("logo"));
      node.src = url;
    });
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { accent: "#c8102e", accentSoft: "#fdecee", splash: "#101a42" };
    ctx.drawImage(image, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();
    for (let index = 0; index < data.length; index += 4) {
      const a = data[index + 3];
      if (a < 180) continue;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 40 || min > 230) continue;
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.18) continue;
      const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const row = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, sat: 0 };
      row.count += 1;
      row.r += r;
      row.g += g;
      row.b += b;
      row.sat += sat;
      buckets.set(key, row);
    }
    const best = [...buckets.values()].sort((left, right) => right.count * right.sat - left.count * left.sat)[0];
    if (!best) return { accent: "#c8102e", accentSoft: "#fdecee", splash: "#101a42" };
    const accent = hexOf(Math.round(best.r / best.count), Math.round(best.g / best.count), Math.round(best.b / best.count));
    return { accent, accentSoft: softOf(accent), splash: splashOf(accent) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function suggestSubdomain(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

export function ClubOpenForm({ error, portSuffix = "" }: { error?: string; portSuffix?: string }) {
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subTouched, setSubTouched] = useState(false);
  const [preview, setPreview] = useState("");
  const [accent, setAccent] = useState("#c8102e");
  const [accentSoft, setAccentSoft] = useState("#fdecee");
  const [splash, setSplash] = useState("#101a42");
  const districts = useMemo(() => districtsOf(city), [city]);

  return (
    <>
      {error === "kulup" ? (
        <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          Ad, kullanıcı adı, il, ilçe, sahip, e-posta ve logo yazılır. Kullanıcı adı başka kulüpte olmamalı.
        </p>
      ) : null}
      {error === "subdomain" ? (
        <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          Kullanıcı adı 3–24 karakter, yalnız küçük harf ve rakam. Örnek: sincanbasket
        </p>
      ) : null}
      {error === "logo" ? (
        <p className="mb-4 rounded-2xl bg-[#f8e4e1] px-4 py-3 text-sm text-[#9f2d2d]">
          Logo PNG, JPEG veya WebP olmalı. Büyük dosya seçilince otomatik küçültülür.
        </p>
      ) : null}
      <form id="kulup-ac" action={openClub} encType="multipart/form-data" className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="accent" value={accent} />
        <input type="hidden" name="accentSoft" value={accentSoft} />
        <input type="hidden" name="splash" value={splash} />
        <label className="grid gap-1 text-sm md:col-span-2">
          Kulüp adı
          <input
            name="name"
            required
            value={name}
            placeholder="Sincan Basketbol Akademi"
            className="field"
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (!subTouched) setSubdomain(suggestSubdomain(next));
            }}
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Kullanıcı adı
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="subdomain"
              required
              value={subdomain}
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9]{3,24}"
              placeholder="sincanbasket"
              className="field max-w-xs"
              onChange={(event) => {
                setSubTouched(true);
                setSubdomain(event.target.value.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]/g, "").slice(0, 24));
              }}
            />
            <span className="text-sm text-[var(--muted)]">.localhost{portSuffix}</span>
          </div>
          <span className="text-xs text-[var(--muted)]">
            Giriş adresi: http://{subdomain || "sincanbasket"}.localhost{portSuffix}/login
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          İl
          <select
            name="city"
            required
            className="field"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setDistrict("");
            }}
          >
            <option value="" disabled>Seç</option>
            {turkeyCities.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          İlçe
          <select
            name="district"
            required
            className="field"
            value={district}
            disabled={!city}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="" disabled>{city ? "Seç" : "Önce il seç"}</option>
            {districts.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Sahip
          <input name="ownerName" required placeholder="Ad Soyad" className="field" />
        </label>
        <label className="grid gap-1 text-sm">
          Sahip e-posta
          <input name="email" type="email" required placeholder="sahip@ornek.com" className="field" />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Motto
          <input name="motto" maxLength={80} placeholder="Kısa giriş yazısı" className="field" />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          Logo
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="field"
            onChange={async (event) => {
              const input = event.target;
              const file = input.files?.[0];
              if (!file) {
                setPreview("");
                return;
              }
              const ready = await shrinkLogo(file);
              putFileInInput(input, ready);
              setPreview(URL.createObjectURL(ready));
              const colors = await colorsFromLogo(ready);
              setAccent(colors.accent);
              setAccentSoft(colors.accentSoft);
              setSplash(colors.splash);
            }}
          />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
          {preview ? (
            <img src={preview} alt="" className="h-16 w-16 rounded-full bg-white object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: accent }}>Logo</span>
          )}
          <div className="grid gap-1 text-sm">
            <p>Logodan renk alındı. İstersen değiştirilir.</p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">Vurgu <input type="color" value={accent} onChange={(event) => { setAccent(event.target.value); setAccentSoft(softOf(event.target.value)); setSplash(splashOf(event.target.value)); }} /></label>
              <label className="flex items-center gap-2">Açık <input type="color" value={accentSoft} onChange={(event) => setAccentSoft(event.target.value)} /></label>
              <label className="flex items-center gap-2">Zemin <input type="color" value={splash} onChange={(event) => setSplash(event.target.value)} /></label>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
