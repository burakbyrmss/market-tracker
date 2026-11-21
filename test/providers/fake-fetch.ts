// A fetch stand-in that answers from fixtures. Each route matches when the URL contains its key.
export type Route = { body: unknown; status?: number };

export function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetchFn = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    const match = Object.entries(routes).find(([key]) => url.includes(key));
    if (!match) return new Response('not found', { status: 404 });
    const [, route] = match;
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  };
  return { fetch: fetchFn as typeof fetch, calls };
}
