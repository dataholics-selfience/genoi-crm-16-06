import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Globe, Linkedin, Phone, User, Building2, 
  Calendar, Edit3, Save, X, Plus, Send, MessageSquare, 
  ExternalLink, Users, Briefcase, ChevronLeft, ChevronRight,
  Bot, BotOff
} from 'lucide-react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StartupType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StartupInteractionData {
  id: string;
  startupName: string;
  email: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  description: string;
  founders: FounderData[];
  startupData: StartupType;
  stage: string;
  autoMessaging?: boolean;
}

interface FounderData {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  cargo: string;
}

interface CRMMessage {
  id: string;
  startupId: string;
  userId: string;
  type: 'email' | 'whatsapp' | 'ai_generated';
  content: string;
  sentAt: string;
  recipientName?: string;
  recipientType: 'startup' | 'founder';
  recipientEmail?: string;
  subject?: string;
  status?: 'sent' | 'failed' | 'delivered' | 'generated';
  mailersendId?: string;
  generatedBy?: 'ai' | 'manual';
}

interface StartupInteractionTimelineProps {
  startupId: string;
  onBack: () => void;
}

const PIPELINE_STAGES = [
  { id: 'mapeada', name: 'Mapeada', color: 'bg-yellow-200 text-yellow-800 border-yellow-300' },
  { id: 'selecionada', name: 'Selecionada', color: 'bg-blue-200 text-blue-800 border-blue-300' },
  { id: 'contatada', name: 'Contatada', color: 'bg-red-200 text-red-800 border-red-300' },
  { id: 'entrevistada', name: 'Entrevistada', color: 'bg-green-200 text-green-800 border-green-300' },
  { id: 'poc', name: 'POC', color: 'bg-orange-200 text-orange-800 border-orange-300' }
];

