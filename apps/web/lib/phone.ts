export function nationalDigits(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function maskTrPhone(raw: string) {
  const digits = nationalDigits(raw);
  if (!digits) return "";
  let out = `0(${digits.slice(0, 3)}`;
  if (digits.length < 3) return out;
  out += ")";
  if (digits.length === 3) return out;
  out += ` ${digits.slice(3, 6)}`;
  if (digits.length <= 6) return out;
  out += `-${digits.slice(6, 8)}`;
  if (digits.length <= 8) return out;
  out += `-${digits.slice(8, 10)}`;
  return out;
}

export function caretAfterNational(formatted: string, count: number) {
  if (!formatted || count <= 0) return formatted.startsWith("0") ? 1 : 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (index === 0 && formatted[index] === "0") continue;
    if (/\d/.test(formatted[index])) {
      seen += 1;
      if (seen === count) return index + 1;
    }
  }
  return formatted.length;
}

export function trPhone(raw: string) {
  const masked = maskTrPhone(raw);
  return /^0\(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(masked) ? masked : "";
}
