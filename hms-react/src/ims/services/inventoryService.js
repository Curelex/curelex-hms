import api from "./api";

export const fetchInventory = async () => {
  const { data } = await api.get("/inventory");
  return data;
};

export const fetchLowStock = async () => {
  const { data } = await api.get("/inventory/low-stock");
  return data;
};

export const adjustInventory = async (payload) => {
  const { data } = await api.post("/inventory/adjust", payload);
  return data;
};
