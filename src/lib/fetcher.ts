// src/lib/fetcher.ts
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Failed to fetch ${url}: ${res.statusText}`);
    // @ts-expect-error attach status for richer error handling
    err.status = res.status;
    throw err;
  }
  return res.json();
}