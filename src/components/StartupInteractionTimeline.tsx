import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Globe, Linkedin, Phone, User, Building2, 
  Calendar, Edit3, Save, X, Plus, Send, MessageSquare, 
  ExternalLink, Users, Briefcase, ChevronLeft, ChevronRight
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
  type: 'email' | 'whatsapp';
  content: string;
  sentAt: string;
  recipientName?: string;
  recipientType: 'startup' | 'founder';
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  status?: 'sent' | 'failed' | 'delivered';
  mailersendId?: string;
  whatsappResponse?: any;
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

// Função para formatar número de telefone para o padrão internacional
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se já está no formato correto (55 + DDD + número)
  if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    return cleanPhone;
  }
  
  // Se tem 11 dígitos (DDD + número)
  if (cleanPhone.length === 11) {
    return `55${cleanPhone}`;
  }
  
  // Se tem 10 dígitos (DDD + número sem 9)
  if (cleanPhone.length === 10) {
    return `55${cleanPhone.substring(0, 2)}9${cleanPhone.substring(2)}`;
  }
  
  // Se tem 9 dígitos (número sem DDD)
  if (cleanPhone.length === 9) {
    return `5511${cleanPhone}`;
  }
  
  // Se tem 8 dígitos (número sem DDD e sem 9)
  if (cleanPhone.length === 8) {
    return `55119${cleanPhone}`;
  }
  
  return cleanPhone;
};

