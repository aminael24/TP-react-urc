
export async function api<T>(
    path: string,
    options: RequestInit = {},
    token?: string
): Promise<T> {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(path, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            data.message ||
            data.error ||
            `Erreur HTTP ${response.status}`;

        throw new Error(message);
    }

    return data as T;
}
