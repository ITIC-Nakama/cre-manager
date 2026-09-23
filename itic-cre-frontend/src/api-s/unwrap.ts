/** Le backend enveloppe chaque reponse dans {messageKey, message, statusCode, data} ; retourne le contenu utile. */
export function unwrap<T>(response: { data: unknown }): T {
  const d = response.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}
