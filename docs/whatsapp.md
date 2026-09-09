# WhatsApp pessoal do AgroFinance

Esta versão conecta **um número pessoal autorizado** ao assistente e a uma
empresa do sistema. A API recebe mensagens pela **WhatsApp Cloud API oficial
da Meta**. Não usa leitura de QR Code, WhatsApp Web ou automação do navegador.

## O que está implementado

- Consultas já suportadas pelo assistente: posição financeira, contas a pagar,
  contas a receber, despesas e relatórios de safra.
- Rascunhos de receitas, despesas, boletos, parcelamentos e pagamentos de funcionários.
- Texto de até 1.000 caracteres, áudio, foto JPG/PNG, PDF e vídeo MP4/3GP de até
  **10 MB**. A resposta é por texto. Vídeos curtos são preferíveis; não há análise ao vivo.
- Extração/transcrição com Gemini e revisão do rascunho antes de qualquer gravação.
- Confirmação por texto `CONFIRMAR A1B2C3D4`, com código único válido por 30 minutos.
- `CANCELAR` descarta o rascunho; `AJUDA` mostra os comandos.
- Mensagens persistidas no PostgreSQL, proteção contra reentrega do mesmo ID,
  fila serial e repetição somente da resposta em caso de falha de envio.

A criação usa os serviços financeiros existentes. Não há pagamento bancário,
exclusão, alteração de lançamentos existentes, baixa automática de boletos já
cadastrados ou movimentação de estoque neste primeiro conjunto de comandos.
Uma foto de comprovante não prova a intenção de criar despesa ou receita:
informe o que deseja e revise os dados. Um arquivo por lançamento.

## 1. Começar com o número de teste da Meta

