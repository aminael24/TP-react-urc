
import { sql } from "@vercel/postgres";

import {
    getConnecterUser,
} from "../lib/session";

import {
    redis,
    keyFor,
} from "../lib/chatStore";

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
                message: "Session expired",
            });
        }

        const kind = String(
            req.query.kind || ""
        );

        const targetId = Number(
            req.query.targetId
        );

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1
        ) {
            return res.status(400).json({
                message: "Destination invalide",
            });
        }

        const result =
            kind === "user"
                ? await sql`
            SELECT user_id
            FROM users
            WHERE user_id = ${targetId}
          `
                : await sql`
            SELECT room_id
            FROM rooms
            WHERE room_id = ${targetId}
          `;

        if (!result.rows.length) {
            return res.status(404).json({
                message: "Conversation introuvable",
            });
        }

        const key = keyFor(
            kind,
            user.id,
            targetId
        );

        const data = await redis.lrange(
            key,
            0,
            199
        );

        const messages = data
            .map((item) =>
                typeof item === "string"
                    ? JSON.parse(item)
                    : item
            )
            .reverse();

        return res.status(200).json(messages);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
