const production = import.meta.env.PROD;

export const environment = {
  production,
  api_path: production
    ? window.location.origin
    : import.meta.env.VITE_API_URL || "http://localhost:8080",
};
