
import { Link } from "react-router-dom";

import type {
    PublicUser,
    Room,
} from "../features/chat/chatSlice";

interface UserListProps {
    users: PublicUser[];
    rooms: Room[];
    currentId: number;
    selected: string;
}

export default function UserList({
                                     users,
                                     rooms,
                                     currentId,
                                     selected,
                                 }: UserListProps) {
    return (
        <div className="sidebar-content">
            <h3>Utilisateurs</h3>

            {users
                .filter((user) => user.user_id !== currentId)
                .map((user) => (
                    <Link
                        key={user.user_id}
                        to={`/messages/user/${user.user_id}`}
                        className={
                            "contact " +
                            (selected === `user/${user.user_id}`
                                ? "active"
                                : "")
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
                    </Link>
                ))}

            <h3>Salons</h3>

            {rooms.map((room) => (
                <Link
                    key={room.room_id}
                    to={`/messages/room/${room.room_id}`}
                    className={
                        "contact " +
                        (selected === `room/${room.room_id}`
                            ? "active"
                            : "")
                    }
                >
                    <span className="avatar">#</span>
                    <strong>{room.name}</strong>
                </Link>
            ))}
        </div>
    );
}
