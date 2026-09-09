import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, PrivacyContact } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: 'Política de Privacidade | AgroFinance',
  description: 'Como o AgroFinance ERP e o AgroFinance Assistente tratam dados, mensagens e anexos.' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" intro="Esta política explica o tratamento de informações no AgroFinance ERP e em seu assistente conectado ao WhatsApp.">
      <section>
        <h2>1. Responsável e contato</h2>
        <p>O AgroFinance é um projeto de gestão financeira rural administrado por Mateus Betini de Freitas. Para dúvidas sobre privacidade e solicitações relativas aos seus dados, entre em contato por <PrivacyContact />.</p>
      </section>
      <section>
        <h2>2. Informações tratadas</h2>
        <ul>
          <li>Cadastro e acesso: nome, e-mail, identificação da empresa, permissões e informações de autenticação. As senhas são armazenadas como hash.</li>
          <li>Registros inseridos no sistema: contas, receitas, despesas, boletos, pagamentos, clientes, fornecedores, funcionários, safras e outros dados da atividade rural.</li>
          <li>WhatsApp: número do remetente autorizado, identificadores e horários das mensagens, texto e referências a anexos enviados.</li>
          <li>Fotos, áudios, vídeos e PDFs enviados para interpretação, assim como os dados extraídos, rascunhos e lançamentos confirmados.</li>
          <li>Informações técnicas de acesso, erros e auditoria, que podem incluir endereço IP, navegador, usuário e operações realizadas.</li>
        </ul>
      </section>
      <section>
        <h2>3. Finalidades</h2>
        <p>Esses dados são usados para autenticar usuários, controlar permissões, organizar os registros financeiros, responder consultas, preparar lançamentos, verificar confirmações, evitar reprocessamento de mensagens e investigar falhas.</p>
        <p>A integração pessoal do WhatsApp responde ao número autorizado. Ela não publica conteúdo no Facebook nem envia mensagens aos amigos do usuário. Comunicações administrativas da própria Meta seguem as configurações e políticas da Meta.</p>
      </section>
      <section>
        <h2>4. WhatsApp, inteligência artificial e fornecedores</h2>
        <p>A Meta processa as mensagens transportadas pelo WhatsApp. Para interpretar pedidos, o AgroFinance pode enviar ao Google Gemini o texto da mensagem e o contexto recente da conversa; anexos enviados para análise são encaminhados ao Gemini.</p>
        <p>O site é hospedado na Vercel, a API no Render e o banco PostgreSQL no Supabase. Esses fornecedores processam informações necessárias às suas funções. O processamento pode ocorrer fora do Brasil.</p>
        <p>O tratamento realizado pelo Gemini depende da modalidade contratada pelo administrador. Nos serviços gratuitos, os termos do Google preveem uso de conteúdo para melhoria e possível revisão humana, além de orientarem que não sejam enviados dados pessoais, confidenciais ou sensíveis. Nos serviços pagos, os termos estabelecem tratamento diferente. Consulte os <a href="https://ai.google.dev/gemini-api/terms">termos da API Gemini</a> e confirme a modalidade antes de enviar documentos pessoais ou confidenciais.</p>
        <p>Consulte também a <a href="https://www.whatsapp.com/legal/privacy-policy">política de privacidade do WhatsApp</a>. Excluir informações do AgroFinance não exclui automaticamente as cópias mantidas nos serviços de terceiros.</p>
      </section>
      <section>
        <h2>5. Armazenamento e retenção</h2>
        <p>Os registros financeiros e de auditoria permanecem no sistema para consulta e administração da empresa. A exclusão de um registro pela interface pode ser lógica, mantendo informações no banco; para solicitar eliminação dos dados armazenados, utilize o canal de contato.</p>
        <p>A fila do WhatsApp mantém o conteúdo da mensagem até seu processamento ou expiração. Após essas etapas, o conteúdo da fila é removido; os identificadores usados para evitar duplicidade permanecem armazenados. Respostas com falha definitiva de entrega podem permanecer para diagnóstico.</p>
        <p>Os rascunhos têm confirmação válida por 30 minutos. São removidos ao cancelar, confirmar ou quando a rotina em execução limpa rascunhos expirados. A indisponibilidade dessa rotina pode adiar a limpeza. Dados de rascunhos confirmados passam a integrar os registros financeiros.</p>
        <p>Anexos recebidos pelo WhatsApp são processados em memória, sem arquivamento automático como comprovantes no ERP. Cópias de segurança e registros dos fornecedores seguem os respectivos ciclos de retenção; não há promessa de remoção instantânea de todas as cópias.</p>
      </section>
      <section>
        <h2>6. Acesso e armazenamento no navegador</h2>
        <p>O sistema utiliza armazenamento local do navegador para manter a sessão e a empresa selecionada. A API aplica autenticação e permissões por empresa; a integração do WhatsApp verifica o número autorizado e as permissões do usuário associado.</p>
        <p>Revise os dados antes de confirmar lançamentos e compartilhe apenas informações que você está autorizado a tratar. O acesso às páginas de privacidade, termos e exclusão não exige login.</p>
      </section>
      <section>
        <h2>7. Solicitações e alterações desta política</h2>
        <p>Você pode solicitar informações sobre o tratamento, acesso, correção ou exclusão dos seus dados pelo canal de contato. A identidade e o vínculo com a empresa podem precisar ser verificados para proteger informações de outras pessoas.</p>
        <p>Veja as <Link href="/exclusao-de-dados">instruções para solicitar exclusão</Link>. Se a solicitação não puder ser atendida integralmente, o responsável informará os motivos. Mudanças no funcionamento do serviço serão refletidas nesta página, com atualização da data indicada.</p>
      </section>
    </LegalPage>
  )
}
