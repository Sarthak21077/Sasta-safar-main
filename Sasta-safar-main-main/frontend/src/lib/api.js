import axios from "axios";

const baseUrl = process.env.REACT_APP_BACKEND_URL || "";
const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
const API_BASE_URL = `${cleanBaseUrl}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sasta_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
