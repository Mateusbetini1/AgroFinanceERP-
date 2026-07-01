import { AssistantChat } from '@/features/assistant/components/assistant-chat'

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assistente</h1>
        <p className="text-sm text-muted-foreground">
          Consulte boletos, caixa, receitas, despesas e safras sem alterar dados financeiros.
        </p>
      </div>

      <AssistantChat />
    </div>
  )
}
