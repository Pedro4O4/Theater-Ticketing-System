// Dynamically detect the host - works on both localhost and network IP
const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use the current hostname
        return `http://${window.location.hostname}:3001`;
    }
    // Server-side: fallback to localhost
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = `${BASE_URL}/api/v1`;


