"use client";

import { useState } from "react";
import { jerseySizes } from "@skys/domain";

export function GearProductForm({
  action,
  places,
  creating,
  name,
  facilityId,
  qty,
  given,
  size,
  sizes,
  training,
  match,
}: {
  action: (formData: FormData) => void;
  places: { id: string; name: string }[];
  creating: boolean;
  name: string;
  facilityId: string;
  qty?: number;
  given: number;
  size: string;
  sizes: string[];
  training: boolean;
  match: boolean;
}) {
  const [isTraining, setTraining] = useState(training);
  const [isMatch, setMatch] = useState(match);
  const jersey = isTraining || isMatch;
  return (
    <form id="stok-kayit" action={action} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Ürün adı
          <input name="name" required defaultValue={name} placeholder="Antrenman forması" className="field" />
        </label>
        <label className="grid gap-1 text-sm">
          Tesis
          <select name="facilityId" required className="field" defaultValue={facilityId}>
            <option value="">Tesis seç</option>
            {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="training"
          value="1"
          checked={isTraining}
          onChange={(event) => {
            setTraining(event.target.checked);
            if (event.target.checked) setMatch(false);
          }}
        />
        Ürün bir antrenman forması mıdır?
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="match"
          value="1"
          checked={isMatch}
          onChange={(event) => {
            setMatch(event.target.checked);
            if (event.target.checked) setTraining(false);
          }}
        />
        Ürün bir maç forması mıdır?
      </label>
      {creating && jersey ? (
        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">Yazılan her beden ayrı satır olur. Boş beden açılmaz.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {jerseySizes.map((item) => (
              <label key={item} className="grid gap-1 text-sm">
                {item}
                <input name={`adet-${item}`} type="number" min={0} placeholder="0" className="field" />
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {!creating && jersey ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Beden
            <select name="size" required className="field" defaultValue={size}>
              <option value="">Beden seç</option>
              {sizes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Adet
            <input name="qty" type="number" min={given} required defaultValue={qty ?? ""} placeholder="100" className="field" />
          </label>
        </div>
      ) : null}
      {!jersey ? (
        <label className="grid max-w-xs gap-1 text-sm">
          Adet
          <input name="qty" type="number" min={given} required defaultValue={qty ?? ""} placeholder="12" className="field" />
        </label>
      ) : null}
    </form>
  );
}
