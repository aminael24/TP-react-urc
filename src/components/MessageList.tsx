
import { useEffect, useRef } from "react";

import type {
    Message,
} from "../features/chat/chatSlice";

interface MessageListProps {
    messages: Message[];
    currentId: number;
}

export default function MessageList({
                                        messages,
                                        currentId,
                                    }: MessageListProps) {
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
                    Commence la conversation !
                </div>
            )}

            {messages.map((message) => {
                const isMine =
                    message.senderId === currentId;

                return (
                    <div
                        key={message.id}
                        className={
                            "bubble " +
                            (isMine ? "mine" : "theirs")
                        }
                    >
                        <strong>{message.senderName}</strong>

                        <p>{message.content}</p>

                        <small>
                            {new Date(
                                message.createdAt
                            ).toLocaleString("fr-FR")}
                        </small>
                    </div>
                );
            })}

            <div ref={endRef} />
        </div>
    );
}
