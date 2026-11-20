/* Appel IA via le proxy serveur (/api/claude). Aucune clé n'existe côté navigateur. */
export const callClaude = (jsonBody) =>
  fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: jsonBody });
