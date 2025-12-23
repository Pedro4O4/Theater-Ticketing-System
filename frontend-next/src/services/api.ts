import axios from "axios";
import { API_BASE_URL } from "../config";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 15000, // 15 seconds timeout
});

// Add interceptor for token if not using cookies only
api.interceptors.request.use((config) => {
    // Optional: add token from local storage if needed
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
