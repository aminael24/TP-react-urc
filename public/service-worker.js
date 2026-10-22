
importScripts(
    "https://js.pusher.com/beams/service-worker.js"
);

PusherPushNotifications.onNotificationReceived = ({
                                                    payload,
                                                    pushEvent,
                                                    handleNotification,
                                                  }) => {
  pushEvent.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        for (const client of clients) {
          client.postMessage({
            type: "NEW_MESSAGE",
            data: payload.data,
          });
        }

        await handleNotification(payload);
      })()
  );
};
