'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Send, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getCurrentPushSubscription,
  isPushSupported,
  registerServiceWorker,
  sendTestPushNotification,
  subscribeCurrentDevice,
  unsubscribeCurrentDevice,
} from '../push-api'

type PushStatus = 'loading' | 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed'

function statusText(status: PushStatus) {
  return {
    loading: 'Verificando...',
    unsupported: 'Não suportado neste navegador',
    default: 'Não ativado',
    granted: 'Permissão concedida',
    denied: 'Permissão negada',
    subscribed: 'Ativado neste aparelho',
  }[status]
}

export function PushNotificationCard() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function refreshStatus() {
    if (!isPushSupported()) {
      setStatus('unsupported')
      return
    }

    await registerServiceWorker()
    const subscription = await getCurrentPushSubscription()
    if (subscription) {
      setStatus('subscribed')
      return
    }

    setStatus(Notification.permission === 'granted' ? 'granted' : Notification.permission)
  }

  useEffect(() => {
    void refreshStatus().catch(() => setStatus('unsupported'))
  }, [])

  async function handleSubscribe() {
    setIsBusy(true)
    setMessage(null)
    try {
      await subscribeCurrentDevice()
      setStatus('subscribed')
      setMessage('Notificações ativadas neste aparelho.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ativar as notificações.')
      await refreshStatus().catch(() => undefined)
    } finally {
      setIsBusy(false)
    }
  }

  async function handleUnsubscribe() {
    setIsBusy(true)
    setMessage(null)
    try {
      await unsubscribeCurrentDevice()
      await refreshStatus()
      setMessage('Notificações desativadas neste aparelho.')
    } catch {
      setMessage('Não foi possível desativar as notificações.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleTest() {
    setIsBusy(true)
    setMessage(null)
    try {
      const result = await sendTestPushNotification()
      setMessage(`Teste enviado para ${result.sent} aparelho(s).`)
    } catch {
      setMessage('Não foi possível enviar a notificação de teste.')
    } finally {
      setIsBusy(false)
    }
  }

  const canSubscribe = status === 'default' || status === 'granted'
  const canSendTest = status === 'subscribed'
  const canUnsubscribe = status === 'subscribed'

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base tracking-normal">
              <Bell className="h-4 w-4" />
              Notificações no aparelho
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{statusText(status)}</p>
          </div>
          <Smartphone className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Para melhor funcionamento no Android, adicione o AgroFinance à tela inicial.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" size="sm" onClick={handleSubscribe} disabled={!canSubscribe || isBusy} loading={isBusy && canSubscribe}>
            <Bell className="h-4 w-4" />
            Ativar notificações neste aparelho
          </Button>

          <Button type="button" size="sm" variant="outline" onClick={handleTest} disabled={!canSendTest || isBusy}>
            <Send className="h-4 w-4" />
            Enviar notificação de teste
          </Button>

          <Button type="button" size="sm" variant="outline" onClick={handleUnsubscribe} disabled={!canUnsubscribe || isBusy}>
            <BellOff className="h-4 w-4" />
            Desativar neste aparelho
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}
