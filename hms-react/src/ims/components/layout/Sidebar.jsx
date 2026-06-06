import { useEffect } from "react";
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
  { to: "all-patients", label: "All Patients", icon: "🩺" },   // ← NEW
];

const Sidebar = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && onClose) onClose();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 40, backdropFilter: "blur(2px)",
          }}
        />
      )}

      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
          background: "linear-gradient(180deg, #0a3d62 0%, #1565a8 100%)",
          zIndex: 50, display: "flex", flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: isOpen ? "4px 0 30px rgba(0,0,0,0.25)" : "none",
        }}
        className="lg:static lg:transform-none lg:shadow-none"
      >
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>
              Retail IMS
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              Inventory Management
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            className="lg:hidden"
          >✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { if (window.innerWidth < 1024 && onClose) onClose(); }}
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

        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontSize: 11, color: "rgba(255,255,255,0.35)",
        }}>
          © 2025 Retail IMS
        </div>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          aside[data-ims-sidebar] {
            position: static !important;
            transform: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;