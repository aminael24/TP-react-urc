
import { sql, db } from "@vercel/postgres";
import { getConnecterUser } from "../lib/session.js";

export default async function handler(req, res) {
    try {
        if (!["GET", "POST"].includes(req.method)) {
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

        if (req.method === "GET") {
            const { rows } = await sql`
        SELECT
          r.room_id,
          r.name,
          r.is_private,
          r.created_by
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
        ORDER BY r.room_id
      `;

            return res.status(200).json(rows);
        }

        // POST : créer un nouveau groupe
        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body || {};

        const name = String(body.name || "").trim();
        const isPrivate = body.isPrivate;

        if (
            name.length < 3 ||
            name.length > 50 ||
            typeof isPrivate !== "boolean"
        ) {
            return res.status(400).json({
                message: "Nom ou visibilité invalide",
            });
        }

        const ids = body.memberIds ?? [];

        if (
            !Array.isArray(ids) ||
            ids.length > 50 ||
            ids.some(
                id =>
                    !Number.isSafeInteger(id) ||
                    id < 1
            )
        ) {
            return res.status(400).json({
                message: "Membres invalides",
            });
        }

        const members = [
            ...new Set([
                Number(user.id),
                ...(isPrivate ? ids : []),
            ]),
        ];

        const existing = await sql.query(
            `SELECT user_id
       FROM users
       WHERE user_id = ANY($1::int[])`,
            [members]
        );

        if (existing.rows.length !== members.length) {
            return res.status(400).json({
                message: "Un utilisateur est introuvable",
            });
        }

        // Transaction PostgreSQL
        const client = await db.connect();

        try {
            await client.query("BEGIN");

            const created = await client.query(
                `INSERT INTO rooms
          (name, created_on, created_by, is_private)
         VALUES ($1, NOW(), $2, $3)
         RETURNING
           room_id,
           name,
           is_private,
           created_by`,
                [name, user.id, isPrivate]
            );

            const room = created.rows[0];

            if (isPrivate) {
                for (const id of members) {
                    await client.query(
                        `INSERT INTO room_members
              (room_id, user_id)
             VALUES ($1, $2)`,
                        [room.room_id, id]
                    );
                }
            }

            await client.query("COMMIT");

            return res.status(201).json(room);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Rooms:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ce nom de salon existe déjà",
            });
        }

        return res.status(500).json({
            message: "Erreur serveur",
        });
    }
}
