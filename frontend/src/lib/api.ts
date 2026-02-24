const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Types
export interface Activity {
  id: string;
  name: string;
  location: string;
  duration_minutes: number;
  description: string;
  activity_order: number;
  best_time: string;
  created_at: string;
}

export interface Day {
  id: string;
  date: string | null;
  day_number: number;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  days: Day[];
  created_at: string;
  updated_at: string;
}

export interface ItinerarySummary {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  day_count: number;
  created_at: string;
}

export interface ExtractedActivity {
  name: string;
  location: string;
  duration_minutes: number;
  description: string;
  best_time: string;
}

// API calls
export const api = {
  // Itineraries
  listItineraries: () => request<ItinerarySummary[]>("/api/itineraries/"),

  createItinerary: (data: { title: string; destination?: string; start_date?: string; end_date?: string }) =>
    request<Itinerary>("/api/itineraries/", { method: "POST", body: JSON.stringify(data) }),

  getItinerary: (id: string) => request<Itinerary>(`/api/itineraries/${encodeURIComponent(id)}`),

  updateItinerary: (id: string, data: { title?: string; destination?: string }) =>
    request<Itinerary>(`/api/itineraries/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteItinerary: (id: string) =>
    request<void>(`/api/itineraries/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Days
  addDay: (itineraryId: string, data: { day_number: number; date?: string }) =>
    request<Day>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days`, { method: "POST", body: JSON.stringify(data) }),

  deleteDay: (itineraryId: string, dayId: string) =>
    request<void>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}`, { method: "DELETE" }),

  // Activities
  addActivity: (itineraryId: string, dayId: string, data: { name: string; location?: string; duration_minutes?: number; description?: string; best_time?: string }) =>
    request<Activity>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}/activities`, { method: "POST", body: JSON.stringify(data) }),

  updateActivity: (itineraryId: string, dayId: string, activityId: string, data: Partial<Activity>) =>
    request<Activity>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}/activities/${encodeURIComponent(activityId)}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteActivity: (itineraryId: string, dayId: string, activityId: string) =>
    request<void>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}/activities/${encodeURIComponent(activityId)}`, { method: "DELETE" }),

  reorderActivities: (itineraryId: string, dayId: string, activityIds: string[]) =>
    request<Activity[]>(`/api/itineraries/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ activity_ids: activityIds }),
    }),

  moveActivity: (itineraryId: string, data: { activity_id: string; source_day_id: string; target_day_id: string; new_order: number }) =>
    request(`/api/itineraries/${encodeURIComponent(itineraryId)}/move-activity`, { method: "POST", body: JSON.stringify(data) }),

  // Export / Import
  exportItinerary: (id: string, format: "json" | "markdown") => {
    const url = `${API_BASE}/api/itineraries/${encodeURIComponent(id)}/export?format=${format}`;
    return url;
  },

  importItinerary: async (file: File): Promise<Itinerary> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/itineraries/import`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Import failed: ${res.status}`);
    }
    return res.json();
  },

  // LLM Extraction
  extractActivities: (text: string) =>
    request<{ activities: ExtractedActivity[] }>("/api/extract/", { method: "POST", body: JSON.stringify({ text }) }),

  applyExtractedActivities: (itineraryId: string, dayId: string, activities: ExtractedActivity[]) =>
    request(`/api/extract/apply/${encodeURIComponent(itineraryId)}/days/${encodeURIComponent(dayId)}`, {
      method: "POST",
      body: JSON.stringify({ activities }),
    }),
};
