
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
};

export default function MessageList({
                                        messages,
                                        currentId,
                                        onReact,
                                    }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    return (
        <div className="messages">
            {messages.length === 0 && (
                <div className="empty">
                    Aucun message pour le moment.
                </div>
            )}

            {messages.map((message) => {
                const mine =
                    Number(message.senderId) === currentId;

                return (
                    <div
                        key={message.id}
                        className={
                            "bubble " +
                            (mine ? "mine" : "theirs")
                        }
                    >
                        <strong>{message.senderName}</strong>

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
                                    alt="Image partagée"
                                    className="message-image"
                                />
                            </a>
                        )}

                        <small>
                            {new Date(
                                message.createdAt
                            ).toLocaleString("fr-FR")}
                        </small>

                        <ReactionBar
                            reactions={message.reactions || {}}
                            onReact={(emoji) =>
                                onReact(message.id, emoji)
                            }
                        />
                    </div>
                );
            })}

            <div ref={endRef} />
        </div>
    );
}
