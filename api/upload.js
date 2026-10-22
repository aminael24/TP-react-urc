
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getConnecterUser } from "../lib/session.js";

const types = {
    "image/png": {
        ext: "png",
        signature: (b) =>
            b.subarray(0, 8).equals(
                Buffer.from("89504e470d0a1a0a", "hex")
            ),
    },
    "image/jpeg": {
        ext: "jpg",
        signature: (b) =>
            b.subarray(0, 3).equals(
                Buffer.from("ffd8ff", "hex")
            ),
    },
    "image/gif": {
        ext: "gif",
        signature: (b) =>
            ["GIF87a", "GIF89a"].includes(
                b.subarray(0, 6).toString("ascii")
            ),
    },
    "image/webp": {
        ext: "webp",
        signature: (b) =>
            b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP",
    },
};

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

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return res.status(503).json({
                message: "Blob non configuré",
            });
        }

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body || {};

        const { data, type } = body;
        const format = types[type];

        if (
            !format ||
            typeof data !== "string" ||
            !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
        ) {
            return res.status(400).json({
                message: "Image invalide",
            });
        }

        // Limiter également la taille de l'entrée.
        if (data.length > 2800000) {
            return res.status(413).json({
                message: "Image trop volumineuse",
            });
        }

        const buffer = Buffer.from(data, "base64");

        if (
            buffer.length === 0 ||
            buffer.length > 2 * 1024 * 1024 ||
            !format.signature(buffer)
        ) {
            return res.status(400).json({
                message: "Format image invalide",
            });
        }

        const blob = await put(
            `urc/${randomUUID()}.${format.ext}`,
            buffer,
            {
                access: "public",
                contentType: type,
                addRandomSuffix: true,
            }
        );

        return res.status(201).json({
            url: blob.url,
        });
    } catch (error) {
        console.error("Upload:", error);

        return res.status(500).json({
            message: "Échec de l'upload",
        });
    }
}
