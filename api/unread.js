
import { sql } from "@vercel/postgres";

import { getConnecterUser } from "../lib/session.js";
import { redis, keyFor } from "../lib/chatStore.js";

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

        const users = await sql`
            SELECT user_id
            FROM users
            WHERE user_id <> ${user.id}
        `;

        const rooms = await sql`
            SELECT r.room_id
            FROM rooms r
            WHERE
                NOT r.is_private
               OR r.created_by = ${user.id}
               OR EXISTS (
                SELECT 1
                FROM room_members m
                WHERE m.room_id = r.room_id
                  AND m.user_id = ${user.id}
            )
        `;

        const targets = [
            ...users.rows.map(row => ({
                kind: "user",
                targetId: row.user_id,
            })),
            ...rooms.rows.map(row => ({
                kind: "room",
                targetId: row.room_id,
            })),
        ];

        const counters = {};

        await Promise.all(
            targets.map(async ({ kind, targetId }) => {
                const key = keyFor(
                    kind,
                    user.id,
                    targetId
                );

                const [lastRead, items] =
                    await Promise.all([
                        redis.get(
                            `read:${user.id}:${kind}:${targetId}`
                        ),
                        redis.lrange(key, 0, 199),
                    ]);

                const lastTime = lastRead
                    ? new Date(lastRead).getTime()
                    : 0;

                counters[`${kind}/${targetId}`] =
                    items.filter(item => {
                        const message =
                            typeof item === "string"
                                ? JSON.parse(item)
                                : item;

                        return (
                            Number(message.senderId) !==
                            Number(user.id) &&
                            new Date(
                                message.createdAt
                            ).getTime() > lastTime
                        );
                    }).length;
            })
        );

        return res.status(200).json(counters);
    } catch (error) {
        console.error("Unread:", error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
