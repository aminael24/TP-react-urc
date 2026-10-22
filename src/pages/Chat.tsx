
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import type { RootState } from "../app/store";
import { api } from "../app/api";

import { logout } from "../features/auth/authSlice";

import {
    resetChat,
    setMessages,
    setRooms,
    setUsers,
    setSelectedConversation,
    type PublicUser,
    type Room,
    type Message,
} from "../features/chat/chatSlice";

import {
    startPush,
    stopPush,
    subscribeToRoom,
} from "../notifications/pusher";

import UserList from "../components/UserList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import ImageUpload from "../components/ImageUpload";
import CreateRoom from "../components/CreateRoom";

export default function Chat() {
    const { userId, roomId } = useParams();

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const session = useSelector(
        (state: RootState) => state.auth.session
    )!;

    const {
        users,
        rooms,
        messages,
    } = useSelector(
        (state: RootState) => state.chat
    );

    const [error, setError] = useState("");
    const [pushEnabled, setPushEnabled] = useState(false);

    const [replyingTo, setReplyingTo] =
        useState<Message | null>(null);

    const [unread, setUnread] = useState<
        Record<string, number>
    >({});

    // Conversation courante d'après React Router
    const kind = userId
        ? "user"
        : roomId
            ? "room"
            : null;

    const targetId = Number(userId || roomId);

    const valid =
        kind !== null &&
        Number.isSafeInteger(targetId) &&
        targetId > 0;

    const selected = valid
        ? `${kind}/${targetId}`
        : "";

    const currentRoom =
        kind === "room"
            ? rooms.find(
                room => room.room_id === targetId
            )
            : null;

    const title =
        kind === "user"
            ? users.find(
            user => user.user_id === targetId
        )?.username || "Utilisateur"
            : kind === "room"
                ? `# ${currentRoom?.name || "Salon"}`
                : "Sélectionne une discussion";

    // Synchroniser l'URL avec Redux Toolkit
    useEffect(() => {
        dispatch(
            setSelectedConversation(
                valid
                    ? {
                        kind,
                        targetId,
                    }
                    : null
            )
        );
    }, [dispatch, valid, kind, targetId]);

    // Réinitialiser la réponse quand on change de salon
    useEffect(() => {
        setReplyingTo(null);
        setError("");
    }, [selected]);

    // Déconnexion
    const signOut = useCallback(async () => {
        try {
            await stopPush();
        } catch (error) {
            console.error(
                "Déconnexion Pusher:",
                error
            );
        }

        for (const name of [
            "token",
            "username",
            "externalId",
            "id",
        ]) {
            sessionStorage.removeItem(name);
        }

        dispatch(logout());
        dispatch(resetChat());

        navigate("/login", {
            replace: true,
        });
    }, [dispatch, navigate]);

    const handleError = useCallback(
        (err: unknown) => {
            if (!(err instanceof Error)) return;

            if (
                [
                    "UNAUTHORIZED",
                    "Session expired",
                    "Session expirée",
                ].some(text => err.message.includes(text))
            ) {
                void signOut();
            } else {
                setError(err.message);
            }
        },
        [signOut]
    );

    // Recharger la liste des salons
    const loadRooms = useCallback(async () => {
        try {
            const data = await api<Room[]>(
                "/api/rooms",
                {},
                session.token
            );

            dispatch(setRooms(data));
        } catch (error) {
            handleError(error);
        }
    }, [
        dispatch,
        session.token,
        handleError,
    ]);

    // Charger les utilisateurs et salons
    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                const [
                    loadedUsers,
                    loadedRooms,
                ] = await Promise.all([
                    api<PublicUser[]>(
                        "/api/users",
                        {},
                        session.token
                    ),
                    api<Room[]>(
                        "/api/rooms",
                        {},
                        session.token
                    ),
                ]);

                if (!active) return;

                dispatch(setUsers(loadedUsers));
                dispatch(setRooms(loadedRooms));
            } catch (error) {
                if (active) {
                    handleError(error);
                }
            }
        }

        void loadData();

        return () => {
            active = false;
        };
    }, [
        dispatch,
        session.token,
        handleError,
    ]);

    // Messages
    const loadMessages = useCallback(
        async () => {
            if (!valid) return;

            try {
                const data = await api<Message[]>(
                    `/api/messages?kind=${kind}&targetId=${targetId}`,
                    {},
                    session.token
                );

                dispatch(setMessages(data));
            } catch (error) {
                handleError(error);
            }
        },
        [
            valid,
            kind,
            targetId,
            session.token,
            dispatch,
            handleError,
        ]
    );

    // Compteurs non lus
    const loadUnread = useCallback(
        async () => {
            try {
                const counters = await api<
                    Record<string, number>
                >(
                    "/api/unread",
                    {},
                    session.token
                );

                setUnread(counters);
            } catch (error) {
                console.error("Compteurs:", error);
            }
        },
        [session.token]
    );

    // Marquer la conversation comme lue
    const markRead = useCallback(
        async () => {
            if (!valid) return;

            try {
                await api(
                    "/api/mark-read",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            kind,
                            targetId,
                        }),
                    },
                    session.token
                );

                await loadUnread();
            } catch (error) {
                console.error("Lecture:", error);
            }
        },
        [
            valid,
            kind,
            targetId,
            session.token,
            loadUnread,
        ]
    );

    // Actualisation périodique des messages
    useEffect(() => {
        dispatch(setMessages([]));

        if (!valid) return;

        let active = true;

        async function refresh() {
            if (
                !active ||
                document.visibilityState !== "visible"
            ) {
                return;
            }

            await loadMessages();

            if (active) {
                await markRead();
            }
        }

        void refresh();

        const interval = window.setInterval(
            () => {
                void refresh();
            },
            3000
        );

        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [
        dispatch,
        selected,
        valid,
        loadMessages,
        markRead,
    ]);

    // Compteurs non lus périodiques
    useEffect(() => {
        void loadUnread();

        const interval = window.setInterval(
            () => {
                void loadUnread();
            },
            3000
        );

        return () => {
            window.clearInterval(interval);
        };
    }, [loadUnread]);

    // Notification du service worker
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        function onPushMessage(event: MessageEvent) {
            if (event.data?.type !== "NEW_MESSAGE") {
                return;
            }

            void loadMessages();
            void loadUnread();
        }

        navigator.serviceWorker.addEventListener(
            "message",
            onPushMessage
        );

        return () => {
            navigator.serviceWorker.removeEventListener(
                "message",
                onPushMessage
            );
        };
    }, [
        loadMessages,
        loadUnread,
    ]);

    // Activer les notifications
    async function enablePush() {
        try {
            setError("");

            const enabled = await startPush(
                session.token,
                session.externalId
            );

            if (!enabled) {
                setError(
                    "Autorise les notifications dans le navigateur."
                );
                return;
            }

            // Les salons privés ne doivent pas être
            // abonnés à des intérêts publics.
            for (const room of rooms.filter(
                room => !room.is_private
            )) {
                await subscribeToRoom(
                    room.room_id
                );
            }

            setPushEnabled(true);
        } catch (error) {
            handleError(error);
        }
    }

    // S'abonner aux nouveaux salons publics
    useEffect(() => {
        if (!pushEnabled) return;

        for (const room of rooms.filter(
            room => !room.is_private
        )) {
            void subscribeToRoom(
                room.room_id
            ).catch(console.error);
        }
    }, [pushEnabled, rooms]);

    // Envoyer un message, une image ou une réponse
    async function sendMessage(
        content: string,
        imageUrl?: string
    ) {
        if (!valid) return;

        setError("");

        try {
            await api(
                "/api/message",
                {
                    method: "POST",
                    body: JSON.stringify({
                        kind,
                        targetId,
                        content,
                        imageUrl: imageUrl || null,
                        replyTo: replyingTo?.id || null,
                    }),
                },
                session.token
            );

            setReplyingTo(null);

            await loadMessages();
            await loadUnread();
        } catch (error) {
            handleError(error);
            throw error;
        }
    }

    // Réactions emoji
    async function reactToMessage(
        messageId: string,
        emoji: string
    ) {
        if (!valid) return;

        try {
            await api(
                "/api/reactions",
                {
                    method: "POST",
                    body: JSON.stringify({
                        kind,
                        targetId,
                        messageId,
                        emoji,
                    }),
                },
                session.token
            );

            await loadMessages();
        } catch (error) {
            handleError(error);
        }
    }

    return (
        <main className="chat-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="brand">
                        ● URC
                    </div>

                    <small>
                        Connecté : {session.username}
                    </small>

                    <button
                        className="secondary"
                        type="button"
                        onClick={() => void enablePush()}
                    >
                        {pushEnabled
                            ? "Notifications activées"
                            : "Activer les notifications"}
                    </button>

                    <button
                        className="secondary"
                        type="button"
                        onClick={() => void signOut()}
                    >
                        Déconnexion
                    </button>
                </div>

                <CreateRoom
                    token={session.token}
                    users={users}
                    currentId={session.id}
                    onCreated={room => {
                        dispatch(
                            setRooms([...rooms, room])
                        );

                        navigate(
                            `/messages/room/${room.room_id}`
                        );

                        void loadRooms();
                    }}
                />

                <UserList
                    users={users}
                    rooms={rooms}
                    currentId={session.id}
                    selected={selected}
                    unread={unread}
                />
            </aside>

            <section className="chat-panel">
                <header className="chat-header">
                    <strong>{title}</strong>

                    <small>
                        {kind === "room"
                            ? currentRoom?.is_private
                                ? "Groupe privé"
                                : "Salon public"
                            : kind === "user"
                                ? "Conversation privée"
                                : "UBO Relay Chat"}
                    </small>
                </header>

                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}

                {valid ? (
                    <>
                        <MessageList
                            messages={messages}
                            currentId={session.id}
                            onReact={(id, emoji) => {
                                void reactToMessage(id, emoji);
                            }}
                            onReply={message =>
                                setReplyingTo(message)
                            }
                        />

                        {replyingTo && (
                            <div className="reply-preview">
                <span>
                  ↩ Réponse à{" "}
                    {replyingTo.senderName}
                    {" : "}
                    {replyingTo.content || "Image"}
                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setReplyingTo(null)
                                    }
                                    aria-label="Annuler la réponse"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="chat-composer">
                            <ImageUpload
                                token={session.token}
                                onUploaded={url =>
                                    sendMessage("", url)
                                }
                            />

                            <div className="chat-composer-input">
                                <MessageInput
                                    onSend={content =>
                                        sendMessage(content)
                                    }
                                    disabled={false}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty centered">
                        Choisis un utilisateur ou un salon
                        dans la liste.
                    </div>
                )}
            </section>
        </main>
    );
}
