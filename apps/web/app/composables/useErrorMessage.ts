export function errorMessage(error: unknown, fallback = 'No se ha podido completar la operación. Inténtalo de nuevo.') {
  const value = error as { data?: { message?: string; issues?: { message: string }[] } };
  return value?.data?.issues?.[0]?.message || value?.data?.message || fallback;
}
