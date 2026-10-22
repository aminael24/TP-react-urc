
import { useState, type FormEvent } from "react";

interface MessageInputProps {
    onSend: (content: string) => Promise<void>;
    disabled: boolean;
}

export default function MessageInput({
                                         onSend,
                                         disabled,
                                     }: MessageInputProps) {
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!content.trim()) {
            return;
        }

        setSending(true);

        try {
            await onSend(content.trim());
            setContent("");
        } catch (error) {
            console.error("Envoi impossible", error);
        } finally {
            setSending(false);
        }
    }

    return (
        <form
            className="composer"
            onSubmit={handleSubmit}
        >
            <input
                type="text"
                placeholder="Écrire un message..."
                aria-label="Message"
                value={content}
                maxLength={2000}
                disabled={disabled || sending}
                onChange={(event) =>
                    setContent(event.target.value)
                }
            />

            <button
                type="submit"
                disabled={
                    disabled ||

                    sending ||
                    !content.trim()
                }
            >
                {sending ? "Envoi..." : "Envoyer ➤"}
            </button>
        </form>
    );
}
