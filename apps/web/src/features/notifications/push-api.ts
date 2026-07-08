import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api'

type PushPublicKeyResponse = {
  publicKey: string
}

type PushTestResponse = {
  sent: number
  failed: number
  total: number
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getPushPublicKey() {
  const { data } = await api.get<ApiResponse<PushPublicKeyResponse>>('/notifications/push/public-key')
  return data.data.publicKey
}

export async function registerServiceWorker() {
  return navigator.serviceWorker.register('/sw.js')
}

export async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeCurrentDevice() {
  const publicKey = await getPushPublicKey()
  const registration = await registerServiceWorker()
  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Permissão negada pelo navegador.' : 'Permissão não concedida.')
  }

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  await api.post('/notifications/push/subscribe', subscription.toJSON())
  return subscription
}

export async function unsubscribeCurrentDevice() {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return { deactivated: 0 }

  await api.delete('/notifications/push/unsubscribe', {
    data: { endpoint: subscription.endpoint },
  })
  await subscription.unsubscribe()
  return { deactivated: 1 }
}

export async function sendTestPushNotification() {
  const { data } = await api.post<ApiResponse<PushTestResponse>>('/notifications/push/test')
  return data.data
}
