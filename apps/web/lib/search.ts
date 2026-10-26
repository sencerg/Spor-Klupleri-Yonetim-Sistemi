export function foldTr(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("û", "u");
}

export function guardianLabel(
  person: { guardian?: string; guardianId?: string; motherId?: string; fatherId?: string },
  guardians: { id: string; name: string }[],
) {
  if (person.guardianId) {
    const selected = guardians.find((item) => item.id === person.guardianId);
    if (selected) return selected.name;
  }
  if (person.guardian?.trim()) return person.guardian.trim();
  const named = (id?: string) => (id ? guardians.find((item) => item.id === id)?.name : undefined);
  return named(person.motherId) || named(person.fatherId) || "";
}

export type GuardianChoice = {
  key: string;
  recordId?: string;
  name: string;
  phone?: string;
  email?: string;
  role?: "mother" | "father" | "emergency";
  relation?: string;
};

export function guardianChoices(
  people: { guardian?: string }[],
  guardians: { id: string; name: string; phone: string; email?: string; role?: GuardianChoice["role"]; relation?: string }[],
): GuardianChoice[] {
  const choices: GuardianChoice[] = guardians.map((guardian) => ({
    key: guardian.id,
    recordId: guardian.id,
    name: guardian.name,
    phone: guardian.phone,
    email: guardian.email,
    role: guardian.role,
    relation: guardian.relation,
  }));
  const seen = new Set(choices.map((choice) => foldTr(choice.name)));
  for (const person of people) {
    const name = person.guardian?.trim();
    if (!name) continue;
    const folded = foldTr(name);
    if (seen.has(folded)) continue;
    seen.add(folded);
    choices.push({ key: `legacy:${folded}`, name });
  }
  choices.sort((left, right) => left.name.localeCompare(right.name, "tr"));
  return choices;
}
