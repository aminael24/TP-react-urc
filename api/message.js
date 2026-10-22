
import { randomUUID } from "node:crypto";
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
        if (req.method !== "POST") {
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

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body || {};

        const kind = body.kind;
        const targetId = Number(body.targetId);
        const content = String(
            body.content || ""
        ).trim();

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1 ||
            !content ||
            content.length > 2000
        ) {
            return res.status(400).json({
                message: "Message invalide",
            });
        }

        if (
            kind === "user" &&
            targetId === Number(user.id)
        ) {
            return res.status(400).json({
                message:
                    "Tu ne peux pas t'envoyer un message",
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
                message: "Destination introuvable",
            });
        }

        const message = {
            id: randomUUID(),
            senderId: Number(user.id),
            senderName: user.username,
            content,
            createdAt: new Date().toISOString(),
        };

        const key = keyFor(
            kind,
            user.id,
            targetId
        );

        await redis.lpush(key, JSON.stringify(message));

        await redis.expire(key, 86400);

        return res.status(201).json(message);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
