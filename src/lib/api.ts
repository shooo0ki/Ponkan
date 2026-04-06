export function getMemberId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('memberId');
}

export function setMemberId(id: string): void {
  localStorage.setItem('memberId', id);
}

export function clearMemberId(): void {
  localStorage.removeItem('memberId');
}

// X-Member-Id ヘッダー付きフェッチ
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const memberId = getMemberId();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(memberId ? { 'X-Member-Id': memberId } : {}),
      ...options?.headers,
    },
  });
}
