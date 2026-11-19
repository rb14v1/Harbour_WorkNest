import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/handovers', label: 'Handovers' },
  { to: '/employees', label: 'Employees' },
];

const CONTEXT_LABELS = [
  ['/projects/', 'Project detail'],
  ['/handovers/new', 'New handover'],
  ['/handovers/', 'Handover detail'],
];

function pageContext(pathname) {
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  const detail = CONTEXT_LABELS.find(([prefix]) => pathname.startsWith(prefix));
  if (detail) return `${match?.label ?? ''} / ${detail[1]}`;
  return match?.label ?? '';
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Handover</div>
        <nav aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="demo-note">Local/demo application. No authentication.</p>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="app-name">Project Handover &amp; Task Tracking</span>
          <span className="page-context">{pageContext(pathname)}</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
