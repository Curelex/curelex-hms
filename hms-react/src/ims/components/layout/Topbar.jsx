import useAuth from "../../hooks/useAuth";

const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/ims/login";
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 60,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(10,61,98,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        gap: 12,
      }}
    >
      {/* Left: hamburger + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          style={{
            background: "none",
            border: "1px solid rgba(10,61,98,0.15)",
            borderRadius: 8,
            width: 36,
            height: 36,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            flexShrink: 0,
            padding: 0,
          }}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 18, height: 2, background: "#0a3d62", borderRadius: 2 }} />
          <span style={{ display: "block", width: 14, height: 2, background: "#0a3d62", borderRadius: 2 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "#0a3d62", borderRadius: 2 }} />
        </button>

        {/* Title */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#1565a8",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Inventory Management System
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#0a3d62",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Welcome, {user?.fullName || "User"}
          </div>
        </div>
      </div>

      {/* Right: logout */}
      <button
        onClick={handleLogout}
        style={{
          background: "#0a3d62",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
          transition: "background 0.18s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#1565a8")}
        onMouseLeave={e => (e.currentTarget.style.background = "#0a3d62")}
      >
        Logout
      </button>
    </header>
  );
};

export default Topbar;