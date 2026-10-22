interface Staff { role:'admin'|'staff'; name: string; email: string; csrf: string }
export function useStaff() {
  const staff = useState<Staff | null>('staff', () => null);
  const request = useRequestFetch();
  async function ensure() { if (!staff.value) staff.value = await request<Staff>('/api/auth/session'); return staff.value; }
  async function mutate<T>(url: string, options: { method: 'POST' | 'PATCH' | 'PUT'; body?: unknown }) {
    const session = await ensure();
    try { return await $fetch<T>(url, { ...options, body: options.body as Record<string, unknown> | undefined, headers: { 'x-csrf-token': session.csrf } }); }
    catch (error) { const status = (error as { status?: number }).status; if (status === 401) { staff.value = null; await navigateTo('/admin/login'); } throw error; }
  }
  return { staff, ensure, mutate };
}
