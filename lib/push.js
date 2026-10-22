
import PushNotifications from
        "@pusher/push-notifications-server";

const APP_URL = (
    process.env.APP_URL ||
    "http://localhost:3000"
).replace(/\/$/, "");

function getClient() {
    const instanceId =
        process.env.PUSHER_INSTANCE_ID;

    const secretKey =
        process.env.PUSHER_SECRET_KEY;

    if (!instanceId || !secretKey) {
        return null;
    }

    return new PushNotifications({
        instanceId,
        secretKey,
    });
}

function notification(title, body, path, data) {
    return {
        web: {
            notification: {
                title,
                body: body || "Nouvelle image",
                deep_link: `${APP_URL}${path}`,
            },
            data,
        },
    };
}

// Message privé entre deux utilisateurs
export async function notifyUser(
    externalId,
    sender,
    content,
    senderId
) {
    const beams = getClient();

    if (!beams) return;

    await beams.publishToUsers(
        [String(externalId)],
        notification(
            `Nouveau message de ${sender}`,
            content,
            `/messages/user/${senderId}`,
            {
                kind: "user",
                targetId: senderId,
            }
        )
    );
}

// Message d'un salon public
export async function notifyRoom(
    roomId,
    sender,
    content
) {
    const beams = getClient();

    if (!beams) return;

    await beams.publishToInterests(
        [`room-${roomId}`],
        notification(
            `${sender} · Salon`,
            content,
            `/messages/room/${roomId}`,
            {
                kind: "room",
                targetId: roomId,
            }
        )
    );
}

// Message d'un groupe privé
export async function notifyPrivateRoom(
    roomId,
    externalIds,
    sender,
    content
) {
    const beams = getClient();

    if (!beams || externalIds.length === 0) {
        return;
    }

    await beams.publishToUsers(
        externalIds.map(String),
        notification(
            `${sender} · Groupe privé`,
            content,
            `/messages/room/${roomId}`,
            {
                kind: "room",
                targetId: roomId,
            }
        )
    );
}
