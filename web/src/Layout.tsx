import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "./auth";
import { api } from "./api";
import { LOGO_SRC } from "./brand";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/generate", label: "Generate" },
  { to: "/archive", label: "Archive" },
  { to: "/members", label: "Members" },
  { to: "/channels", label: "Channels" },
  { to: "/settings", label: "Settings" },
];

export const Layout: React.FC = () => {
  const { auth, refresh } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await api.logout();
    await refresh();
    navigate("/login");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="brand-logo">
          <img src={LOGO_SRC} alt="Wrapped" />
        </Link>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        {auth?.authenticated && (
          <div
            className="sidebar-user"
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              padding: 14,
              background: "#141414",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2, color: "#f2f2f2" }}>
              {auth.name ?? auth.email}
            </div>
            <div style={{ color: "#888", marginBottom: 10, wordBreak: "break-all" }}>
              {auth.email}
            </div>
            <button className="ghost" onClick={signOut} style={{ width: "100%", padding: 6 }}>
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};
