// Usa o mesmo hostname da loja para manter o cookie entre as portas locais.
export const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3333`
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: path.startsWith("/auth/") ? "include" : "omit",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.",
      0,
    );
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.error || data?.erro || "Não foi possível concluir a solicitação.",
      response.status,
    );
  if (!data)
    throw new ApiError(
      "O servidor retornou uma resposta inválida.",
      response.status,
    );
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
};

export function imagemUrl(caminho) {
  return caminho ? `${BASE_URL}${caminho}` : null;
}
