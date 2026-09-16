export const BASE = "https://qozhbbkylgwbhhlcjako.supabase.co/functions/v1/api";

export function getSession() {
  try {
    const raw = localStorage.getItem("roster_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(s) {
  if (s) localStorage.setItem("roster_session", JSON.stringify(s));
  else localStorage.removeItem("roster_session");
}

export async function api(path, { method = "GET", body } = {}) {
  const session = getSession();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { "x-session": session.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && session) {
    setSession(null);
    window.location.reload();
    throw new Error("Signed out");
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    if (data.offline) {
      err.offline = true;
      err.org = data.org;
      // let the app shell swap to the offline screen even when the failing
      // call happened deep inside a page
      window.dispatchEvent(new CustomEvent("org-offline", { detail: data.org }));
    }
    throw err;
  }
  return data;
}
