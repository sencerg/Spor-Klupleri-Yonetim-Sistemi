import type { AttendanceStatus } from "@skys/domain";

const options: { id: Exclude<AttendanceStatus, "pending">; label: string }[] = [
  { id: "present", label: "Katıldı" },
  { id: "absent", label: "Katılmadı" },
  { id: "excused", label: "İzinli" },
];

export function AttendanceBoard({
  rows,
  action,
  gun,
}: {
  rows: { personId: string; name: string; team: string; status: AttendanceStatus }[];
  action: (formData: FormData) => Promise<void>;
  gun: string;
}) {
  if (!rows.length) return <p className="text-sm text-[var(--muted)]">Bu grupta sporcu yok.</p>;
  return (
    <form id="yoklama-kayit" action={action} className="grid gap-4">
      <input type="hidden" name="gun" value={gun} />
      <p className="text-sm text-[var(--muted)]">İşaretlenenler kaydolur. Boş bırakılanlar bekler.</p>
      <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white">
        {rows.map((row) => (
          <div key={row.personId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-xs text-[var(--muted)]">{row.team}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {options.map((option) => (
                <label key={option.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`durum-${row.personId}`}
                    value={option.id}
                    defaultChecked={row.status === option.id}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full bg-[#efeae1] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] peer-checked:bg-[var(--club)] peer-checked:text-white">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn-club w-fit">Kaydet</button>
    </form>
  );
}
