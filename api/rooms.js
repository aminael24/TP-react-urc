
import { sql } from "@vercel/postgres";

import {
    checkSession,
    unauthorizedResponse,
} from "../lib/session";

export const config = {
    runtime: "edge",
};

export default async function handler(request) {
    try {
        const connected = await checkSession(request);

        if (!connected) {
            return unauthorizedResponse();
        }

        const { rows } = await sql`
      SELECT room_id, name
      FROM rooms
      ORDER BY room_id
    `;

        return Response.json(rows);
    } catch (error) {
        console.error(error);

        return Response.json(
            { message: "Erreur serveur" },
            { status: 500 }
        );
    }
}