// Função para enviar mensagem via Evolution API
const sendMessageToWhatsApp = async (number: string, message: string): Promise<any> => {
  const formattedNumber = formatPhoneNumber(number);
  
  try {
    const response = await fetch('https://evolution-api-production-f719.up.railway.app/message/sendText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message,
        instance_key: '33B96FBA8E3F-4156-8196-65174145F266'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error in sendMessageToWhatsApp:', error);
    throw error;
  }
};

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
  const [selectedRecipientPhone, setSelectedRecipientPhone] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userCompany, setUserCompany] = useState('');
  const [showAddWhatsApp, setShowAddWhatsApp] = useState(false);
  const [newWhatsAppNumber, setNewWhatsAppNumber] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserCompany(userData.company || 'Gen.OI');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserCompany('Gen.OI');
      }
    };

    if (isOpen) {
      fetchUserData();
      // Reset form when modal opens
      setNewMessage('');
      setEmailSubject('');
      setSelectedRecipient('');
      setSelectedRecipientEmail('');
      setSelectedRecipientPhone('');
      setMessageType('email');
      setShowAddWhatsApp(false);
      setNewWhatsAppNumber('');
    }
  }, [isOpen]);

  const handleRecipientChange = (value: string) => {
    setSelectedRecipient(value);
    setShowAddWhatsApp(false);
    
    if (value === startupData?.startupName) {
      setSelectedRecipientType('startup');
      setSelectedRecipientEmail(startupData.email);
      setSelectedRecipientPhone(startupData.whatsapp);
    } else {
      setSelectedRecipientType('founder');
      const founder = startupData.founders?.find(f => f.name === value);
      setSelectedRecipientEmail(founder?.email || '');
      setSelectedRecipientPhone(founder?.whatsapp || '');
    }
  };

  const handleAddWhatsApp = async () => {
    if (!newWhatsAppNumber.trim()) return;

    const formattedNumber = formatPhoneNumber(newWhatsAppNumber);
    
    if (selectedRecipientType === 'startup') {
      // Update startup WhatsApp
      await updateDoc(doc(db, 'selectedStartups', startupData.id), {
        whatsapp: formattedNumber,
        updatedAt: new Date().toISOString()
      });
      setSelectedRecipientPhone(formattedNumber);
    } else {
      // Update founder WhatsApp
      const founder = startupData.founders?.find(f => f.name === selectedRecipient);
      if (founder) {
        const updatedFounders = startupData.founders.map(f =>
          f.id === founder.id ? { ...f, whatsapp: formattedNumber } : f
        );
        
        await updateDoc(doc(db, 'selectedStartups', startupData.id), {
          founders: updatedFounders,
          updatedAt: new Date().toISOString()
        });
        setSelectedRecipientPhone(formattedNumber);
      }
    }
    
    setShowAddWhatsApp(false);
    setNewWhatsAppNumber('');
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !startupData || !newMessage.trim() || !selectedRecipient) return;

    setIsSending(true);

    try {
      let messageStatus = 'sent';
      let whatsappResponse = null;

      if (messageType === 'email') {
        // Validações específicas para email
        if (!emailSubject.trim()) {
          setIsSending(false);
          return;
        }
        if (!selectedRecipientEmail) {
          setIsSending(false);
          return;
        }

        // Criar assunto dinâmico
        const dynamicSubject = `A ${userCompany} deseja contatar a ${startupData.startupName} - ${emailSubject}`;

        // Template HTML do email exatamente como funcionou antes
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
                          Genie, sua agente IA de inovação aberta</p>
                          
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
                  <p>Enviado via Genoi.net</p>
              </div>
          </body>
          </html>
        `;

        // Enviar email usando a extensão oficial do MailerSend - formato exato que funcionou
        await addDoc(collection(db, 'emails'), {
          to: [
            {
              email: selectedRecipientEmail,
              name: selectedRecipient
            }
          ],
          from: {
            email: 'contact@genoi.com.br',
            name: 'Gen.OI - Inovação Aberta'
          },
          subject: dynamicSubject,
          html: htmlContent,
          text: newMessage.trim(),
          reply_to: {
            email: 'contact@genoi.net',
            name: 'Gen.OI - Suporte'
          },
          tags: ['crm', 'startup-interaction'],
          metadata: {
            startupId: startupData.id,
            userId: auth.currentUser.uid,
            recipientType: selectedRecipientType,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // WhatsApp - verificar se tem número
        if (!selectedRecipientPhone) {
          setShowAddWhatsApp(true);
          setIsSending(false);
          return;
        }

        try {
          // Enviar mensagem via Evolution API com URL corrigida
          whatsappResponse = await sendMessageToWhatsApp(selectedRecipientPhone, newMessage);
          
          if (!whatsappResponse || !whatsappResponse.key) {
            messageStatus = 'failed';
          }
        } catch (error) {
          console.error('Error sending WhatsApp:', error);
          messageStatus = 'failed';
          whatsappResponse = { error: error.message };
        }
      }

      // Registrar a mensagem no CRM - construir objeto sem campos undefined
      const messageData: any = {
        startupId: startupData.id,
        userId: auth.currentUser.uid,
        type: messageType,
        content: newMessage.trim(),
        sentAt: new Date().toISOString(),
        recipientName: selectedRecipient,
        recipientType: selectedRecipientType,
        status: messageStatus
      };

      // Adicionar campos específicos apenas se não forem undefined
      if (messageType === 'email' && selectedRecipientEmail) {
        messageData.recipientEmail = selectedRecipientEmail;
        messageData.subject = `A ${userCompany} deseja contatar a ${startupData.startupName} - ${emailSubject}`;
      }

      if (messageType === 'whatsapp' && selectedRecipientPhone) {
        messageData.recipientPhone = selectedRecipientPhone;
        messageData.whatsappResponse = whatsappResponse;
      }

      const docRef = await addDoc(collection(db, 'crmMessages'), messageData);
      
      const newCrmMessage: CRMMessage = {
        id: docRef.id,
        ...messageData
      };

      onMessageSent(newCrmMessage);
      
      // Reset form and close modal
      setNewMessage('');
      setEmailSubject('');
      setSelectedRecipient('');
      setSelectedRecipientEmail('');
      setSelectedRecipientPhone('');
      onClose();

    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Filtrar contatos disponíveis baseado no tipo de mensagem
  const availableContacts = [];
  
  // Adicionar startup se tiver o contato necessário
  if (messageType === 'email' && startupData.email) {
    availableContacts.push({ name: startupData.startupName, type: 'startup' });
  } else if (messageType === 'whatsapp' && startupData.whatsapp) {
    availableContacts.push({ name: startupData.startupName, type: 'startup' });
  }

  // Adicionar fundadores que têm o contato necessário
  startupData.founders?.forEach(founder => {
    if (founder.name.trim()) {
      if (messageType === 'email' && founder.email.trim()) {
        availableContacts.push({ name: founder.name, type: 'founder' });
      } else if (messageType === 'whatsapp' && founder.whatsapp.trim()) {
        availableContacts.push({ name: founder.name, type: 'founder' });
      }
    }
  });

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
              onChange={(e) => {
                setMessageType(e.target.value as 'email' | 'whatsapp');
                setSelectedRecipient('');
                setSelectedRecipientEmail('');
                setSelectedRecipientPhone('');
                setShowAddWhatsApp(false);
              }}
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
              {availableContacts.map((contact, index) => (
                <option key={index} value={contact.name}>
                  {contact.name} {contact.type === 'startup' ? '(Geral)' : '(Fundador)'}
                </option>
              ))}
            </select>
          </div>

          {/* Mostrar contatos sem WhatsApp quando necessário */}
          {messageType === 'whatsapp' && availableContacts.length === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded p-3">
              <p className="text-yellow-400 text-sm mb-2">
                Nenhum contato tem WhatsApp cadastrado. Selecione um contato para adicionar:
              </p>
              <select
                value={selectedRecipient}
                onChange={(e) => {
                  setSelectedRecipient(e.target.value);
                  if (e.target.value) {
                    setShowAddWhatsApp(true);
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione para adicionar WhatsApp</option>
                {startupData.email && (
                  <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
                )}
                {startupData.founders?.filter(f => f.name.trim()).map((founder) => (
                  <option key={founder.id} value={founder.name}>
                    {founder.name} {founder.cargo && `(${founder.cargo})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campo para adicionar WhatsApp */}
          {showAddWhatsApp && (
            <div className="bg-blue-900/20 border border-blue-600 rounded p-3">
              <p className="text-blue-400 text-sm mb-2">
                Adicionar WhatsApp para {selectedRecipient}:
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={newWhatsAppNumber}
                  onChange={(e) => setNewWhatsAppNumber(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddWhatsApp}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  Adicionar WhatsApp
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Será formatado automaticamente para: {formatPhoneNumber(newWhatsAppNumber)}
              </p>
            </div>
          )}

          {messageType === 'email' && selectedRecipient && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Assunto do Email *</label>
              <div className="text-xs text-gray-400 mb-2">
                Será enviado como: "A {userCompany} deseja contatar a {startupData.startupName} - [seu assunto]"
              </div>
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

          {messageType === 'whatsapp' && selectedRecipientPhone && (
            <div className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
              📱 Será enviado para: <strong>{selectedRecipientPhone}</strong>
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

          <div className="flex gap-2">
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !selectedRecipient || isSending || (messageType === 'email' && (!emailSubject.trim() || !selectedRecipientEmail)) || (messageType === 'whatsapp' && !selectedRecipientPhone)}
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
          stage: data.stage || 'mapeada'
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

  const handleUpdateStartupField = async (field: keyof StartupInteractionData, value: string) => {
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
          updatedStartupData.email = value;
        } else if (field === 'website') {
          updatedStartupData.website = value;
        } else if (field === 'linkedin') {
          if (!updatedStartupData.socialLinks) {
            updatedStartupData.socialLinks = {};
          }
          updatedStartupData.socialLinks.linkedin = value;
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
    // Format phone number if it's the whatsapp field
    if (field === 'whatsapp' && value) {
      value = formatPhoneNumber(value);
    }
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
                      onBlur={(e) => handleFieldBlur('whatsapp', formatPhoneNumber(e.target.value))}
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
                  {startupData.whatsapp && (
                    <div className="text-xs text-gray-400 mt-1">
                      Formato: {formatPhoneNumber(startupData.whatsapp)}
                    </div>
                  )}
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
                        {founder.whatsapp && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPhoneNumber(founder.whatsapp)}
                          </div>
                        )}
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
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                <Plus size={16} />
                Nova Mensagem
              </button>
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
                        ) : (
                          <Phone size={16} className="text-green-400" />
                        )}
                        <span className="text-white font-medium">
                          {message.type === 'email' ? 'Email' : 'WhatsApp'}
                        </span>
                        {message.recipientName && (
                          <span className="text-gray-400 text-sm">
                            para {message.recipientName}
                          </span>
                        )}
                        {message.status === 'failed' && (
                          <span className="text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded">
                            Falha no envio
                          </span>
                        )}
                        {message.status === 'sent' && message.type === 'email' && (
                          <span className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded">
                            Enviado via Genoi.net
                          </span>
                        )}
                        {message.status === 'sent' && message.type === 'whatsapp' && (
                          <span className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded">
                            Enviado via WhatsApp
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
                    {message.recipientPhone && (
                      <div className="text-gray-400 text-sm mb-2">
                        📱 {message.recipientPhone}
                      </div>
                    )}
                    <p className="text-gray-300 whitespace-pre-wrap">{message.content}</p>
                    {message.whatsappResponse && (
                      <div className="text-xs text-gray-500 mt-2 bg-gray-700 p-2 rounded">
                        <strong>Resposta da API:</strong> {JSON.stringify(message.whatsappResponse, null, 2)}
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
    </div>
  );
};

export default StartupInteractionTimeline;