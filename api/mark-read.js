
import { getConnecterUser } from "../lib/session.js";
import { redis } from "../lib/chatStore.js";
import { getAccessibleRoom } from "../lib/roomAccess.js";

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

        if (
            !["user", "room"].includes(kind) ||
            !Number.isSafeInteger(targetId) ||
            targetId < 1
        ) {
            return res.status(400).json({
                message: "Conversation invalide",
            });
        }

        if (
            kind === "room" &&
            !await getAccessibleRoom(user.id, targetId)
        ) {
            return res.status(403).json({
                message: "Accès refusé",
            });
        }

        await redis.set(
            `read:${user.id}:${kind}:${targetId}`,
            new Date().toISOString(),
            {
                ex: 172800,
            }
        );

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error("Mark read:", error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
