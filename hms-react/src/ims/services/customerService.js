import api from "./api";

export const fetchCustomers = async () => {
  const { data } = await api.get("/customers");
  return data;
};

export const createCustomer = async (payload) => {
  const { data } = await api.post("/customers", payload);
  return data;
};
