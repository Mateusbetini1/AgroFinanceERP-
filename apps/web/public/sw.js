self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch (_error) {
    payload = {}
  }

  const title = payload.title || 'AgroFinance'
  const options = {
    body: payload.body || 'Você tem uma nova notificação.',
    icon: '/agrofinance-icon.svg',
    data: {
      url: payload.url || '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) return client.focus()
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})
