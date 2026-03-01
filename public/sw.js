/* Service Worker — Push Notifications for Destaques Gov.br */

self.addEventListener("install", (event) => {
  console.log("[SW] install — skipWaiting")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] activate — claiming clients")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("[SW] push event received", event)

  let data = {}
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (e) {
    console.warn("[SW] push data is not JSON, trying text:", e)
    try {
      data = { title: "Destaques Gov.br", body: event.data?.text() || "" }
    } catch (e2) {
      console.error("[SW] failed to read push data:", e2)
    }
  }

  console.log("[SW] notification payload:", JSON.stringify(data))

  const title = data.title || "Destaques Gov.br"
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
    requireInteraction: false,
    tag: data.tag || "dgb-" + Date.now(),
  }

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => console.log("[SW] showNotification succeeded"))
      .catch((err) => console.error("[SW] showNotification FAILED:", err)),
  )
})

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] notificationclick", event.notification.tag)
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(clients.openWindow(url))
})
