const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "An API error occurred");
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

  // Categories & Workers
  getCategories: () => fetchAPI("/categories", { method: "GET" }),
  getWorkers: () => fetchAPI("/users/workers", { method: "GET" }),

  // Analytics (Admin Only)
  getAnalytics: () => fetchAPI("/analytics", { method: "GET" }),
};
