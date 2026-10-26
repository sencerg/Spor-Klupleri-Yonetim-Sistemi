import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function MobileOnlyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <div className="auth-kicker">Yeni Ufuklar</div>
      <h1 className="page-title mt-2">Bu hesap uygulamada</h1>
      <p className="page-subtitle">
        {session.user.name}, kulüp panelinde bir ekranın yok. Veli, sporcu ve üye kendi programını, bildirimini ve aidatını mobil uygulamada görür. Antrenör hem paneli hem uygulamayı kullanır.
      </p>
      <form action="/api/cikis" method="post" className="mt-6">
        <button className="btn-ink">Başka hesapla gir</button>
      </form>
    </main>
  );
}
