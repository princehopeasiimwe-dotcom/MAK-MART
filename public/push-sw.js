/* Phone notifications.
   Loaded into the app's service worker (vite.config.js -> workbox.importScripts).
   - "push": the server sent a notification -> show it in the phone's bar
   - "notificationclick": the user tapped it -> open / focus the app on the right page */

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "MAK MART";

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.id || undefined,
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    (async () => {
      // Tell any open app window so its bell refreshes straight away.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      windows.forEach((client) => client.postMessage({ type: "push-received" }));

      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const origin = self.location.origin;
  let target = origin + "/";

  try {
    const url = new URL(
      (event.notification.data && event.notification.data.url) || "/",
      origin
    );

    // never follow a link that leaves this site
    if (url.origin === origin) {
      target = url.href;
    }
  } catch (err) {
    /* keep the home page */
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin === origin) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(target);
            }
            return;
          } catch (err) {
            /* fall through and open a new window */
          }
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});