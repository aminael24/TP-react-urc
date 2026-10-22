
import {
    useState,
    type ChangeEvent,
} from "react";

import { api } from "../app/api";

type Props = {
    token: string;
    onUploaded: (url: string) => Promise<void>;
};

export default function ImageUpload({
                                        token,
                                        onUploaded,
                                    }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        if (!file) return;

        event.target.value = "";

        if (file.size > 2 * 1024 * 1024) {
            setError("Image limitée à 2 Mo");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await new Promise<string>(
                (resolve, reject) => {
                    const reader = new FileReader();

                    reader.onload = () => {
                        const value = String(reader.result);
                        resolve(value.split(",")[1]);
                    };

                    reader.onerror = () => {
                        reject(new Error("Lecture impossible"));
                    };

                    reader.readAsDataURL(file);
                }
            );

            const result = await api<{ url: string }>(
                "/api/upload",
                {
                    method: "POST",
                    body: JSON.stringify({
                        data,
                        type: file.type,
                    }),
                },
                token
            );

            await onUploaded(result.url);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur d'envoi"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <label className="upload-button">
                {loading ? "Envoi..." : "📎 Image / GIF"}

                <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    disabled={loading}
                    onChange={(event) => {
                        void handleChange(event);
                    }}
                />
            </label>

            {error && (
                <span className="error">{error}</span>
            )}
        </div>
    );
}
