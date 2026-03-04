const KEY = 'auth_session_v1';

export function saveSession({ token, profile }) {
  if (!token || !profile) return;
  const data = { token, profile };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getSavedSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
