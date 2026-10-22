
import { Link } from "react-router-dom";

import type {
    PublicUser,
    Room,
} from "../features/chat/chatSlice";

type Props = {
    users: PublicUser[];
    rooms: Room[];
    currentId: number;
    selected: string;
    unread: Record<string, number>;
};

export default function UserList({
                                     users,
                                     rooms,
                                     currentId,
                                     selected,
                                     unread,
                                 }: Props) {
    return (
        <div className="sidebar-content">
            <h3>Utilisateurs</h3>

            {users
                .filter(
                    (user) =>
                        Number(user.user_id) !== currentId
                )
                .map((user) => {
                    const key = `user/${user.user_id}`;

                    return (
                        <Link
                            key={user.user_id}
                            to={`/messages/${key}`}
                            className={
                                "contact " +
                                (selected === key ? "active" : "")
                            }
                        >
              <span className="avatar">
                {user.username[0]?.toUpperCase()}
              </span>

                            <span>
                <strong>{user.username}</strong>

                <small>
                  {user.last_login
                      ? `Dernière connexion : ${user.last_login}`
                      : "Jamais connecté"}
                </small>
              </span>

                            {(unread[key] || 0) > 0 && (
                                <span className="unread-badge">
                  {unread[key]}
                </span>
                            )}
                        </Link>
                    );
                })}

            <h3>Salons</h3>

            {rooms.map((room) => {
                const key = `room/${room.room_id}`;

                return (
                    <Link
                        key={room.room_id}
                        to={`/messages/${key}`}
                        className={
                            "contact " +
                            (selected === key ? "active" : "")
                        }
                    >
                        <span className="avatar">#</span>

                        <strong>{room.name}</strong>

                        {(unread[key] || 0) > 0 && (
                            <span className="unread-badge">
                {unread[key]}
              </span>
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
