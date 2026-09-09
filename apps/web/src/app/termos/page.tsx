import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, PrivacyContact } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: 'Termos de uso | AgroFinance',
  description: 'Condições de uso do AgroFinance ERP e do assistente financeiro no WhatsApp.' }

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" intro="Estas condições descrevem o uso do AgroFinance ERP e do AgroFinance Assistente para organizar informações financeiras da atividade rural.">
      <section>
        <h2>1. Acesso autorizado</h2>
        <p>O acesso depende de uma conta autorizada e das permissões concedidas na empresa. Proteja suas credenciais e utilize somente dados e contas que você está autorizado a administrar. Não tente acessar registros de outras empresas ou contornar controles de acesso.</p>
        <p>A integração pessoal do WhatsApp atende ao número autorizado na configuração e utiliza as permissões do usuário associado. Informe ao administrador quando houver perda ou mudança desse número.</p>
      </section>
      <section>
        <h2>2. Registros e uso do assistente</h2>
        <p>O serviço permite consultas e preparação de lançamentos. A inteligência artificial pode interpretar valores, datas ou documentos incorretamente. Confira o resumo e os campos antes de confirmar qualquer gravação.</p>
        <p>O assistente do WhatsApp exige confirmação por código para salvar lançamentos. Essa confirmação registra informações no ERP; não transfere dinheiro nem realiza pagamentos no banco.</p>
        <p>Os relatórios refletem os dados disponíveis no sistema. Não representam garantia de resultado nem substituem conferência bancária, escrituração ou avaliação profissional quando necessária.</p>
      </section>
      <section>
        <h2>3. Disponibilidade e dependências</h2>
        <p>O funcionamento depende de internet, hospedagem e serviços de terceiros, incluindo Meta e Google. Podem ocorrer indisponibilidades, atrasos, limites de uso ou falhas na interpretação de anexos e no envio de respostas.</p>
        <p>Se uma operação for interrompida ou ficar sem resposta, confira os registros no painel antes de repeti-la. Preserve os documentos originais; anexos do WhatsApp não são automaticamente arquivados como comprovantes pelo sistema.</p>
      </section>
      <section>
        <h2>4. Privacidade e contato</h2>
        <p>O tratamento de informações está descrito na <Link href="/privacidade">Política de Privacidade</Link>. Consulte as <Link href="/exclusao-de-dados">instruções de exclusão de dados</Link> para pedidos relacionados à sua conta.</p>
        <p>O AgroFinance é administrado por Mateus Betini de Freitas. Dúvidas sobre o serviço podem ser encaminhadas para <PrivacyContact />.</p>
        <p>Alterações destas condições serão disponibilizadas nesta página com atualização da data. Estas condições não afastam direitos assegurados pela legislação aplicável.</p>
      </section>
    </LegalPage>
  )
}
