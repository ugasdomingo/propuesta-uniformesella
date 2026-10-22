export function errorMessage(error: unknown, fallback = 'No se ha podido completar la operación. Inténtalo de nuevo.') {
  const value = error as { data?: { message?: string; issues?: { message: string }[] } };
  const message=value?.data?.issues?.[0]?.message || value?.data?.message;
  return message && !/^(Bad Gateway|fetch failed|Service Unavailable)$/i.test(message) ? message : fallback;
}