const NewMessageModal = ({ 
  isOpen, 
  onClose, 
  startupData, 
  onMessageSent 
}: {
  isOpen: boolean;
  onClose: () => void;
  startupData: StartupInteractionData;
  onMessageSent: (message: CRMMessage) => void;
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedRecipientType, setSelectedRecipientType] = useState<'startup' | 'founder'>('startup');
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [senderName, setSenderName] = useState('');

  useEffect(() => {
    const fetchSenderName = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setSenderName(userDoc.data().name || 'Equipe Gen.OI');
        }
      } catch (error) {
        console.error('Error fetching sender name:', error);
        setSenderName('Equipe Gen.OI');
      }
    };

    if (isOpen) {
      fetchSenderName();
      // Reset form when modal opens
      setNewMessage('');
      setEmailSubject('');
      setSelectedRecipient('');
      setSelectedRecipientEmail('');
      setMessageType('email');
    }
  }, [isOpen]);

  const handleRecipientChange = (value: string) => {
    setSelectedRecipient(value);
    
    if (value === startupData?.startupName) {
      setSelectedRecipientType('startup');
      setSelectedRecipientEmail(startupData.email);
    } else {
      setSelectedRecipientType('founder');
      const founder = startupData.founders?.find(f => f.name === value);
      setSelectedRecipientEmail(founder?.email || '');
    }
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !startupData || !newMessage.trim() || !selectedRecipient) return;

    setIsSending(true);

    try {
      if (messageType === 'email') {
        // Validações específicas para email
        if (!emailSubject.trim()) {
          alert('Por favor, preencha o assunto do email.');
          setIsSending(false);
          return;
        }
        if (!selectedRecipientEmail) {
          alert('Email do destinatário não encontrado.');
          setIsSending(false);
          return;
        }

        // Template HTML do email com domínios corretos
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
                          ${newMessage.replace(/\n/g, '<br>')}
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

        // Enviar email usando a extensão oficial do MailerSend com domínios corretos
        const emailDoc = await addDoc(collection(db, 'emails'), {
          to: [
            {
              email: selectedRecipientEmail,
              name: selectedRecipient
            }
          ],
          from: {
            email: 'contact@genoi.com.br',  // Usando o domínio validado
            name: 'Gen.OI - Inovação Aberta'
          },
          subject: emailSubject,
          html: htmlContent,
          text: newMessage.trim(),
          reply_to: {
            email: 'contact@genoi.net',  // Responder para genoi.net conforme solicitado
            name: 'Gen.OI - Suporte'
          },
          tags: ['crm', 'startup-interaction'],
          // Metadados para rastreamento
          metadata: {
            startupId: startupData.id,
            userId: auth.currentUser.uid,
            recipientType: selectedRecipientType,
            senderName: senderName,
            timestamp: new Date().toISOString()
          }
        });

        console.log('Email document created with ID:', emailDoc.id);
      } else if (messageType === 'whatsapp') {
        // Enviar WhatsApp usando Evolution API
        let whatsappNumber = '';
        
        if (selectedRecipientType === 'startup') {
          whatsappNumber = startupData.whatsapp;
        } else {
          const founder = startupData.founders?.find(f => f.name === selectedRecipient);
          whatsappNumber = founder?.whatsapp || '';
        }

        if (!whatsappNumber) {
          alert('Número de WhatsApp não encontrado para o destinatário selecionado.');
          setIsSending(false);
          return;
        }

        // Limpar o número (remover caracteres especiais)
        const cleanNumber = whatsappNumber.replace(/\D/g, '');
        
        const instanceKey = "ca93fa89-e9c8-4606-9b74-6bc49a5bccac";
        
        try {
          const response = await fetch(`https://evolution-api-production-f719.up.railway.app/message/sendText/${instanceKey}`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              number: cleanNumber,
              text: newMessage.trim()
            })
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erro HTTP! status: ${response.status}, message: ${error}`);
          }

          const data = await response.json();
          console.log("Mensagem WhatsApp enviada com sucesso:", data);
          
          alert(`WhatsApp enviado com sucesso!\n\nPara: ${whatsappNumber}\nMensagem: ${newMessage.trim()}`);
        } catch (error) {
          console.error("Erro ao enviar WhatsApp:", error);
          throw new Error(`Erro ao enviar WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Registrar a mensagem no CRM
      const messageData: Omit<CRMMessage, 'id'> = {
        startupId: startupData.id,
        userId: auth.currentUser.uid,
        type: messageType,
        content: newMessage.trim(),
        sentAt: new Date().toISOString(),
        recipientName: selectedRecipient,
        recipientType: selectedRecipientType,
        recipientEmail: messageType === 'email' ? selectedRecipientEmail : undefined,
        subject: messageType === 'email' ? emailSubject : undefined,
        status: 'sent',
        generatedBy: 'manual'
      };

      const docRef = await addDoc(collection(db, 'crmMessages'), messageData);
      
      const newCrmMessage: CRMMessage = {
        id: docRef.id,
        ...messageData
      };

      onMessageSent(newCrmMessage);
      
      // Reset form
      setNewMessage('');
      setEmailSubject('');
      setSelectedRecipient('');
      setSelectedRecipientEmail('');
      onClose();

      // Show success message for email
      if (messageType === 'email') {
        alert(`Email enviado com sucesso!\n\nDe: contact@genoi.com.br\nPara: ${selectedRecipientEmail}\nAssunto: ${emailSubject}\n\nO email será processado pela extensão MailerSend.`);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Erro ao enviar mensagem. Tente novamente.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permissão negada. Verifique se a extensão MailerSend está instalada e configurada corretamente.';
      } else if (error.code === 'not-found') {
        errorMessage = 'Coleção "emails" não encontrada. Verifique se a extensão MailerSend está instalada.';
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Nova Mensagem</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as 'email' | 'whatsapp')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <select
              value={selectedRecipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o destinatário</option>
              {startupData.email && messageType === 'email' && (
                <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
              )}
              {startupData.whatsapp && messageType === 'whatsapp' && (
                <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
              )}
              {startupData.founders?.filter(founder => 
                founder.name.trim() && (
                  (messageType === 'email' && founder.email.trim()) ||
                  (messageType === 'whatsapp' && founder.whatsapp.trim())
                )
              ).map((founder) => (
                <option key={founder.id} value={founder.name}>
                  {founder.name} {founder.cargo && `(${founder.cargo})`}
                </option>
              ))}
            </select>
          </div>

          {messageType === 'email' && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Assunto do Email *</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Digite o assunto do email..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {selectedRecipientEmail && messageType === 'email' && (
            <div className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
              📧 Será enviado para: <strong>{selectedRecipientEmail}</strong>
            </div>
          )}

          {messageType === 'whatsapp' && selectedRecipient && (
            <div className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
              📱 Será enviado via WhatsApp para: <strong>{selectedRecipient}</strong>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              {messageType === 'email' ? 'Conteúdo do Email' : 'Mensagem WhatsApp'}
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={messageType === 'email' ? 'Digite o conteúdo do email...' : 'Digite sua mensagem...'}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {messageType === 'email' && (
            <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded">
              <strong>ℹ️ Configuração do Email:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>Remetente:</strong> contact@genoi.com.br ({senderName})</li>
                <li>• <strong>Responder para:</strong> contact@genoi.net</li>
                <li>• <strong>Processamento:</strong> Extensão oficial MailerSend</li>
                <li>• <strong>Domínio validado:</strong> genoi.com.br ✅</li>
                <li>• O email será formatado automaticamente com a identidade visual da Gen.OI</li>
              </ul>
            </div>
          )}

          {messageType === 'whatsapp' && (
            <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded">
              <strong>ℹ️ Configuração do WhatsApp:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>API:</strong> Evolution API</li>
                <li>• <strong>Instância:</strong> ca93fa89-e9c8-4606-9b74-6bc49a5bccac ✅</li>
                <li>• <strong>Status:</strong> Conectada e ativa</li>
                <li>• A mensagem será enviada automaticamente via WhatsApp</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !selectedRecipient || isSending || (messageType === 'email' && (!emailSubject.trim() || !selectedRecipientEmail))}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {isSending ? 'Enviando...' : messageType === 'email' ? 'Enviar Email' : 'Enviar WhatsApp'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIMessageModal = ({ 
  isOpen, 
  onClose, 
  startupData, 
  onMessageSent,
  mode = 'auto'
}: {
  isOpen: boolean;
  onClose: () => void;
  startupData: StartupInteractionData;
  onMessageSent: (message: CRMMessage) => void;
  mode?: 'auto' | 'manual';
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderRole, setSenderRole] = useState('');

  useEffect(() => {
    const fetchSenderData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSenderName(userData.name || 'Daniel Mendes');
          setSenderRole('CEO da Gen.OI');
        }
      } catch (error) {
        console.error('Error fetching sender data:', error);
        setSenderName('Daniel Mendes');
        setSenderRole('CEO da Gen.OI');
      }
    };

    if (isOpen) {
      fetchSenderData();
      setGeneratedMessage('');
    }
  }, [isOpen]);

  const handleGenerateMessage = async () => {
    if (!auth.currentUser || !startupData) return;

    setIsGenerating(true);

    try {
      // Preparar dados para o webhook do n8n
      const webhookPayload = {
        startup: {
          id: startupData.id,
          name: startupData.startupName,
          contact: {
            name: startupData.founders?.[0]?.name || 'Contato',
            phone: startupData.whatsapp || startupData.founders?.[0]?.whatsapp || ''
          },
          segment: startupData.startupData.category || 'Tecnologia',
          problem: startupData.startupData.description || 'Desafio de inovação'
        },
        context: {
          userName: senderName,
          userRole: senderRole
        },
        mode: mode
      };

      console.log('Enviando payload para webhook Genie:', webhookPayload);

      // Chamar o webhook do n8n
      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/genie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta do webhook Genie:', data);

      if (data.message) {
        setGeneratedMessage(data.message);
        
        // Se for modo manual, apenas mostra a mensagem gerada
        if (mode === 'manual') {
          // Registrar a mensagem gerada no CRM
          const messageData: Omit<CRMMessage, 'id'> = {
            startupId: startupData.id,
            userId: auth.currentUser.uid,
            type: 'ai_generated',
            content: data.message,
            sentAt: new Date().toISOString(),
            recipientName: startupData.founders?.[0]?.name || startupData.startupName,
            recipientType: startupData.founders?.[0]?.name ? 'founder' : 'startup',
            status: 'generated',
            generatedBy: 'ai'
          };

          const docRef = await addDoc(collection(db, 'crmMessages'), messageData);
          
          const newCrmMessage: CRMMessage = {
            id: docRef.id,
            ...messageData
          };

          onMessageSent(newCrmMessage);
        }
      } else {
        throw new Error('Nenhuma mensagem foi gerada pela IA');
      }

    } catch (error) {
      console.error('Erro ao gerar mensagem via IA:', error);
      alert(`Erro ao gerar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendGeneratedMessage = async () => {
    if (!generatedMessage.trim() || !startupData.whatsapp) return;

    setIsGenerating(true);

    try {
      // Enviar via WhatsApp usando Evolution API
      const cleanNumber = startupData.whatsapp.replace(/\D/g, '');
      const instanceKey = "ca93fa89-e9c8-4606-9b74-6bc49a5bccac";
      
      const response = await fetch(`https://evolution-api-production-f719.up.railway.app/message/sendText/${instanceKey}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: generatedMessage.trim()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro HTTP! status: ${response.status}, message: ${error}`);
      }

      const data = await response.json();
      console.log("Mensagem IA enviada via WhatsApp:", data);

      // Registrar como enviada
      const messageData: Omit<CRMMessage, 'id'> = {
        startupId: startupData.id,
        userId: auth.currentUser!.uid,
        type: 'whatsapp',
        content: generatedMessage.trim(),
        sentAt: new Date().toISOString(),
        recipientName: startupData.founders?.[0]?.name || startupData.startupName,
        recipientType: startupData.founders?.[0]?.name ? 'founder' : 'startup',
        status: 'sent',
        generatedBy: 'ai'
      };

      const docRef = await addDoc(collection(db, 'crmMessages'), messageData);
      
      const newCrmMessage: CRMMessage = {
        id: docRef.id,
        ...messageData
      };

      onMessageSent(newCrmMessage);
      onClose();

      alert(`Mensagem IA enviada com sucesso!\n\nPara: ${startupData.whatsapp}\nMensagem: ${generatedMessage.trim()}`);

    } catch (error) {
      console.error('Erro ao enviar mensagem gerada:', error);
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-400" size={20} />
            <h3 className="text-lg font-bold text-white">Mensagem via IA</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">Dados da Startup:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Nome:</strong> {startupData.startupName}</li>
              <li>• <strong>Segmento:</strong> {startupData.startupData.category}</li>
              <li>• <strong>Contato:</strong> {startupData.founders?.[0]?.name || 'Não informado'}</li>
              <li>• <strong>WhatsApp:</strong> {startupData.whatsapp || 'Não informado'}</li>
            </ul>
          </div>

          {!generatedMessage ? (
            <div className="text-center py-8">
              <button
                onClick={handleGenerateMessage}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium mx-auto"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando mensagem...
                  </>
                ) : (
                  <>
                    <Bot size={16} />
                    Gerar Mensagem via IA
                  </>
                )}
              </button>
              <p className="text-gray-400 text-sm mt-2">
                A IA irá gerar uma mensagem personalizada baseada nos dados da startup
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Mensagem Gerada pela IA:</label>
                <div className="bg-gray-700 p-4 rounded-lg border border-blue-500">
                  <p className="text-white whitespace-pre-wrap">{generatedMessage}</p>
                </div>
              </div>

              {mode === 'manual' && startupData.whatsapp && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSendGeneratedMessage}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {isGenerating ? 'Enviando...' : 'Enviar via WhatsApp'}
                  </button>
                  <button
                    onClick={handleGenerateMessage}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
                  >
                    Gerar Nova
                  </button>
                </div>
              )}

              {mode === 'auto' && (
                <div className="bg-green-900/20 border border-green-600 p-3 rounded-lg">
                  <p className="text-green-400 text-sm">
                    ✅ Mensagem gerada e enviada automaticamente via WhatsApp
                  </p>
                </div>
              )}

              {!startupData.whatsapp && (
                <div className="bg-yellow-900/20 border border-yellow-600 p-3 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Número de WhatsApp não cadastrado para esta startup
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StageNavigator = ({ 
  currentStage, 
  onStageChange 
}: { 
  currentStage: string; 
  onStageChange: (newStage: string) => void; 
}) => {
  const currentIndex = PIPELINE_STAGES.findIndex(stage => stage.id === currentStage);
  const currentStageData = PIPELINE_STAGES[currentIndex];
  
  const canMovePrevious = currentIndex > 0;
  const canMoveNext = currentIndex < PIPELINE_STAGES.length - 1;

  const handlePrevious = () => {
    if (canMovePrevious) {
      onStageChange(PIPELINE_STAGES[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canMoveNext) {
      onStageChange(PIPELINE_STAGES[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevious}
        disabled={!canMovePrevious}
        className={`p-1 rounded ${
          canMovePrevious 
            ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
            : 'text-gray-600 cursor-not-allowed'
        }`}
      >
        <ChevronLeft size={16} />
      </button>
      
      <span className={`px-2 py-1 rounded text-xs font-medium border ${currentStageData?.color || 'bg-gray-200 text-gray-800'}`}>
        {currentStageData?.name || currentStage}
      </span>
      
      <button
        onClick={handleNext}
        disabled={!canMoveNext}
        className={`p-1 rounded ${
          canMoveNext 
            ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
            : 'text-gray-600 cursor-not-allowed'
        }`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const StartupInteractionTimeline = ({ startupId, onBack }: StartupInteractionTimelineProps) => {
  const navigate = useNavigate();
  const [startupData, setStartupData] = useState<StartupInteractionData | null>(null);
  const [crmMessages, setCrmMessages] = useState<CRMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showAIMessageModal, setShowAIMessageModal] = useState(false);

  useEffect(() => {
    const fetchStartupData = async () => {
      if (!auth.currentUser) return;

      try {
        // Fetch startup data from selectedStartups
        const startupDoc = await getDoc(doc(db, 'selectedStartups', startupId));
        if (!startupDoc.exists()) {
          console.error('Startup not found');
          return;
        }

        const data = startupDoc.data();
        const startup = data.startupData as StartupType;

        // Initialize startup interaction data with persisted values or defaults
        const interactionData: StartupInteractionData = {
          id: startupId,
          startupName: startup.name,
          email: data.email || startup.email || '',
          whatsapp: data.whatsapp || '',
          website: data.website || startup.website || '',
          linkedin: data.linkedin || startup.socialLinks?.linkedin || '',
          description: startup.description || '',
          founders: data.founders || [],
          startupData: startup,
          stage: data.stage || 'mapeada',
          autoMessaging: data.autoMessaging !== undefined ? data.autoMessaging : true
        };

        setStartupData(interactionData);

        // Fetch CRM messages - Use simple query to avoid composite index requirement
        // Filter by startupId only, then filter by userId in memory and sort manually
        const messagesQuery = query(
          collection(db, 'crmMessages'),
          where('startupId', '==', startupId)
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const allMessages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt
        })) as CRMMessage[];

        // Filter messages by current user in memory and sort by sentAt descending
        const userMessages = allMessages
          .filter(message => message.userId === auth.currentUser!.uid)
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        setCrmMessages(userMessages);
      } catch (error) {
        console.error('Error fetching startup data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartupData();
  }, [startupId]);

  const handleUpdateStartupField = async (field: keyof StartupInteractionData, value: string | boolean) => {
    if (!auth.currentUser || !startupData) return;

    try {
      const updatedData = { ...startupData, [field]: value };
      setStartupData(updatedData);

      // Update the selectedStartups document with the new field value
      const updateData: any = {
        [field]: value,
        updatedAt: new Date().toISOString()
      };

      // Also update the startupData nested object for certain fields
      if (field === 'email' || field === 'website' || field === 'linkedin') {
        const updatedStartupData = { ...startupData.startupData };
        
        if (field === 'email') {
          updatedStartupData.email = value as string;
        } else if (field === 'website') {
          updatedStartupData.website = value as string;
        } else if (field === 'linkedin') {
          if (!updatedStartupData.socialLinks) {
            updatedStartupData.socialLinks = {};
          }
          updatedStartupData.socialLinks.linkedin = value as string;
        }
        
        updateData.startupData = updatedStartupData;
        setStartupData(prev => prev ? { ...prev, startupData: updatedStartupData } : null);
      }

      await updateDoc(doc(db, 'selectedStartups', startupId), updateData);
    } catch (error) {
      console.error('Error updating startup field:', error);
    }
  };

  const handleFieldBlur = (field: keyof StartupInteractionData, value: string) => {
    // Persist data when field loses focus
    handleUpdateStartupField(field, value);
  };

  const handleStageChange = async (newStage: string) => {
    if (!auth.currentUser || !startupData) return;

    try {
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      setStartupData(prev => prev ? { ...prev, stage: newStage } : null);
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleToggleAutoMessaging = async () => {
    if (!startupData) return;
    
    const newValue = !startupData.autoMessaging;
    await handleUpdateStartupField('autoMessaging', newValue);
  };

  const handleAddFounder = async () => {
    if (!auth.currentUser || !startupData) return;

    const newFounder: FounderData = {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      whatsapp: '',
      linkedin: '',
      cargo: ''
    };

    const updatedFounders = [...startupData.founders, newFounder];
    const updatedData = { ...startupData, founders: updatedFounders };
    setStartupData(updatedData);

    try {
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        founders: updatedFounders,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding founder:', error);
    }
  };

  const handleUpdateFounder = async (founderId: string, field: keyof FounderData, value: string) => {
    if (!auth.currentUser || !startupData) return;

    const updatedFounders = startupData.founders.map(founder =>
      founder.id === founderId ? { ...founder, [field]: value } : founder
    );

    const updatedData = { ...startupData, founders: updatedFounders };
    setStartupData(updatedData);

    try {
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        founders: updatedFounders,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating founder:', error);
    }
  };

  const handleFounderFieldBlur = (founderId: string, field: keyof FounderData, value: string) => {
    // Persist founder data when field loses focus
    handleUpdateFounder(founderId, field, value);
  };

  const handleRemoveFounder = async (founderId: string) => {
    if (!auth.currentUser || !startupData) return;

    const founder = startupData.founders.find(f => f.id === founderId);
    if (founder && founder.name.trim()) {
      const confirmDelete = window.confirm(`Tem certeza que deseja remover o fundador "${founder.name}"?`);
      if (!confirmDelete) return;
    }

    const updatedFounders = startupData.founders.filter(founder => founder.id !== founderId);
    const updatedData = { ...startupData, founders: updatedFounders };
    setStartupData(updatedData);

    try {
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        founders: updatedFounders,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error removing founder:', error);
    }
  };

  const handleContactClick = (contactType: 'email' | 'whatsapp', recipientName: string, recipientType: 'startup' | 'founder') => {
    setShowNewMessageModal(true);
  };

  const handleMessageSent = (newMessage: CRMMessage) => {
    setCrmMessages(prev => [newMessage, ...prev]);
  };

  const canAddFounder = () => {
    if (!startupData?.founders || startupData.founders.length === 0) return true;
    
    // Check if the last founder has at least a name
    const lastFounder = startupData.founders[startupData.founders.length - 1];
    return lastFounder.name.trim() !== '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando dados da startup...</div>
      </div>
    );
  }

  if (!startupData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">Startup não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="flex flex-col p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white focus:outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4 flex-1 ml-4">
            <Building2 size={20} className="text-gray-400" />
            <h2 className="text-lg font-medium">{startupData.startupName}</h2>
            <StageNavigator 
              currentStage={startupData.stage} 
              onStageChange={handleStageChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoMessaging}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                startupData.autoMessaging
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
              title={startupData.autoMessaging ? 'Mensagens automáticas ativadas' : 'Mensagens automáticas desativadas'}
            >
              {startupData.autoMessaging ? <Bot size={16} /> : <BotOff size={16} />}
              {startupData.autoMessaging ? 'Auto' : 'Manual'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Startup Data (30% width) */}
        <div className="w-[30%] p-6 border-r border-gray-700 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4">Informações da Startup</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Startup</label>
                  <input
                    type="text"
                    value={startupData.startupName}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-gray-300 cursor-not-allowed opacity-75"
                    title="Este campo não pode ser editado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={startupData.email}
                      onChange={(e) => setStartupData(prev => prev ? { ...prev, email: e.target.value } : null)}
                      onBlur={(e) => handleFieldBlur('email', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {startupData.email && (
                      <button
                        onClick={() => handleContactClick('email', startupData.startupName, 'startup')}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors"
                        title="Enviar email"
                      >
                        <Mail size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={startupData.whatsapp}
                      onChange={(e) => setStartupData(prev => prev ? { ...prev, whatsapp: e.target.value } : null)}
                      onBlur={(e) => handleFieldBlur('whatsapp', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+55 11 99999-9999"
                    />
                    {startupData.whatsapp && (
                      <button
                        onClick={() => handleContactClick('whatsapp', startupData.startupName, 'startup')}
                        className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <Phone size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={startupData.website}
                      onChange={(e) => setStartupData(prev => prev ? { ...prev, website: e.target.value } : null)}
                      onBlur={(e) => handleFieldBlur('website', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {startupData.website && (
                      <a
                        href={startupData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-400 hover:text-blue-300"
                      >
                        <Globe size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={startupData.linkedin}
                      onChange={(e) => setStartupData(prev => prev ? { ...prev, linkedin: e.target.value } : null)}
                      onBlur={(e) => handleFieldBlur('linkedin', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {startupData.linkedin && (
                      <a
                        href={startupData.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-400 hover:text-blue-300"
                      >
                        <Linkedin size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                  <textarea
                    value={startupData.description}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-gray-300 resize-none cursor-not-allowed opacity-75"
                    title="Este campo não pode ser editado"
                  />
                </div>

                <div>
                  <button
                    onClick={() => navigate('/startups')}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <ExternalLink size={16} />
                    Ver card completo da startup
                  </button>
                </div>
              </div>
            </div>

            {/* Founders */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Fundadores</h3>
                <button
                  onClick={handleAddFounder}
                  disabled={!canAddFounder()}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
                  title={!canAddFounder() ? "Preencha o nome do fundador anterior antes de adicionar um novo" : "Adicionar novo fundador"}
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>

              <div className="space-y-4">
                {startupData.founders?.map((founder) => (
                  <div key={founder.id} className="border border-gray-600 rounded-lg p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-white font-medium">Fundador</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFounder(founder.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={founder.name}
                          onChange={(e) => {
                            const updatedFounders = startupData.founders.map(f =>
                              f.id === founder.id ? { ...f, name: e.target.value } : f
                            );
                            setStartupData(prev => prev ? { ...prev, founders: updatedFounders } : null);
                          }}
                          onBlur={(e) => handleFounderFieldBlur(founder.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nome do fundador"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={founder.email}
                            onChange={(e) => {
                              const updatedFounders = startupData.founders.map(f =>
                                f.id === founder.id ? { ...f, email: e.target.value } : f
                              );
                              setStartupData(prev => prev ? { ...prev, founders: updatedFounders } : null);
                            }}
                            onBlur={(e) => handleFounderFieldBlur(founder.id, 'email', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="email@exemplo.com"
                          />
                          {founder.email && (
                            <button
                              onClick={() => handleContactClick('email', founder.name, 'founder')}
                              className="text-blue-400 hover:text-blue-300 hover:bg-gray-700 p-1 rounded transition-colors"
                              title="Enviar email"
                            >
                              <Mail size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">WhatsApp</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={founder.whatsapp}
                            onChange={(e) => {
                              const updatedFounders = startupData.founders.map(f =>
                                f.id === founder.id ? { ...f, whatsapp: e.target.value } : f
                              );
                              setStartupData(prev => prev ? { ...prev, founders: updatedFounders } : null);
                            }}
                            onBlur={(e) => handleFounderFieldBlur(founder.id, 'whatsapp', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="+55 11 99999-9999"
                          />
                          {founder.whatsapp && (
                            <button
                              onClick={() => handleContactClick('whatsapp', founder.name, 'founder')}
                              className="text-green-400 hover:text-green-300 hover:bg-gray-700 p-1 rounded transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <Phone size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">LinkedIn</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={founder.linkedin}
                            onChange={(e) => {
                              const updatedFounders = startupData.founders.map(f =>
                                f.id === founder.id ? { ...f, linkedin: e.target.value } : f
                              );
                              setStartupData(prev => prev ? { ...prev, founders: updatedFounders } : null);
                            }}
                            onBlur={(e) => handleFounderFieldBlur(founder.id, 'linkedin', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="https://linkedin.com/in/..."
                          />
                          {founder.linkedin && (
                            <a
                              href={founder.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Linkedin size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Cargo</label>
                        <div className="flex items-center gap-2">
                          <Briefcase size={14} className="text-gray-400" />
                          <input
                            type="text"
                            value={founder.cargo}
                            onChange={(e) => {
                              const updatedFounders = startupData.founders.map(f =>
                                f.id === founder.id ? { ...f, cargo: e.target.value } : f
                              );
                              setStartupData(prev => prev ? { ...prev, founders: updatedFounders } : null);
                            }}
                            onBlur={(e) => handleFounderFieldBlur(founder.id, 'cargo', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="CEO, CTO, Fundador..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!startupData.founders || startupData.founders.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum fundador cadastrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Timeline (70% width) */}
        <div className="w-[70%] flex flex-col">
          {/* Timeline Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Timeline de Interações</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAIMessageModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  <Bot size={16} />
                  Enviar Mensagem via IA
                </button>
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  <Plus size={16} />
                  Nova Mensagem
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {crmMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma interação registrada</p>
                  <p className="text-sm">Envie sua primeira mensagem para começar</p>
                </div>
              ) : (
                crmMessages.map((message) => (
                  <div key={message.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {message.type === 'email' ? (
                          <Mail size={16} className="text-blue-400" />
                        ) : message.type === 'whatsapp' ? (
                          <Phone size={16} className="text-green-400" />
                        ) : (
                          <Bot size={16} className="text-purple-400" />
                        )}
                        <span className="text-white font-medium">
                          {message.type === 'email' ? 'Email' : message.type === 'whatsapp' ? 'WhatsApp' : 'IA Gerada'}
                        </span>
                        {message.recipientName && (
                          <span className="text-gray-400 text-sm">
                            para {message.recipientName}
                          </span>
                        )}
                        {message.generatedBy === 'ai' && (
                          <span className="text-purple-400 text-xs bg-purple-900/20 px-2 py-1 rounded">
                            Gerada por IA
                          </span>
                        )}
                        {message.status === 'failed' && (
                          <span className="text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded">
                            Falha no envio
                          </span>
                        )}
                        {message.status === 'sent' && message.type === 'email' && (
                          <span className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded">
                            Enviado via MailerSend
                          </span>
                        )}
                        {message.status === 'sent' && message.type === 'whatsapp' && (
                          <span className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded">
                            Enviado via WhatsApp
                          </span>
                        )}
                        {message.status === 'generated' && (
                          <span className="text-blue-400 text-xs bg-blue-900/20 px-2 py-1 rounded">
                            Mensagem Gerada
                          </span>
                        )}
                        {message.status === 'delivered' && (
                          <span className="text-blue-400 text-xs bg-blue-900/20 px-2 py-1 rounded">
                            Entregue
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {format(new Date(message.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {message.subject && (
                      <div className="text-blue-300 font-medium mb-2">
                        Assunto: {message.subject}
                      </div>
                    )}
                    {message.recipientEmail && (
                      <div className="text-gray-400 text-sm mb-2">
                        📧 {message.recipientEmail}
                      </div>
                    )}
                    <p className="text-gray-300 whitespace-pre-wrap">{message.content}</p>
                    {message.mailersendId && (
                      <div className="text-xs text-gray-500 mt-2">
                        ID: {message.mailersendId}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        startupData={startupData}
        onMessageSent={handleMessageSent}
      />

      {/* AI Message Modal */}
      <AIMessageModal
        isOpen={showAIMessageModal}
        onClose={() => setShowAIMessageModal(false)}
        startupData={startupData}
        onMessageSent={handleMessageSent}
        mode={startupData.autoMessaging ? 'auto' : 'manual'}
      />
    </div>
  );
};

export default StartupInteractionTimeline;