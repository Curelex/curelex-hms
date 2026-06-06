import api from "./api";

export const fetchSuppliers = async () => {
  const { data } = await api.get("/suppliers");
  return data;
};

export const createSupplier = async (payload) => {
  const { data } = await api.post("/suppliers", payload);
  return data;
};
