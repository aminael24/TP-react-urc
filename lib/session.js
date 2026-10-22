
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getConnecterUser(request) {
    const header =
        new Headers(request.headers).get(
            "Authorization"
        ) || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    const token = header.slice(7).trim();

    if (!token) {
        return null;
    }

    return await redis.get(token);
}

export async function checkSession(request) {
    const user = await getConnecterUser(request);

    return user !== null && user !== undefined;
}

export function unauthorizedResponse() {
    return new Response(
        JSON.stringify({
            code: "UNAUTHORIZED",
            message: "Session expired",
        }),
        {
            status: 401,
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}

export function triggerNotConnected(res) {
    return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Session expired",
    });
}
