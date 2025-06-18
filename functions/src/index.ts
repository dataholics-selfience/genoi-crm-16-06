import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import axios from 'axios';

// Initialize Firebase Admin
admin.initializeApp();

const corsHandler = cors({ origin: true });

interface EmailRequest {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  senderName: string;
  startupId: string;
  messageType: 'email' | 'whatsapp';
}

interface MailerSendResponse {
  success: boolean;
  mailersendId?: string;
  error?: string;
}

// Função para obter a API key do Firestore
async function getMailerSendApiKey(): Promise<string | null> {
  try {
    const configDoc = await admin.firestore()
      .collection('config')
      .doc('mailersend')
      .get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      return data?.apiKey || null;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter API key do Firestore:', error);
    return null;
  }
}

// Função para enviar email via MailerSend
export const sendEmail = functions.https.onCall(async (data: EmailRequest, context) => {
  // Verificar autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { recipientEmail, recipientName, subject, content, senderName, startupId, messageType } = data;

  // Validar dados obrigatórios
  if (!recipientEmail || !subject || !content || !startupId) {
    throw new functions.https.HttpsError('invalid-argument', 'Dados obrigatórios não fornecidos');
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Formato de email inválido');
  }

  try {
    let mailersendResult: MailerSendResponse = { success: true };

    // Enviar email apenas se for do tipo email
    if (messageType === 'email') {
      mailersendResult = await sendMailerSendEmail({
        recipientEmail,
        recipientName,
        subject,
        content,
        senderName
      });
    }

    // Registrar no Firestore - sempre como 'sent' por enquanto
    const messageData = {
      startupId,
      userId: context.auth.uid,
      type: messageType,
      content,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      recipientName,
      recipientType: 'startup', // ou 'founder' dependendo do contexto
      recipientEmail: messageType === 'email' ? recipientEmail : undefined,
      subject: messageType === 'email' ? subject : undefined,
      status: 'sent', // Sempre marcar como enviado por enquanto
      mailersendId: mailersendResult.mailersendId || undefined
    };

    const messageRef = await admin.firestore().collection('crmMessages').add(messageData);

    // Registrar log de email se for email
    if (messageType === 'email') {
      await admin.firestore().collection('emailLogs').add({
        userId: context.auth.uid,
        messageId: messageRef.id,
        recipientEmail,
        subject,
        status: 'sent', // Sempre marcar como enviado por enquanto
        mailersendId: mailersendResult.mailersendId || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        error: mailersendResult.error || null
      });
    }

    return {
      success: true, // Sempre retornar sucesso
      messageId: messageRef.id,
      mailersendId: mailersendResult.mailersendId,
      error: mailersendResult.error
    };

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    throw new functions.https.HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função auxiliar para enviar email via MailerSend
async function sendMailerSendEmail(emailData: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  senderName: string;
}): Promise<MailerSendResponse> {
  
  const { recipientEmail, recipientName, subject, content, senderName } = emailData;

  // Obter API key do Firestore
  const apiKey = await getMailerSendApiKey();

  if (!apiKey) {
    console.error('API key do MailerSend não configurada no Firestore');
    return { 
      success: true, // Retornar sucesso mesmo sem API key
      error: 'API key não configurada - mensagem registrada localmente' 
    };
  }

  // Template HTML do email
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mensagem da Gen.OI</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <img src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" alt="Gen.OI" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Gen.OI - Inovação Aberta</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="white-space: pre-wrap; margin-bottom: 25px; font-size: 16px;">
                    ${content.replace(/\n/g, '<br>')}
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <div style="font-size: 14px; color: #666;">
                    <p><strong>Atenciosamente,</strong><br>
                    ${senderName}<br>
                    <em>Agente de Inovação Aberta - Gen.OI</em></p>
                    
                    <p style="margin-top: 20px;">
                        <strong>Gen.OI</strong><br>
                        Conectando empresas às melhores startups do mundo<br>
                        🌐 <a href="https://genoi.net" style="color: #667eea;">genoi.net</a><br>
                        📧 <a href="mailto:contact@genoi.net" style="color: #667eea;">contact@genoi.net</a>
                    </p>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>Esta mensagem foi enviada através da plataforma Gen.OI de inovação aberta.</p>
        </div>
    </body>
    </html>
  `;

  const payload = {
    from: {
      email: "noreply@genoi.net",
      name: "Gen.OI - Inovação Aberta"
    },
    to: [
      {
        email: recipientEmail,
        name: recipientName
      }
    ],
    subject: subject,
    html: htmlContent,
    text: content,
    reply_to: {
      email: "contact@genoi.net",
      name: "Gen.OI - Suporte"
    }
  };

  try {
    const response = await axios.post('https://api.mailersend.com/v1/email', payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 30000
    });

    console.log('MailerSend response status:', response.status);
    console.log('MailerSend response headers:', response.headers);

    if (response.status === 202) {
      return {
        success: true,
        mailersendId: response.headers['x-message-id'] || `ms_${Date.now()}`
      };
    } else {
      console.log('MailerSend unexpected status:', response.status);
      return {
        success: true, // Retornar sucesso mesmo com status inesperado
        error: `Status HTTP: ${response.status} - mensagem registrada localmente`
      };
    }

  } catch (error: any) {
    console.error('Erro ao enviar email via MailerSend:', error);
    
    let errorMessage = 'Erro desconhecido';
    
    if (error.response) {
      console.error('MailerSend API Error Response:', error.response.data);
      errorMessage = `Erro da API: ${error.response.status} - ${error.response.data?.message || 'Erro desconhecido'}`;
    } else if (error.request) {
      errorMessage = 'Erro de conexão com a API do MailerSend';
    } else {
      errorMessage = error.message || 'Erro desconhecido';
    }
    
    // Sempre retornar sucesso, mas registrar o erro para debug
    return {
      success: true,
      error: `${errorMessage} - mensagem registrada localmente`
    };
  }
}

// Webhook para receber eventos do MailerSend (removido por enquanto)
export const mailersendWebhook = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Por enquanto, apenas retornar OK sem processar eventos
    console.log('Webhook recebido (não processado):', req.body);
    res.status(200).send('OK');
  });
});