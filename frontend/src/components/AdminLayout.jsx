import { Calendar, ChartNoAxesCombined, Clock3, Grid2X2, LayoutDashboard, Link2, MessageSquareText, PanelsTopLeft, Shield, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/app/scheduling", label: "Scheduling", icon: PanelsTopLeft },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/availability", label: "Availability", icon: Clock3 },
  { to: "/app/contacts", label: "Contacts", icon: Users },
  { to: "/app/workflows", label: "Workflows", icon: MessageSquareText },
  { to: "/app/integrations", label: "Integrations & apps", icon: Grid2X2 },
  { to: "/app/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { to: "/app/admin", label: "Admin center", icon: Shield },
];

export function AdminLayout({ data, actions }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">C</div>
          <div>
            <p className="brand-name">Calendly</p>
            <span className="brand-subtle">Clone assessment</span>
          </div>
        </div>

        <button className="create-button">+ Create</button>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to={item.to}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="upgrade-card">
            <p>Upgrade plan</p>
            <span>Unlock more workflows and routing.</span>
          </div>
          <div className="profile-card">
            <div className="avatar">{data.user.avatar_initials}</div>
            <div>
              <p>{data.user.name}</p>
              <span>{data.user.title}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>My Calendly</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-icon">
              <Link2 size={16} />
            </div>
            <div className="avatar large">{data.user.avatar_initials}</div>
          </div>
        </header>

        <Outlet context={{ data, actions }} />
      </main>
    </div>
  );
}
