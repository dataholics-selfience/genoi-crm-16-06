# Gen.OI - Plataforma de Inovação Aberta

## 🔧 Configuração do Ambiente

### 1. Configuração do Firebase

#### Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### Configurar o projeto
```bash
firebase init
# Selecione: Functions, Firestore, Hosting
```

#### Configurar variáveis de ambiente para Firebase Functions
```bash
# Configurar API key do MailerSend
firebase functions:config:set mailersend.api_key="sua_api_key_do_mailersend"

# Configurar URL do webhook de produção
firebase functions:config:set webhook.production_url="sua_url_do_webhook"

# Verificar configurações
firebase functions:config:get
```

### 2. Deploy das Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 3. Configuração do Firestore

#### Índices necessários (já configurados em firestore.indexes.json):
- `crmMessages`: startupId, userId, sentAt
- `emailLogs`: userId, sentAt
- `emailLogs`: mailersendId

### 4. Segurança

#### Credenciais protegidas:
- ✅ API key do MailerSend: Configurada via Firebase Functions config
- ✅ URLs de webhook: Configuradas via Firebase Functions config
- ✅ Configuração do Firebase: Pública (apenas configuração, não credenciais)

#### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas a usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Logs de email - apenas leitura para o próprio usuário
    match /emailLogs/{logId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false; // Apenas Functions podem escrever
    }
  }
}
```

## 📧 Funcionalidades de Email

### Envio via Firebase Functions
- **Função**: `sendEmail`
- **Autenticação**: Requerida
- **Validação**: Email, assunto e conteúdo obrigatórios
- **Template**: HTML automático com identidade Gen.OI
- **Logs**: Registro automático no Firestore

### Webhook do MailerSend
- **Função**: `mailersendWebhook`
- **Eventos**: delivered, opened, clicked, bounced
- **Atualização**: Status automático no Firestore

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
firebase emulators:start
```

### Produção
```bash
npm run build
firebase deploy
```

## 📊 Monitoramento

### Logs das Functions
```bash
firebase functions:log
```

### Métricas no Console Firebase
- Execuções das Functions
- Erros e latência
- Uso do Firestore