import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'mock';

export function isMockMode(): boolean {
  return DATA_MODE.toLowerCase() === 'mock';
}

export function getDataMode(): 'mock' | 'api' {
  return isMockMode() ? 'mock' : 'api';
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let message = 'An unexpected API error occurred.';
    if (error.response?.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
      const detail = (error.response.data as { detail: unknown }).detail;
      message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    } else if (error.message) {
      message = error.message;
    }
    
    // Enrich error with friendly message
    const customError = new Error(message);
    (customError as { status?: number }).status = error.response?.status;
    return Promise.reject(customError);
  }
);
