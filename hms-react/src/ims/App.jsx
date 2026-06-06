import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasesPage from "./pages/PurchasesPage";
import ReportsPage from "./pages/ReportsPage";
import SalesPage from "./pages/SalesPage";
import SuppliersPage from "./pages/SuppliersPage";
import AllPatientsIMS from "./pages/AllPatientsIMS";
import { Toaster } from "react-hot-toast";

function IMSAppContent() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="products"      element={<ProductsPage />} />
          <Route path="inventory"     element={<InventoryPage />} />
          <Route path="sales"         element={<SalesPage />} />
          <Route path="purchases"     element={<PurchasesPage />} />
          <Route path="customers"     element={<CustomersPage />} />
          <Route path="suppliers"     element={<SuppliersPage />} />
          <Route path="reports"       element={<ReportsPage />} />
          <Route path="all-patients"  element={<AllPatientsIMS />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function IMSApp() {
  return (
    <AuthProvider>
      <IMSAppContent />
    </AuthProvider>
  );
}

export default IMSApp;