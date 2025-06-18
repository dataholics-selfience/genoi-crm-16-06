# Gen.OI - Plataforma de Inovação Aberta

## 🔧 Configuração do MailerSend

### 1. Instalar a extensão oficial do MailerSend

#### Via Console Firebase:
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto `genoi-7777`
3. Vá em **Extensions** no menu lateral
4. Clique em **Browse Hub**
5. Procure por "MailerSend" ou acesse diretamente: [MailerSend Extension](https://extensions.dev/extensions/mailersend/mailersend-email)
6. Clique em **Install**

#### Via Firebase CLI:
```bash
firebase ext:install mailersend/mailersend-email --project=genoi-7777
```

### 2. Configuração durante a instalação

Durante a instalação, você será solicitado a configurar os seguintes parâmetros:

- **MAILERSEND_API_KEY**: `mlsn.sua_api_key_aqui`
- **EMAIL_COLLECTION**: `emails`
- **DEFAULT_FROM_EMAIL**: `noreply@genoi.net`
- **DEFAULT_FROM_NAME**: `Gen.OI - Inovação Aberta`

### 3. Configurar domínio no MailerSend

1. Acesse o [painel do MailerSend](https://app.mailersend.com/)
2. Vá em **Domains** > **Add Domain**
3. Adicione o domínio `genoi.net`
4. Configure os registros DNS conforme instruído:
   - **TXT** para verificação
   - **CNAME** para DKIM
   - **MX** (se necessário)

### 4. Obter API Key

1. No painel do MailerSend, vá em **API Tokens**
2. Clique em **Create Token**
3. Selecione as permissões: **Email Send**
4. Copie a API key (formato: `mlsn.xxxxx`)

## 📧 Como funciona

### Envio de Email
1. O usuário preenche o formulário na interface
2. O sistema adiciona um documento na coleção `emails` do Firestore
3. A extensão do MailerSend detecta automaticamente o novo documento
4. O email é enviado via MailerSend
5. O status é atualizado no documento

### Estrutura do documento de email:
```javascript
{
  to: [{ email: 'destinatario@exemplo.com', name: 'Nome' }],
  from: { email: 'noreply@genoi.net', name: 'Gen.OI' },
  subject: 'Assunto do email',
  html: 'Conteúdo HTML formatado',
  text: 'Conteúdo em texto simples',
  reply_to: { email: 'contact@genoi.net', name: 'Gen.OI - Suporte' },
  tags: ['crm', 'startup-interaction'],
  metadata: { startupId: 'xxx', userId: 'xxx' }
}
```

## 🎯 Vantagens desta abordagem

✅ **Mais confiável**: Extensão oficial mantida pelo MailerSend  
✅ **Mais simples**: Sem código de Functions para manter  
✅ **Mais segura**: API key protegida na configuração da extensão  
✅ **Monitoramento automático**: Logs e status integrados  
✅ **Retry automático**: Tentativas automáticas em caso de falha  
✅ **Webhooks automáticos**: Eventos de entrega configurados automaticamente  

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
firebase deploy
```

## 📊 Monitoramento

### Logs da extensão
- Acesse **Extensions** > **MailerSend** > **Logs** no Firebase Console
- Monitore envios, falhas e status de entrega

### Métricas no MailerSend
- Dashboard com estatísticas de envio
- Taxa de entrega, abertura e cliques
- Relatórios detalhados

## 🔧 Troubleshooting

### Email não enviado
1. Verifique se a extensão está instalada e ativa
2. Confirme se a API key está correta
3. Verifique se o domínio está verificado no MailerSend
4. Consulte os logs da extensão no Firebase Console

### Domínio não verificado
1. Confirme os registros DNS no seu provedor
2. Aguarde a propagação (pode levar até 24h)
3. Use a ferramenta de verificação do MailerSend