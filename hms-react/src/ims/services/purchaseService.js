import api from "./api";

export const fetchPurchases = async () => {
  const { data } = await api.get("/purchases");
  return data;
};

export const createPurchase = async (payload) => {
  const { data } = await api.post("/purchases", payload);
  return data;
};
