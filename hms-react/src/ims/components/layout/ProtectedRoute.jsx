import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    // Only save the attempted path if it's a real protected page (not login itself)
    const currentPath = window.location.pathname;
    if (!currentPath.includes("/pharmacy/login")) {
      sessionStorage.setItem("ims_redirectPath", currentPath);
    }
    return <Navigate to="/pharmacy/login" replace />;
  }

  return children;
};

export default ProtectedRoute;