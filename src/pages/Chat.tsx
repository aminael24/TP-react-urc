
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
    type Message,
    type PublicUser,
    type Room,
} from "../features/chat/chatSlice";

import UserList from "../components/UserList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";

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
                ? "# " +
                (rooms.find(
                    (room) => room.room_id === targetId
                )?.name || "")
                : undefined;

    const handleError = useCallback(
        (err: unknown) => {
            if (!(err instanceof Error)) return;

            if (
                err.message.includes("Session expired") ||
                err.message.includes("UNAUTHORIZED")
            ) {
                sessionStorage.removeItem("token");
                sessionStorage.removeItem("username");
                sessionStorage.removeItem("externalId");
                sessionStorage.removeItem("id");

                dispatch(logout());
                dispatch(resetChat());

                navigate("/login");
            } else {
                setError(err.message);
            }
        },
        [dispatch, navigate]
    );

    useEffect(() => {
        api<PublicUser[]>(
            "/api/users",
            {},
            session.token
        )
            .then((users) => dispatch(setUsers(users)))
            .catch(handleError);

        api<Room[]>(
            "/api/rooms",
            {},
            session.token
        )
            .then((rooms) => dispatch(setRooms(rooms)))
            .catch(handleError);
    }, [
        dispatch,
        session.token,
        handleError,
    ]);

    const loadMessages = useCallback(async () => {
        if (!valid) return;

        try {
            const result = await api<Message[]>(
                `/api/messages?kind=${kind}&targetId=${targetId}`,
                {},
                session.token
            );

            dispatch(setMessages(result));
        } catch (err) {
            handleError(err);
        }
    }, [
        valid,
        kind,
        targetId,
        session.token,
        dispatch,
        handleError,
    ]);

    useEffect(() => {
        dispatch(setMessages([]));

        if (!valid) return;

        void loadMessages();

        const interval = window.setInterval(() => {
            void loadMessages();
        }, 3000);

        return () => {
            window.clearInterval(interval);
        };
    }, [loadMessages, dispatch, valid]);

    async function sendMessage(content: string) {
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
                    }),
                },
                session.token
            );

            await loadMessages();
        } catch (err) {
            handleError(err);
            throw err;
        }
    }

    function signOut() {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("externalId");
        sessionStorage.removeItem("id");

        dispatch(logout());
        dispatch(resetChat());

        navigate("/login");
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
                        onClick={signOut}
                    >
                        Déconnexion
                    </button>
                </div>

                <UserList
                    users={users}
                    rooms={rooms}
                    currentId={session.id}
                    selected={selected}
                />
            </aside>

            <section className="chat-panel">
                <header className="chat-header">
                    <strong>
                        {title || "Sélectionne une discussion"}
                    </strong>

                    <small>
                        {kind === "room"
                            ? "Salon public"
                            : kind === "user"
                                ? "Message privé"
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
                        />

                        <MessageInput
                            onSend={sendMessage}
                            disabled={false}
                        />
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
