const TOKEN_KEY = "volleyball_club_token";
const ROLE_KEY = "volleyball_club_role";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

export function setRole(role) {
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}
