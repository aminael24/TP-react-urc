
import PushNotifications from "@pusher/push-notifications-server";

// URL de l'application : locale ou déployée
const APP_URL = (
    process.env.APP_URL ||
    "http://localhost:3000"
).replace(/\/$/, "");

function getClient() {
    const instanceId = process.env.PUSHER_INSTANCE_ID;
    const secretKey = process.env.PUSHER_SECRET_KEY;

    if (!instanceId || !secretKey) {
        console.error("Pusher : variables manquantes");
        return null;
    }

    return new PushNotifications({
        instanceId,
        secretKey,
    });
}

// Notification pour un message privé
export async function notifyUser(
    externalId,
    sender,
    content,
    senderId
) {
    const beams = getClient();

    if (!beams) return;

    const deepLink =
        `${APP_URL}/messages/user/${senderId}`;

    await beams.publishToUsers(
        [String(externalId)],
        {
            web: {
                notification: {
                    title: `Nouveau message de ${sender}`,
                    body: content || "Nouvelle image reçue",
                    deep_link: deepLink,
                },
                data: {
                    kind: "user",
                    targetId: senderId,
                },
            },
        }
    );

    console.log(
        `Notification privée envoyée à ${externalId}`
    );
}

// Notification pour un salon
export async function notifyRoom(
    roomId,
    sender,
    content
) {
    const beams = getClient();

    if (!beams) return;

    const deepLink =
        `${APP_URL}/messages/room/${roomId}`;

    await beams.publishToInterests(
        [`room-${roomId}`],
        {
            web: {
                notification: {
                    title: `${sender} · Salon`,
                    body: content || "Nouvelle image reçue",
                    deep_link: deepLink,
                },
                data: {
                    kind: "room",
                    targetId: roomId,
                },
            },
        }
    );

    console.log(
        `Notification envoyée au salon ${roomId}`
    );
}
