
import { getConnecterUser } from "../lib/session";
import { redis } from "../lib/chatStore";

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
                message: "UNAUTHORIZED",
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

        const key =
            `read:${user.id}:${kind}:${targetId}`;

        await redis.set(
            key,
            new Date().toISOString(),
            { ex: 172800 }
        );

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
