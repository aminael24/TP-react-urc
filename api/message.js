
import { randomUUID } from "node:crypto";
import { sql } from "@vercel/postgres";

import { getConnecterUser } from "../lib/session.js";
import { redis, keyFor } from "../lib/chatStore.js";

import {
    getAccessibleRoom,
    getPrivateRoomRecipients,
} from "../lib/roomAccess.js";

import {
    notifyUser,
    notifyRoom,
    notifyPrivateRoom,
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
        const replyTo = body.replyTo ?? null;

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1 ||
            content.length > 2000 ||
            (!content && !imageUrl) ||
            (
                replyTo !== null &&
                (
                    typeof replyTo !== "string" ||
                    replyTo.length > 100
                )
            )
        ) {
            return res.status(400).json({
                message: "Message invalide",
            });
        }

        if (imageUrl) {
            if (typeof imageUrl !== "string") {
                return res.status(400).json({
                    message: "Image invalide",
                });
            }

            let url;

            try {
                url = new URL(imageUrl);
            } catch {
                return res.status(400).json({
                    message: "URL image invalide",
                });
            }

            if (
                url.protocol !== "https:" ||
                !url.hostname.endsWith(
                    ".public.blob.vercel-storage.com"
                )
            ) {
                return res.status(400).json({
                    message: "Image non autorisée",
                });
            }
        }

        if (
            kind === "user" &&
            Number(user.id) === targetId
        ) {
            return res.status(400).json({
                message: "Destinataire invalide",
            });
        }

        const room =
            kind === "room"
                ? await getAccessibleRoom(
                    user.id,
                    targetId
                )
                : null;

        if (kind === "room" && !room) {
            return res.status(403).json({
                message: "Accès au salon refusé",
            });
        }

        const result =
            kind === "user"
                ? await sql`
            SELECT user_id, external_id
            FROM users
            WHERE user_id = ${targetId}
          `
                : { rows: [room] };

        if (!result.rows.length) {
            return res.status(404).json({
                message: "Destinataire introuvable",
            });
        }

        const key = keyFor(
            kind,
            user.id,
            targetId
        );

        // Vérifier le message auquel on répond
        if (replyTo) {
            const items = await redis.lrange(
                key,
                0,
                -1
            );

            const found = items.some(item => {
                const message =
                    typeof item === "string"
                        ? JSON.parse(item)
                        : item;

                return message.id === replyTo;
            });

            if (!found) {
                return res.status(404).json({
                    message: "Message parent introuvable",
                });
            }
        }

        const message = {
            id: randomUUID(),
            senderId: Number(user.id),
            senderName: user.username,
            content,
            imageUrl,
            replyTo,
            createdAt: new Date().toISOString(),
        };

        await redis.lpush(
            key,
            JSON.stringify(message)
        );

        await redis.expire(key, 86400);

        // Ne pas bloquer le message si Pusher échoue
        try {
            if (kind === "user") {
                await notifyUser(
                    result.rows[0].external_id,
                    user.username,
                    content,
                    Number(user.id)
                );
            } else if (room.is_private) {
                const recipients =
                    await getPrivateRoomRecipients(
                        targetId,
                        user.id
                    );

                await notifyPrivateRoom(
                    targetId,
                    recipients,
                    user.username,
                    content
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
