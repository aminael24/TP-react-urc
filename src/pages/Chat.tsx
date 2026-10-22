
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

export default function Chat() {
    const { userId, roomId } = useParams();

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const session = useSelector(
        (state: RootState) => state.auth.session
    )!;

    const { users, rooms, messages } = useSelector(
        (state: RootState) => state.chat
    );

    const [error, setError] = useState("");
    const [pushEnabled, setPushEnabled] = useState(false);

    const [unread, setUnread] = useState<
        Record<string, number>
    >({});

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

    const title =
        kind === "user"
            ? users.find(
                (user) => user.user_id === targetId
            )?.username
            : kind === "room"
                ? `# ${
                    rooms.find(
                        (room) => room.room_id === targetId
                    )?.name || "Salon"
                }`
                : "Sélectionne une discussion";

    const signOut = useCallback(async () => {
        try {
            await stopPush();
        } catch (error) {
            console.error("Déconnexion Pusher:", error);
        }

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("externalId");
        sessionStorage.removeItem("id");

        dispatch(logout());
        dispatch(resetChat());

        navigate("/login", { replace: true });
    }, [dispatch, navigate]);

    const handleError = useCallback(
        (err: unknown) => {
            if (!(err instanceof Error)) return;

            if (
                err.message.includes("UNAUTHORIZED") ||
                err.message.includes("Session expired") ||
                err.message.includes("Session expirée")
            ) {
                void signOut();
            } else {
                setError(err.message);
            }
        },
        [signOut]
    );

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                const [loadedUsers, loadedRooms] =
                    await Promise.all([
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
                if (active) handleError(error);
            }
        }

        void loadData();

        return () => {
            active = false;
        };
    }, [dispatch, session.token, handleError]);

    const loadMessages = useCallback(async () => {
        if (!valid) return;

        try {
            const loaded = await api<Message[]>(
                `/api/messages?kind=${kind}&targetId=${targetId}`,
                {},
                session.token
            );

            // Ne pas effacer les messages si la lecture
            // de la nouvelle conversation est en échec.
            dispatch(setMessages(loaded));
        } catch (error) {
            handleError(error);
        }
    }, [
        valid,
        kind,
        targetId,
        session.token,
        dispatch,
        handleError,
    ]);

    const loadUnread = useCallback(async () => {
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
    }, [session.token]);

    const markRead = useCallback(async () => {
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
    }, [
        valid,
        kind,
        targetId,
        session.token,
        loadUnread,
    ]);

    // Recharger les messages après changement
    // de conversation, puis périodiquement.
    useEffect(() => {
        dispatch(setMessages([]));

        if (!valid) return;

        let active = true;

        async function refresh() {
            if (!active) return;

            await loadMessages();

            if (active && document.visibilityState === "visible") {
                await markRead();
            }
        }

        void refresh();

        const interval = window.setInterval(
            () => {
                if (document.visibilityState === "visible") {
                    void refresh();
                }
            },
            3000
        );

        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [
        valid,
        selected,
        dispatch,
        loadMessages,
        markRead,
    ]);

    useEffect(() => {
        void loadUnread();

        const interval = window.setInterval(
            () => {
                void loadUnread();
            },
            3000
        );

        return () => window.clearInterval(interval);
    }, [loadUnread]);

    // Une notification reçue demande un
    // rafraîchissement de la conversation.
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
    }, [loadMessages, loadUnread]);

    async function enablePush() {
        try {
            setError("");

            const enabled = await startPush(
                session.token,
                session.externalId
            );

            if (!enabled) {
                setError(
                    "Autorise les notifications dans Firefox."
                );
                return;
            }

            for (const room of rooms) {
                await subscribeToRoom(room.room_id);
            }

            setPushEnabled(true);
        } catch (error) {
            handleError(error);
        }
    }

    useEffect(() => {
        if (!pushEnabled) return;

        for (const room of rooms) {
            void subscribeToRoom(room.room_id)
                .catch(console.error);
        }
    }, [pushEnabled, rooms]);

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
                    }),
                },
                session.token
            );

            await loadMessages();
            await loadUnread();
        } catch (error) {
            handleError(error);
            throw error;
        }
    }

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
                    <div className="brand">● URC</div>

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
                            ? "Salon public"
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
                        />

                        <div className="chat-composer">
                            <ImageUpload
                                token={session.token}
                                onUploaded={(url) => sendMessage("", url)}
                            />

                            <div className="chat-composer-input">
                                <MessageInput
                                    onSend={(content) => sendMessage(content)}
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
