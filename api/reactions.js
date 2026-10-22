
import { getConnecterUser } from "../lib/session.js";
import { redis, keyFor } from "../lib/chatStore.js";
import { getAccessibleRoom } from "../lib/roomAccess.js";

const allowed = ["❤️", "😂", "👍", "😮"];

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                message: "Méthode non autorisée",
            });
        }

        const user = await getConnecterUser(req);

        if (!user) {
            return res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Session expirée",
            });
        }

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body || {};

        const { kind, emoji, messageId } = body;
        const targetId = Number(body.targetId);

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1 ||
            typeof messageId !== "string" ||
            !allowed.includes(emoji)
        ) {
            return res.status(400).json({
                message: "Réaction invalide",
            });
        }

        if (kind === "room") {
            const room = await getAccessibleRoom(
                user.id,
                targetId
            );

            if (!room) {
                return res.status(403).json({
                    message: "Accès refusé",
                });
            }
        }

        const key = keyFor(
            kind,
            user.id,
            targetId
        );

        const items = await redis.lrange(
            key,
            0,
            -1
        );

        const exists = items.some(item => {
            const message =
                typeof item === "string"
                    ? JSON.parse(item)
                    : item;

            return message.id === messageId;
        });

        if (!exists) {
            return res.status(404).json({
                message: "Message introuvable",
            });
        }

        const reactionKey =
            `reaction:${key}:${messageId}`;

        const old = await redis.hget(
            reactionKey,
            String(user.id)
        );

        if (old === emoji) {
            await redis.hdel(
                reactionKey,
                String(user.id)
            );
        } else {
            await redis.hset(reactionKey, {
                [String(user.id)]: emoji,
            });
        }

        await redis.expire(reactionKey, 86400);

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error("Reactions:", error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
