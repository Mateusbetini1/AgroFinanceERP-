import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, PrivacyContact } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: 'Exclusão de dados | AgroFinance',
  description: 'Instruções para solicitar exclusão de dados do AgroFinance e de sua integração com WhatsApp.' }

export default function DataDeletionPage() {
  return (
    <LegalPage title="Exclusão de dados" intro="Você pode solicitar a exclusão de informações mantidas pelo AgroFinance ERP e pelo AgroFinance Assistente sem precisar acessar o sistema.">
      <section>
        <h2>Como solicitar</h2>
        <ol>
          <li>Envie um e-mail para <PrivacyContact /> com o assunto <strong>Exclusão de dados — AgroFinance</strong>.</li>
          <li>Informe o e-mail usado no sistema e, se o pedido envolver WhatsApp, o número com país e DDD. Identifique a empresa ou conta a que o pedido se refere.</li>
          <li>Explique se deseja remover os dados da integração WhatsApp, registros específicos ou encerrar seu acesso. Envie apenas os dados necessários para localizar a solicitação.</li>
        </ol>
        <p>Não envie senhas, tokens de acesso ou códigos de confirmação. O responsável pode solicitar uma confirmação de identidade ou do vínculo com a empresa antes de realizar alterações.</p>
      </section>
      <section>
        <h2>O que acontece depois</h2>
        <p>O pedido é analisado manualmente pelo responsável pelo AgroFinance. A resposta será enviada por e-mail, indicando o andamento, os dados removidos e eventuais informações que precisem ser preservadas, com os motivos correspondentes.</p>
        <p>O pedido pode abranger o vínculo autorizado com WhatsApp, rascunhos, conteúdo remanescente da fila e registros associados à sua conta. Dados financeiros compartilhados com uma empresa exigem análise do vínculo e das responsabilidades sobre esses registros.</p>
        <p>Não existe exclusão automática por esta página. Remover o aplicativo nas configurações da Meta ou apagar a conversa no celular não elimina, por si só, registros já salvos no AgroFinance.</p>
      </section>
      <section>
        <h2>Cópias e serviços de terceiros</h2>
        <p>Dados eventualmente preservados por obrigação aplicável, auditoria ou em cópias de segurança serão tratados conforme o contexto da solicitação e os ciclos de retenção envolvidos. A remoção no AgroFinance não apaga automaticamente informações mantidas pela Meta ou pelo Google; solicitações a esses serviços seguem seus próprios canais.</p>
        <p>Para saber quais informações são tratadas, consulte a <Link href="/privacidade">Política de Privacidade</Link>.</p>
      </section>
    </LegalPage>
  )
}
