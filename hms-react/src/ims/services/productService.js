import api from "./api";

const API_BASE = import.meta.env.VITE_IMS_API_URL || "https://curelex.in/ims/api/v1";

export const fetchProducts = async (params = {}) => {
  const { data } = await api.get("/products", { params });
  return data;
};

export const createProduct = async (payload) => {
  const isFormData = payload instanceof FormData;
  const { data } = await api.post("/products", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
  });
  return data;
};

export const updateProduct = async (id, payload) => {
  const isFormData = payload instanceof FormData;
  const { data } = await api.put(`/products/${id}`, payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
  });
  return data;
};

export const getProductQr = async (productId) => {
  const { data } = await api.get(`/products/${productId}/qr`);
  return data;
};

export const getProductBarcode = async (productId) => {
  const response = await api.get(`/products/${productId}/barcode`, {
    responseType: "blob"
  });
  return URL.createObjectURL(response.data);
};