const BASE = "/api/v1";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`Request failed (${res.status}). Is the server running on port 5001?`);
  return res.json();
}

export const wsUrl = () => `ws://${window.location.hostname}:5001/live-telemetry`;

export const label = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const gradeColor = (g: string) => (g === "S" || g === "A" ? "#10B981" : g === "FAIL" ? "#EF4444" : "#F59E0B");
