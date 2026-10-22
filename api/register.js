
import { sql } from "@vercel/postgres";

import {
    arrayBufferToBase64,
    stringToArrayBuffer,
} from "../lib/base64.js";

export const config = {
    runtime: "edge",
};

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
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

        const username = String(
            body.username || ""
        ).trim();

        const email = String(
            body.email || ""
        ).trim().toLowerCase();

        const password = String(
            body.password || ""
        );

        if (
            username.length < 3 ||
            username.length > 50 ||
            !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)||
            email.length > 255 ||
            password.length < 8
        ) {
            return json(
                {
                    message:
                        "Identifiant, email ou mot de passe invalide",
                },
                400
            );
        }

        const existing = await sql`
      SELECT user_id
      FROM users
      WHERE LOWER(username) = LOWER(${username})
         OR LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

        if (existing.rows.length > 0) {
            return json(
                {
                    message:
                        "Cet identifiant ou cet email existe déjà",
                },
                409
            );
        }

        const digest = await crypto.subtle.digest(
            "SHA-256",
            stringToArrayBuffer(username + password)
        );

        const hashedPassword =
            arrayBufferToBase64(digest);

        const externalId = crypto.randomUUID();

        await sql`
      INSERT INTO users (
        username,
        email,
        password,
        external_id,
        created_on
      )
      VALUES (
        ${username},
        ${email},
        ${hashedPassword},
        ${externalId},
        NOW()
      )
    `;

        return json(
            { message: "Compte créé avec succès" },
            201
        );
    } catch (error) {
        if (error?.code === "23505") {
            return json(
                {
                    message:
                        "Identifiant ou email déjà utilisé",
                },
                409
            );
        }

        console.error(error);

        return json(
            { message: "Erreur serveur" },
            500
        );
    }
}
