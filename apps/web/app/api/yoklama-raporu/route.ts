import { can } from "@skys/domain";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rollPdf } from "@/lib/pdf";
import { loadRollReport, rollWorkbook } from "@/lib/roll-report-data";
import { getSession, viewerFor } from "@/lib/session";
import { clubBySlug } from "@/lib/live";
import { effectiveClubSlug } from "@/lib/tenant";

export async function GET(request: Request) {
  const session = await getSession();
  const pinned = (await cookies()).get("skys_club")?.value;
  const club = clubBySlug(effectiveClubSlug(request.headers.get("host"), pinned));
  if (!session || !club) return new NextResponse("Oturum yok", { status: 401 });
  const viewer = viewerFor(session, club.id);
  if (!can(viewer, club.id, "attendance.report")) return new NextResponse("Yetki yok", { status: 403 });
  const url = new URL(request.url);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const { window, report } = loadRollReport(club.id, viewer, query);
  const kind = query.tur === "xlsx" ? "xlsx" : "pdf";
  if (kind === "xlsx") {
    const bytes = rollWorkbook(report, window.from, window.until);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"yoklama-raporu.xlsx\"",
        "Cache-Control": "no-store",
      },
    });
  }
  const bytes = rollPdf(report, "Katılım özeti", window.label);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"yoklama-raporu.pdf\"",
      "Cache-Control": "no-store",
    },
  });
}
