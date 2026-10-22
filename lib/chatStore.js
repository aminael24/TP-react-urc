
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export function keyFor(kind, me, target) {
    if (kind === "room") {
        return `chat:room:${target}`;
    }

    const ids = [
        Number(me),
        Number(target),
    ].sort((a, b) => a - b);

    return `chat:user:${ids[0]}:${ids[1]}`;
}
