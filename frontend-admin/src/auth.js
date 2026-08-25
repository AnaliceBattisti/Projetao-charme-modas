const AUTH_KEY = "cm_logged_in";

// Placeholder de sessão no localStorage. O backend ainda não tem endpoint
// de login/autenticação real (só o modelo Usuario no schema) — isso serve
// pra travar a navegação até essa parte ser implementada de verdade (JWT).
export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === "1";
}

export function login() {
  localStorage.setItem(AUTH_KEY, "1");
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}
