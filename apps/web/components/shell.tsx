import Link from "next/link";

export function SideNav({
  brand,
  monogram,
  detail,
  items,
  logo,
  current,
}: {
  brand: string;
  monogram: string;
  detail: string;
  items: { href: string; label: string; group: string }[];
  logo?: string;
  current: string;
}) {
  const path = current;
  const groups = items.reduce<{ group: string; items: typeof items }[]>((list, item) => {
    const found = list.find((entry) => entry.group === item.group);
    if (found) found.items.push(item);
    else list.push({ group: item.group, items: [item] });
    return list;
  }, []);

  return (
    <aside className="admin-side">
      <div className="admin-brand">
        {logo ? <img src={logo} alt="" className="admin-logo" /> : <span className="admin-mark">{monogram}</span>}
        <span className="min-w-0">
          <strong className="truncate">{brand}</strong>
          <em className="truncate">{detail}</em>
        </span>
      </div>
      <nav className="admin-nav">
        {groups.map((group) => (
          <div key={group.group} className="admin-group">
            <div className="admin-group-label">{group.group}</div>
            {group.items.map((item) => {
              const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`admin-link-row ${active ? "active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function TopBar({
  title,
  userName,
  userRole,
  switchHref,
}: {
  title: string;
  userName: string;
  userRole: string;
  switchHref?: string;
}) {
  const initial = userName.trim().charAt(0).toLocaleUpperCase("tr") || "S";
  return (
    <header className="admin-top">
      <div className="admin-top-title">{title}</div>
      <div className="admin-top-user">
        <span className="admin-avatar">{initial}</span>
        <span className="hidden text-left sm:block">
          <strong>{userName}</strong>
          <small>{userRole}</small>
        </span>
        {switchHref ? (
          <Link href={switchHref} className="admin-text-btn">
            Yeni Ufuklar
          </Link>
        ) : null}
        <form action="/api/cikis" method="post">
          <button className="admin-text-btn">Çıkış</button>
        </form>
      </div>
    </header>
  );
}

export function Frame({
  accent,
  accentSoft,
  children,
  sidebar,
  topbar,
  banner,
}: {
  accent: string;
  accentSoft: string;
  children: React.ReactNode;
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  banner?: React.ReactNode;
}) {
  return (
    <div style={{ ["--club" as string]: accent, ["--club-soft" as string]: accentSoft }}>
      <div className="admin-shell">
        {sidebar}
        <div className="admin-main">
          {topbar}
          {banner}
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
