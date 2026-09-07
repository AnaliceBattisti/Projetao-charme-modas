export const BASE_URL = "http://localhost:3333";

async function request(path, options, { rawBody = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: rawBody ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} em ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
  // Sem Content-Type manual: o browser define o boundary do multipart sozinho.
  upload: (path, formData) => request(path, { method: "POST", body: formData }, { rawBody: true }),
};
