import useAuth from "./useAuth";

const usePermissions = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const isAdmin = user?.role === "admin";

  const can = (permission) => isAdmin || permissions.includes(permission);

  return {
    isAdmin,
    can,
    canWriteProducts: can("products.write"),  // ← add this
    canWriteSuppliers: can("suppliers.write") // ← add this
  };
};

export default usePermissions;