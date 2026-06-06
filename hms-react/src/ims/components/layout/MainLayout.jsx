import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "dashboard",    label: "Dashboard",    icon: "📊" },
  { to: "products",     label: "Products",     icon: "📦" },
  { to: "inventory",    label: "Inventory",    icon: "🗃️" },
  { to: "sales",        label: "Sales",        icon: "💰" },
  { to: "purchases",    label: "Purchases",    icon: "🛒" },
  { to: "customers",    label: "Customers",    icon: "👥" },
  { to: "suppliers",    label: "Suppliers",    icon: "🏭" },
  { to: "reports",      label: "Reports",      icon: "📈" },
  { to: "all-patients", label: "All Patients", icon: "🩺" },  // ← NEW
];

function NavLinks({ onLinkClick }) {
  return (
    <nav style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onLinkClick}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px", borderRadius: 10, marginBottom: 4,
            fontSize: 14, fontWeight: isActive ? 600 : 400,
            color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
            background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
            textDecoration: "none", transition: "all 0.18s",
            border: isActive ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
          })}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarShell({ children }) {
  return (
    <aside
      style={{
        width: "100%", height: "100%",
        background: "linear-gradient(180deg, #0a3d62 0%, #1565a8 100%)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>
          Retail IMS
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
          Inventory Management
        </div>
      </div>
      {children}
      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
        © 2025 Retail IMS
      </div>
    </aside>
  );
}

function DesktopSidebar() {
  return <SidebarShell><NavLinks /></SidebarShell>;
}

function MobileSidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 50,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: isOpen ? "4px 0 30px rgba(0,0,0,0.25)" : "none",
        display: "flex", flexDirection: "column",
      }}>
        <SidebarShell>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px 0" }}>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
          <NavLinks onLinkClick={onClose} />
        </SidebarShell>
      </div>
    </>
  );
}

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 50%, #e8f9f5 100%)", display: "flex" }}>
      <div style={{ width: 260, flexShrink: 0, display: "none" }} className="lg:block">
        <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <DesktopSidebar />
        </div>
      </div>

      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: "16px", overflowX: "hidden" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) { main { padding: 24px !important; } }
        @media (min-width: 1024px) {
          .lg\\:block { display: block !important; }
          .lg\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

import Topbar from "./Topbar";
export default MainLayout;