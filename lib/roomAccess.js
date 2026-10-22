
import { sql } from "@vercel/postgres";

export async function getAccessibleRoom(userId, roomId) {
  const id = Number(roomId);
  const uid = Number(userId);

  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !Number.isSafeInteger(uid) ||
    uid < 1
  ) {
    return null;
  }

  const result = await sql`
    SELECT
      r.room_id,
      r.name,
      r.is_private,
      r.created_by
    FROM rooms r
    WHERE r.room_id = ${id}
      AND (
        NOT r.is_private
        OR r.created_by = ${uid}
        OR EXISTS (
          SELECT 1
          FROM room_members m
          WHERE m.room_id = r.room_id
            AND m.user_id = ${uid}
        )
      )
  `;

  return result.rows[0] || null;
}

export async function getPrivateRoomRecipients(
  roomId,
  excludeUserId
) {
  const result = await sql`
    SELECT DISTINCT u.external_id
    FROM users u
    JOIN rooms r ON r.room_id = ${roomId}
    WHERE u.user_id <> ${excludeUserId}
      AND (
        u.user_id = r.created_by
        OR EXISTS (
          SELECT 1
          FROM room_members m
          WHERE m.room_id = r.room_id
            AND m.user_id = u.user_id
        )
      )
  `;

  return result.rows.map(row =>
    String(row.external_id)
  );
}
