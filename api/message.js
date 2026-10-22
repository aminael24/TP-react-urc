
import { randomUUID } from "node:crypto";
import { sql } from "@vercel/postgres";

import { getConnecterUser } from "../lib/session.js";
import { redis, keyFor } from "../lib/chatStore.js";

import {
    notifyUser,
    notifyRoom,
} from "../lib/push.js";

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

        const kind = body.kind;
        const targetId = Number(body.targetId);
        const content = String(body.content || "").trim();
        const imageUrl = body.imageUrl || null;

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1 ||
            content.length > 2000 ||
            (!content && !imageUrl)
        ) {
            return res.status(400).json({
                message: "Message invalide",
            });
        }

        if (imageUrl) {
            let parsed;

            try {
                parsed = new URL(imageUrl);
            } catch {
                return res.status(400).json({
                    message: "URL image invalide",
                });
            }

            if (
                parsed.protocol !== "https:" ||
                !parsed.hostname.endsWith(
                    ".public.blob.vercel-storage.com"
                )
            ) {
                return res.status(400).json({
                    message: "Image non autorisée",
                });
            }

            // Pour un projet public, vérifier également
            // l'appartenance du fichier à TON stockage Blob.
        }

        if (
            kind === "user" &&
            Number(user.id) === targetId
        ) {
            return res.status(400).json({
                message: "Destinataire invalide",
            });
        }

        const result =
            kind === "user"
                ? await sql`
                        SELECT user_id, external_id
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
                message: "Destinataire introuvable",
            });
        }

        const message = {
            id: randomUUID(),
            senderId: Number(user.id),
            senderName: user.username,
            content,
            imageUrl,
            createdAt: new Date().toISOString(),
        };

        const key = keyFor(
            kind,
            user.id,
            targetId
        );

        await redis.lpush(
            key,
            JSON.stringify(message)
        );

        await redis.expire(key, 86400);

        // Les erreurs de notification ne doivent
        // pas empêcher l'envoi des messages.
        try {
            if (kind === "user") {
                await notifyUser(
                    result.rows[0].external_id,
                    user.username,
                    content,
                    Number(user.id)
                );
            } else {
                await notifyRoom(
                    targetId,
                    user.username,
                    content
                );
            }
        } catch (error) {
            console.error("Notification:", error);
        }

        return res.status(201).json(message);
    } catch (error) {
        console.error("Message:", error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
