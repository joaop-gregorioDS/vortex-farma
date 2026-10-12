import type { Session } from "./types";
export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-VF-CSRF": token } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message =
      "Não foi possível conectar ao serviço. Verifique se a API está ativa.";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    if (response.status === 401)
      message = "Sua sessão expirou. Inicie uma nova demonstração.";
    throw new Error(message);
  }
  return response.json();
}
let sessionPromise: Promise<Session> | undefined;
export function initializeSession() {
  if (!sessionPromise)
    sessionPromise = (async () => {
      const response = await fetch("/api/session");
      if (response.status === 401)
        return request<Session>("/session", { method: "POST" });
      if (!response.ok)
        throw new Error(
          "A API está indisponível. Inicie os serviços para explorar a demonstração.",
        );
      return response.json() as Promise<Session>;
    })().catch((error) => {
      sessionPromise = undefined;
      throw error;
    });
  return sessionPromise;
}
export function clearSession() {
  sessionPromise = undefined;
}
