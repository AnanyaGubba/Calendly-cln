const API_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  : "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getDashboard: () => request("/api/admin/dashboard"),
  getEventTypes: () => request("/api/admin/event-types"),
  createEventType: (payload) =>
    request("/api/admin/event-types", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEventType: (id, payload) =>
    request(`/api/admin/event-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEventType: (id) =>
    request(`/api/admin/event-types/${id}`, {
      method: "DELETE",
    }),
  updateAvailability: (payload) =>
    request("/api/admin/availability", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  cancelMeeting: (id, reason) =>
    request(`/api/admin/meetings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  createWorkflow: (payload) =>
    request("/api/admin/workflows", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPublicEvent: (slug, month) =>
    request(`/api/public/${slug}${month ? `?month=${month}` : ""}`),
  getPublicSlots: (slug, date) =>
    request(`/api/public/${slug}/slots?date=${date}`),
  bookSlot: (slug, payload) =>
    request(`/api/public/${slug}/book`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getConfirmation: (code) => request(`/api/public/confirmations/${code}`),
};
