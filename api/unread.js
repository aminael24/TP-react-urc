
import { sql } from "@vercel/postgres";
import { getConnecterUser } from "../lib/session";
import { redis, keyFor } from "../lib/chatStore";

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
                message: "UNAUTHORIZED",
            });
        }

        const users = await sql`
      SELECT user_id FROM users
      WHERE user_id <> ${user.id}
    `;

        const rooms = await sql`
      SELECT room_id FROM rooms
    `;

        const targets = [
            ...users.rows.map((u) => ({
                kind: "user",
                targetId: u.user_id,
            })),
            ...rooms.rows.map((r) => ({
                kind: "room",
                targetId: r.room_id,
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

                const readKey =
                    `read:${user.id}:${kind}:${targetId}`;

                const [lastRead, items] = await Promise.all([
                    redis.get(readKey),
                    redis.lrange(key, 0, 199),
                ]);

                const lastTime = lastRead
                    ? new Date(lastRead).getTime()
                    : 0;

                counters[`${kind}/${targetId}`] =
                    items.filter((item) => {
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
        console.error(error);

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
