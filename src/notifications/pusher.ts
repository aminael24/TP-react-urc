
import * as Pusher from "@pusher/push-notifications-web";

let client: Pusher.Client | null = null;

export async function startPush(
    token: string,
    externalId: string
): Promise<boolean> {
    if (!("Notification" in window)) {
        throw new Error("Notifications non supportées");
    }

    if (Notification.permission === "default") {
        const permission =
            await Notification.requestPermission();

        if (permission !== "granted") {
            return false;
        }
    }

    if (Notification.permission !== "granted") {
        return false;
    }

    const instanceId =
        import.meta.env.VITE_PUSHER_INSTANCE_ID;

    if (!instanceId) {
        throw new Error("Instance Pusher manquante");
    }

    if (!client) {
        client = new Pusher.Client({ instanceId });
    }

    const tokenProvider = new Pusher.TokenProvider({
        url: "/api/beams",
        queryParams: {
            user_id: externalId,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    await client.start();
    await client.setUserId(externalId, tokenProvider);

    return true;
}

export async function subscribeToRoom(
    roomId: number
) {
    if (!client) return;

    await client.addDeviceInterest(`room-${roomId}`);
}

export async function stopPush() {
    if (client) {
        await client.clearAllState();
        client = null;
    }
}
