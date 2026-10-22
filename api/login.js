
import { sql } from "@vercel/postgres";
import { Redis } from "@upstash/redis";

import {
    arrayBufferToBase64,
    stringToArrayBuffer,
} from "../lib/base64.js";

export const config = {
    runtime: "edge",
};

const redis = new Redis({
    url:
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.KV_REST_API_URL,
    token:
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        process.env.KV_REST_API_TOKEN,
});

function json(body, status = 200) {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}

export default async function handler(request) {
    if (request.method !== "POST") {
        return json(
            { message: "Méthode non autorisée" },
            405
        );
    }

    try {
        const body = await request.json();

        // Le champ username peut contenir un email
        // ou un identifiant classique.
        const identifier = String(
            body.username || ""
        ).trim();

        const password = String(
            body.password || ""
        );

        if (!identifier || !password) {
            return json(
                { message: "Champs obligatoires" },
                400
            );
        }

        // Retrouver l'utilisateur par username ou email
        const result = await sql`
      SELECT
        user_id,
        username,
        email,
        password,
        external_id
      FROM users
      WHERE LOWER(username) = LOWER(${identifier})
         OR LOWER(email) = LOWER(${identifier})
      LIMIT 1
    `;

        if (result.rows.length !== 1) {
            return json(
                {
                    code: "UNAUTHORIZED",
                    message:
                        "Identifiant ou mot de passe incorrect",
                },
                401
            );
        }

        const user = result.rows[0];

        // Conserver exactement le hashage historique
        const hash = await crypto.subtle.digest(
            "SHA-256",
            stringToArrayBuffer(
                user.username + password
            )
        );

        const hashed64 =
            arrayBufferToBase64(hash);

        if (hashed64 !== user.password) {
            return json(
                {
                    code: "UNAUTHORIZED",
                    message:
                        "Identifiant ou mot de passe incorrect",
                },
                401
            );
        }

        await sql`
      UPDATE users
      SET last_login = NOW()
      WHERE user_id = ${user.user_id}
    `;

        const token = crypto.randomUUID();

        const sessionUser = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            externalId: user.external_id,
        };

        await redis.set(
            token,
            sessionUser,
            { ex: 3600 }
        );

        await redis.hset("users", {
            [String(user.user_id)]: sessionUser,
        });

        return json({
            token,
            id: user.user_id,
            username: user.username,
            externalId: user.external_id,
        });
    } catch (error) {
        console.error("Login:", error);

        return json(
            { message: "Erreur serveur" },
            500
        );
    }
}