1. Entre no [Meta for Developers](https://developers.facebook.com/) com sua conta.
2. Crie/configure um aplicativo com o produto/caso de uso **WhatsApp Business**.
3. Abra a configuração da API do WhatsApp. Os nomes das telas podem variar.
4. Use o número de teste disponibilizado pela Meta para o robô e adicione seu
   número pessoal como destinatário autorizado de teste, concluindo a verificação.
5. Copie para as variáveis do **backend no Render** o token de acesso e o
   **Phone Number ID**. Esse ID é diferente do número telefônico e do WABA ID.
6. Nas configurações básicas do aplicativo, obtenha o **App Secret**.
7. Use a versão da Graph API indicada no painel da Meta para esse aplicativo.

Você enviará mensagens **do seu WhatsApp pessoal para o número de teste**.
Isso permite testar sem migrar seu número pessoal para a API.
Tokens de teste expiram. Para uso contínuo, siga o processo da Meta para
registrar o número do robô e obter credenciais adequadas de produção com a
permissão `whatsapp_business_messaging` e acesso aos recursos da conta.

Referência: [documentação oficial da Meta no Postman](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## 2. Variáveis no Render

No serviço **da API**, abra **Environment**. Preserve as variáveis existentes,
inclusive `DATABASE_URL` e as chaves JWT. Adicione:

| Variável | Preencher com |
| --- | --- |
| `AI_ENABLED` | `true` |
| `AI_PROVIDER` | `gemini` |
| `AI_API_KEY` | Sua chave do Google AI Studio |
| `AI_MODEL` | `gemini-2.5-flash`, ou outro modelo compatível configurado por você |
| `WHATSAPP_ENABLED` | `true`, após preencher os demais campos e aplicar a migração |
| `WHATSAPP_ACCESS_TOKEN` | Token da Meta |
| `WHATSAPP_APP_SECRET` | Segredo do aplicativo Meta |
| `WHATSAPP_VERIFY_TOKEN` | Um segredo aleatório criado por você para validar o webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de teste/robô na Meta |
| `WHATSAPP_GRAPH_VERSION` | Versão exibida na Meta, no formato `vNN.0` |
| `WHATSAPP_ALLOWED_PHONE` | Seu número pessoal autorizado, com país e DDD, somente dígitos |
| `WHATSAPP_USER_EMAIL` | E-mail exato usado para entrar no AgroFinance |
| `WHATSAPP_COMPANY_ID` | Opcional se você só tem uma empresa ativa; caso contrário, UUID da empresa desejada |
| `WHATSAPP_MEDIA_MODEL` | `gemini-2.5-flash`, ou outro modelo Gemini que aceite as mídias usadas |

`WHATSAPP_ALLOWED_PHONE` deve corresponder exatamente ao identificador enviado
pela Meta, incluindo a formatação internacional do número. Não use o número
do robô nesse campo. Não coloque chaves no frontend/Vercel nem em variáveis
`NEXT_PUBLIC_*`; não faça commit dos valores secretos.

Para gerar o segredo de verificação localmente, execute e copie o resultado
diretamente para o Render e para a configuração do webhook na Meta:

```powershell
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
```

O e-mail deve ter vínculo ativo com a empresa. Com várias empresas, informe
`WHATSAPP_COMPANY_ID`; o código não escolhe uma arbitrariamente. O ID pode ser
consultado na resposta autenticada de listagem de empresas do próprio sistema.
As permissões são verificadas a cada processamento: apenas OWNER, ADMIN e
FINANCIAL podem confirmar gravações; membros de leitura podem consultar.

Referência: [entradas multimodais do Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash).

## 3. Publicar a API e criar as tabelas

Faça commit/push dos arquivos da integração. O frontend não precisa de alteração
para receber mensagens no WhatsApp. No deploy do backend, gere o Prisma Client
atualizado e compile a API. A partir da raiz do repositório:

```sh
pnpm --filter @agrofinance/database build
pnpm --filter api build
```

Preserve também os passos de instalação e compilação dos pacotes compartilhados
que já existem no seu deploy. Antes de iniciar a API com WhatsApp ativo, execute
no ambiente da API, usando o `DATABASE_URL` já configurado no Render:

```sh
pnpm --filter @agrofinance/database migrate:prod
```

Use o passo de pré-deploy ou o terminal do serviço para a migração, conforme
disponibilidade da sua hospedagem. A migração adiciona `whatsapp_sessions` e
`whatsapp_messages`; não modifica lançamentos financeiros. Não use `db:reset`
ou `migrate dev` no banco publicado.

A fila roda no processo persistente da API (a cada 2 segundos). O serviço precisa
estar em execução para processar mensagens e tentativas de envio; quando estiver
suspenso, o processamento aguarda o retorno do serviço. Não configure este worker
como função serverless de curta duração. Desativar `WHATSAPP_ENABLED` interrompe a
integração e mantém o restante da API funcionando.

## 4. Configurar o webhook

Na Meta, configure como Callback URL:

```text
https://SEU-SERVICO-DA-API.onrender.com/api/v1/webhooks/whatsapp
```

Use o endereço **da API no Render**, não o site da Vercel.

No campo Verify Token, coloque o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
Conclua a verificação e assine o campo/evento **messages** da conta WhatsApp.
A rota GET responde ao desafio; a rota POST confere `X-Hub-Signature-256`
com o App Secret antes de aceitar a mensagem.

## 5. Testar no seu celular

1. Envie `AJUDA` do seu número autorizado para o número de teste/robô.
2. Pergunte `Quanto tenho para pagar esta semana?` e compare com o painel.
3. Envie `Criar boleto de R$ 10,00 com vencimento em 20/10/2026, descrição teste`.
4. Confira o rascunho e envie **CANCELAR** no primeiro teste para validar o fluxo
   sem gravar um lançamento artificial na sua empresa.
5. Envie um áudio com a mesma instrução ou uma foto de um boleto real. Revise
   valor, data, conta e situação. Para dados ausentes, envie nomes dos cadastros.
6. Quando estiver correto e for um lançamento que deseja registrar, envie
   `CONFIRMAR` seguido do código mostrado. Verifique o resultado no painel.

O parser existente tem limites: não reconhece qualquer frase, não resolve todas
as ambiguidades e ainda não altera livremente qualquer campo de um rascunho.
Para corrigir valor/data, **CANCELAR e enviar a instrução completa novamente**.
Uma dúvida não resolvida invalida o rascunho anterior. Confira sempre o resumo:
uma mensagem interpretada pela IA pode estar incorreta.

## Falhas e limites desta versão

- Nenhuma chamada real à Meta/Gemini é necessária para os testes automatizados.
  A validação com seu número depende da configuração e de um teste real posterior.
- A resposta está limitada a 4.000 caracteres. Relatórios extensos ficam no painel.
- Respostas são tentadas até cinco vezes com espera crescente. Uma falha de envio
  não executa novamente a gravação financeira. Após falha definitiva, confira os
  registros no painel; mensagens posteriores continuam sendo processadas.
- Após interrupção durante uma operação, o sistema **não repete a operação**.
  O resultado pode ter sido salvo antes da queda: a resposta pede conferência
  no painel. Não há garantia de execução exatamente uma vez em falhas parciais;
  a escolha é evitar duplicação automática de lançamentos.
- Após reinício, um bloqueio de processamento pode levar até 10 minutos para
  expirar. Mensagens com mais de 24 horas não entram; a fila expira em 23 horas
  após o horário original da mensagem para evitar respostas fora da janela da conversa.
- Não envia lembretes proativos nem mensagens de modelo nesta versão.
- Arquivos são baixados em memória e enviados ao Gemini para interpretação.
  Não são arquivados como comprovantes no ERP. A fila guarda texto/IDs até
  processar; depois apaga o payload. IDs de deduplicação ficam no banco.
  Rascunhos ficam no banco até serem descartados, consumidos ou limpos após
  expiração. Respostas com falha definitiva ficam disponíveis no banco para diagnóstico.
- Os custos/limites de Meta, Gemini e hospedagem são os das suas contas.

## Diagnóstico

| Sintoma | Conferir |
| --- | --- |
| Webhook retorna 404 | `WHATSAPP_ENABLED`, URL da API e deploy atualizado |
| Verificação retorna 403 | Verify Token idêntico na Meta e no Render |
| POST retorna 401 | App Secret e assinatura da Meta |
| Mensagem sem resposta | Número pessoal autorizado, Phone Number ID, evento messages e vínculo usuário/empresa |
| Log indica falha na fila | Migração aplicada, banco acessível e configuração válida |
| Log indica resposta não entregue | Token expirado, destinatário de teste autorizado ou erro da Meta |
| Texto funciona, anexo não | Chave/modelo Gemini, tamanho, formato e permissões do token da Meta |

Os logs do módulo registram IDs e tipos de falha; não imprimem tokens, texto da
conversa ou conteúdo dos documentos.
