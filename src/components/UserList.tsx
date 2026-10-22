
import { NavLink } from "react-router-dom";

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
    const publicRooms = rooms.filter(
        room => !room.is_private
    );

    const privateRooms = rooms.filter(
        room => room.is_private
    );

    function badge(key: string) {
        const count = unread[key] ?? 0;

        return count > 0 ? (
            <span className="unread-badge">
        {count}
      </span>
        ) : null;
    }

    function renderRoom(room: Room) {
        const key = `room/${room.room_id}`;

        return (
            <NavLink
                key={room.room_id}
                to={`/messages/${key}`}
                className={
                    "contact " +
                    (selected === key ? "active" : "")
                }
            >
        <span className="avatar">
          {room.is_private ? "🔒" : "#"}
        </span>

                <span className="contact-info">
          <strong>{room.name}</strong>
          <small>
            {room.is_private
                ? "Groupe privé"
                : "Salon public"}
          </small>
        </span>

                {badge(key)}
            </NavLink>
        );
    }

    return (
        <nav className="sidebar-content">
            <h3>Messages privés</h3>

            {users
                .filter(
                    user =>
                        Number(user.user_id) !==
                        Number(currentId)
                )
                .map(user => {
                    const key = `user/${user.user_id}`;

                    return (
                        <NavLink
                            key={user.user_id}
                            to={`/messages/${key}`}
                            className={
                                "contact " +
                                (selected === key
                                    ? "active"
                                    : "")
                            }
                        >
              <span className="avatar">
                {user.username[0]?.toUpperCase()}
              </span>

                            <span className="contact-info">
                <strong>{user.username}</strong>
                <small>
                  {user.last_login
                      ? "Dernière connexion : " +
                      new Date(
                          user.last_login
                      ).toLocaleString("fr-FR")
                      : "Jamais connecté"}
                </small>
              </span>

                            {badge(key)}
                        </NavLink>
                    );
                })}

            <h3>Salons publics</h3>

            {publicRooms.length
                ? publicRooms.map(renderRoom)
                : (
                    <p className="sidebar-empty">
                        Aucun salon public
                    </p>
                )}

            <h3>Groupes privés</h3>

            {privateRooms.length
                ? privateRooms.map(renderRoom)
                : (
                    <p className="sidebar-empty">
                        Aucun groupe privé
                    </p>
                )}
        </nav>
    );
}
