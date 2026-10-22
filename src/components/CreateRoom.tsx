
import {
  useState,
  type FormEvent,
} from "react";

import { api } from "../app/api";

import type {
  PublicUser,
  Room,
} from "../features/chat/chatSlice";

type Props = {
  token: string;
  users: PublicUser[];
  currentId: number;
  onCreated: (room: Room) => void;
};

export default function CreateRoom({
  token,
  users,
  currentId,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberIds, setMemberIds] =
    useState<number[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleMember(id: number) {
    setMemberIds(previous =>
      previous.includes(id)
        ? previous.filter(value => value !== id)
        : [...previous, id]
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const room = await api<Room>(
        "/api/rooms",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            isPrivate,
            memberIds: isPrivate
              ? memberIds
              : [],
          }),
        },
        token
      );

      onCreated(room);

      setName("");
      setIsPrivate(false);
      setMemberIds([]);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Création impossible"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="room-creator">
      <button
        type="button"
        className="secondary"
        onClick={() => setOpen(value => !value)}
      >
        {open ? "Annuler" : "+ Nouveau groupe"}
      </button>

      {open && (
        <form
          className="room-form"
          onSubmit={submit}
        >
          <label>
            Nom du groupe

            <input
              required
              minLength={3}
              maxLength={50}
              value={name}
              onChange={event =>
                setName(event.target.value)
              }
              placeholder="Ex. Projet React"
            />
          </label>

          <label className="room-check">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={event => {
                setIsPrivate(event.target.checked);
                setMemberIds([]);
              }}
            />
            Groupe privé
          </label>

          {isPrivate && (
            <fieldset>
              <legend>Membres autorisés</legend>

              {users
                .filter(
                  user =>
                    user.user_id !== currentId
                )
                .map(user => (
                  <label
                    className="room-check"
                    key={user.user_id}
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(
                        user.user_id
                      )}
                      onChange={() =>
                        toggleMember(user.user_id)
                      }
                    />

                    {user.username}
                  </label>
                ))}
            </fieldset>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Création..."
              : "Créer le groupe"}
          </button>
        </form>
      )}
    </section>
  );
}
