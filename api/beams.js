
import PushNotifications from
        "@pusher/push-notifications-server";

import {
    getConnecterUser,
} from "../lib/session.js";

export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                message: "Méthode non autorisée",
            });
        }

        const user = await getConnecterUser(req);

        if (
            !user ||
            String(req.query.user_id) !==
            String(user.externalId)
        ) {
            return res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Session invalide",
            });
        }

        const instanceId =
            process.env.PUSHER_INSTANCE_ID;

        const secretKey =
            process.env.PUSHER_SECRET_KEY;

        if (!instanceId || !secretKey) {
            return res.status(503).json({
                message: "Pusher non configuré",
            });
        }

        const beams = new PushNotifications({
            instanceId,
            secretKey,
        });

        const token = beams.generateToken(
            user.externalId
        );

        return res.status(200).json(token);
    } catch (error) {
        console.error("Pusher auth:", error);

        return res.status(500).json({
            message: "Erreur Pusher",
        });
    }
}
