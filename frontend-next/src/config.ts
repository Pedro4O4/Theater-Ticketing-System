// Use environment variable for production, fallback to localhost for development
const getBaseUrl = () => {
    // Check for environment variable first (for production)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
        // Client-side development: use the current hostname
        return `http://${window.location.hostname}:3001`;
    }
    // Server-side fallback
    return "http://localhost:3001";
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = `${BASE_URL}/api/v1`;
