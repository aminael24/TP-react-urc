
import { sql } from "@vercel/postgres";

import { getConnecterUser } from "../lib/session.js";
import { redis, keyFor } from "../lib/chatStore.js";
import { getAccessibleRoom } from "../lib/roomAccess.js";

export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
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

        const kind = req.query.kind;
        const targetId = Number(req.query.targetId);

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1
        ) {
            return res.status(400).json({
                message: "Conversation invalide",
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
        } else {
            const exists = await sql`
        SELECT user_id
        FROM users
        WHERE user_id = ${targetId}
      `;

            if (!exists.rows.length) {
                return res.status(404).json({
                    message: "Utilisateur introuvable",
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
            199
        );

        const messages = items
            .map(item =>
                typeof item === "string"
                    ? JSON.parse(item)
                    : item
            )
            .reverse();

        const result = await Promise.all(
            messages.map(async message => {
                const stored = await redis.hgetall(
                    `reaction:${key}:${message.id}`
                );

                const reactions = {};

                for (const emoji of Object.values(
                    stored || {}
                )) {
                    reactions[emoji] =
                        (reactions[emoji] || 0) + 1;
                }

                return {
                    ...message,
                    reactions,
                };
            })
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error("Messages:", error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
