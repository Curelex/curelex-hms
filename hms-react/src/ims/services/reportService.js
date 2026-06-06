import api from "./api";

export const fetchDashboardSummary = async (period = "daily") => {
  const { data } = await api.get("/reports/dashboard", { params: { period } });
  return data;
};

export const fetchStockReport = async () => {
  const { data } = await api.get("/reports/stock");
  return data;
};

export const fetchMovementReport = async () => {
  const { data } = await api.get("/reports/movement");
  return data;
};
