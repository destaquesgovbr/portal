self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'Destaques Gov.br', body: event.data?.text() || '' }
  }

  const bodyParts = [data.body, data.summary].filter(Boolean)

  event.waitUntil(
    self.registration.showNotification(data.title || 'Destaques Gov.br', {
      body: bodyParts.join('\n'),
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})
