import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

interface EmailRequest {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  senderName?: string;
}

interface MailerSendResponse {
  id?: string;
  message_id?: string;
  message?: string;
}

export const sendEmail = functions.https.onCall(async (data: EmailRequest, context) => {
  // Verificar se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário deve estar autenticado');
  }

  const { recipientEmail, recipientName, subject, textContent, htmlContent, senderName } = data;

  // Validar campos obrigatórios
  if (!recipientEmail || !recipientName || !subject || !textContent) {
    throw new functions.https.HttpsError('invalid-argument', 'Campos obrigatórios não preenchidos');
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Formato de email inválido');
  }

  try {
    // Obter a API key do MailerSend das variáveis de ambiente
    const mailersendApiKey = functions.config().mailersend?.api_key;
    
    if (!mailersendApiKey) {
      throw new functions.https.HttpsError('internal', 'Configuração de email não encontrada');
    }

    // Enviar email via MailerSend
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailersendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: 'contact@genoi.com.br',
          name: 'Agente de inovação aberta - Genie',
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName,
          },
        ],
        reply_to: {
          email: 'contact@genoi.net',
          name: 'Contato - Gen.OI',
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error('MailerSend API error:', errorData);
      
      throw new functions.https.HttpsError(
        'internal',
        `Erro ao enviar email: ${errorData.message || response.statusText}`
      );
    }

    const result = await response.json() as MailerSendResponse;
    
    // Registrar o envio no Firestore para auditoria
    await admin.firestore().collection('emailLogs').add({
      userId: context.auth.uid,
      recipientEmail,
      recipientName,
      subject,
      mailersendId: result.id || result.message_id,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });

    return {
      success: true,
      mailersendId: result.id || result.message_id,
      message: 'Email enviado com sucesso'
    };

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    
    // Registrar falha no Firestore
    await admin.firestore().collection('emailLogs').add({
      userId: context.auth.uid,
      recipientEmail,
      recipientName,
      subject,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'failed',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para webhook do MailerSend (para receber status de entrega)
export const mailersendWebhook = functions.https.onRequest(async (req, res) => {
  // Verificar se é uma requisição POST
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const webhookData = req.body;
    
    // Processar eventos do MailerSend
    if (webhookData.data && Array.isArray(webhookData.data)) {
      for (const event of webhookData.data) {
        if (event.email && event.email.message && event.email.message.id) {
          const messageId = event.email.message.id;
          const eventType = event.type; // sent, delivered, opened, clicked, etc.
          
          // Atualizar o log do email no Firestore
          const emailLogsRef = admin.firestore().collection('emailLogs');
          const query = await emailLogsRef.where('mailersendId', '==', messageId).get();
          
          if (!query.empty) {
            const doc = query.docs[0];
            await doc.ref.update({
              [`events.${eventType}`]: {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                data: event
              }
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook do MailerSend:', error);
    res.status(500).send('Internal Server Error');
  }
});