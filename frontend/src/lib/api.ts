// API Client Layer - Production Build v1.1.0

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }

  // Production fallback for Render deployment
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return "https://grievance-backend-0uld.onrender.com/api";
  }

  return "http://localhost:5000/api";
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("token");
  }
  return null;
}

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("token", token);
      localStorage.removeItem("token"); // clear any old persistent tokens
    } else {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
    }
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error(`Network error: Cannot connect to backend at ${baseUrl}. Is the server running?`);
  }

  const contentType = response.headers.get("content-type");
  let data: any;

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(`Invalid JSON response from ${baseUrl}.`);
    }
  } else {
    throw new Error(`Backend at ${baseUrl} returned non-JSON response (status ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `API Request failed with status ${response.status}`);
  }

  return data;
}


export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    fetchAPI("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),

  register: (user: any) =>
    fetchAPI("/auth/register", { method: "POST", body: JSON.stringify(user) }),

  googleLogin: (credential: any, role?: string) =>
    fetchAPI("/auth/google", { method: "POST", body: JSON.stringify({ credential, role }) }),

  getMe: () => fetchAPI("/auth/me", { method: "GET" }),

  // Upload
  uploadImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    return fetchAPI("/upload", {
      method: "POST",
      body: formData,
    });
  },

  // Complaints
  getComplaints: (params?: { status?: string; category?: string; priority?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/complaints${query ? `?${query}` : ""}`, { method: "GET" });
  },

  getComplaintById: (id: string) => fetchAPI(`/complaints/${id}`, { method: "GET" }),

  createComplaint: (data: any) =>
    fetchAPI("/complaints", { method: "POST", body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string, comment?: string) =>
    fetchAPI(`/complaints/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, comment }),
    }),

  assignWorker: (id: string, workerId: string) =>
    fetchAPI(`/complaints/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ workerId }),
    }),

  escalateComplaint: (id: string, priority?: string, reason?: string) =>
    fetchAPI(`/complaints/${id}/escalate`, {
      method: "PATCH",
      body: JSON.stringify({ priority, reason }),
    }),

  rateComplaint: (id: string, rating: number, feedback?: string) =>
    fetchAPI(`/complaints/${id}/rating`, {
      method: "POST",
      body: JSON.stringify({ rating, feedback }),
    }),

  // Categories
  getCategories: () => fetchAPI("/categories", { method: "GET" }),

  // User Management (Admin Only)
  getWorkers: () => fetchAPI("/users/workers", { method: "GET" }),
  getUsers: (role?: string) => fetchAPI(`/users${role ? `?role=${role}` : ""}`, { method: "GET" }),
  createUser: (userData: any) => fetchAPI("/users", { method: "POST", body: JSON.stringify(userData) }),
  deleteUser: (id: string) => fetchAPI(`/users/${id}`, { method: "DELETE" }),

  // Analytics (Admin Only)
  getAnalytics: () => fetchAPI("/analytics", { method: "GET" }),
};
