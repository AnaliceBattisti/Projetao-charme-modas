export const BASE_URL = "http://localhost:3333";

async function request(path, options, { rawBody = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: rawBody ? undefined : { "Content-Type": "application/json" },
    // O cookie de sessão do painel só existe em /painel, que responde com CORS
    // configurado pra credenciais. As demais rotas usam cors() aberto (Allow-Origin: *),
    // que o navegador recusa combinar com credentials: "include" — mandar em todas
    // quebrava toda chamada fora de /painel com "Failed to fetch".
    credentials: path.startsWith("/painel/") ? "include" : "omit",
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.erro || `Erro ${res.status} em ${path}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(()=>({}));
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
  // Sem Content-Type manual: o browser define o boundary do multipart sozinho.
  upload: (path, formData) => request(path, { method: "POST", body: formData }, { rawBody: true }),
};
