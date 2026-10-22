
import {
    useEffect,
    useRef,
} from "react";

import type {
    Message,
} from "../features/chat/chatSlice";

import ReactionBar from "./ReactionBar";

type Props = {
    messages: Message[];
    currentId: number;
    onReact: (
        messageId: string,
        emoji: string
    ) => void;
    onReply: (message: Message) => void;
};

export default function MessageList({
                                        messages,
                                        currentId,
                                        onReact,
                                        onReply,
                                    }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const byId = new Map(
        messages.map(message => [
            message.id,
            message,
        ])
    );

    return (
        <div className="messages">
            {messages.length === 0 && (
                <div className="empty">
                    Aucun message pour le moment.
                </div>
            )}

            {messages.map(message => {
                const mine =
                    Number(message.senderId) === currentId;

                const parent = message.replyTo
                    ? byId.get(message.replyTo)
                    : null;

                return (
                    <div
                        key={message.id}
                        className={
                            "bubble " +
                            (mine ? "mine" : "theirs")
                        }
                    >
                        <strong>{message.senderName}</strong>

                        {message.replyTo && (
                            <div className="reply-reference">
                                ↳ Réponse à{" "}
                                {parent?.senderName ||
                                    "un ancien message"}
                                {" : "}
                                {parent?.content ||
                                    (parent?.imageUrl
                                        ? "Image"
                                        : "Message expiré")}
                            </div>
                        )}

                        {message.content && (
                            <p>{message.content}</p>
                        )}

                        {message.imageUrl && (
                            <a
                                href={message.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img
                                    src={message.imageUrl}
                                    className="message-image"
                                    alt="Image partagée"
                                />
                            </a>
                        )}

                        <small>
                            {new Date(
                                message.createdAt
                            ).toLocaleString("fr-FR")}
                        </small>

                        <ReactionBar
                            reactions={
                                message.reactions || {}
                            }
                            onReact={emoji =>
                                onReact(message.id, emoji)
                            }
                        />

                        <button
                            type="button"
                            className="reply-button"
                            onClick={() => onReply(message)}
                        >
                            ↩ Répondre
                        </button>
                    </div>
                );
            })}

            <div ref={endRef} />
        </div>
    );
}
