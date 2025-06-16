import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Globe, Linkedin, Phone, User, Building2, 
  Calendar, Edit3, Save, X, Plus, Send, MessageSquare, 
  ExternalLink, Users, Briefcase
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
  website: string;
  linkedin: string;
  description: string;
  founders: FounderData[];
  startupData: StartupType;
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
}

interface StartupInteractionTimelineProps {
  startupId: string;
  onBack: () => void;
}

const StartupInteractionTimeline = ({ startupId, onBack }: StartupInteractionTimelineProps) => {
  const navigate = useNavigate();
  const [startupData, setStartupData] = useState<StartupInteractionData | null>(null);
  const [crmMessages, setCrmMessages] = useState<CRMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedRecipientType, setSelectedRecipientType] = useState<'startup' | 'founder'>('startup');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

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

        // Initialize startup interaction data
        const interactionData: StartupInteractionData = {
          id: startupId,
          startupName: startup.name,
          email: startup.email || '',
          website: startup.website || '',
          linkedin: startup.socialLinks?.linkedin || '',
          description: startup.description || '',
          founders: data.founders || [],
          startupData: startup
        };

        setStartupData(interactionData);

        // Fetch CRM messages
        const messagesQuery = query(
          collection(db, 'crmMessages'),
          where('startupId', '==', startupId),
          where('userId', '==', auth.currentUser.uid),
          orderBy('sentAt', 'desc')
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesList = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CRMMessage[];

        setCrmMessages(messagesList);
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

      // Update the selectedStartups document
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        [field]: value,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating startup field:', error);
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

  const handleRemoveFounder = async (founderId: string) => {
    if (!auth.currentUser || !startupData) return;

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

  const handleRecipientChange = (value: string) => {
    setSelectedRecipient(value);
    if (value === startupData?.startupName) {
      setSelectedRecipientType('startup');
    } else {
      setSelectedRecipientType('founder');
    }
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !startupData || !newMessage.trim() || !selectedRecipient) return;

    setIsSending(true);

    try {
      const messageData: Omit<CRMMessage, 'id'> = {
        startupId,
        userId: auth.currentUser.uid,
        type: messageType,
        content: newMessage.trim(),
        sentAt: new Date().toISOString(),
        recipientName: selectedRecipient,
        recipientType: selectedRecipientType
      };

      const docRef = await addDoc(collection(db, 'crmMessages'), messageData);
      
      const newCrmMessage: CRMMessage = {
        id: docRef.id,
        ...messageData
      };

      setCrmMessages(prev => [newCrmMessage, ...prev]);
      setNewMessage('');
      setSelectedRecipient('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
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
          <div className="flex items-center gap-2 flex-1 ml-4">
            <Building2 size={20} className="text-gray-400" />
            <h2 className="text-lg font-medium">{startupData.startupName}</h2>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Startup Data */}
        <div className="w-1/2 p-6 border-r border-gray-700 overflow-y-auto custom-scrollbar">
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
                    onChange={(e) => handleUpdateStartupField('startupName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={startupData.email}
                      onChange={(e) => handleUpdateStartupField('email', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {startupData.email && (
                      <a
                        href={`mailto:${startupData.email}`}
                        className="p-2 text-blue-400 hover:text-blue-300"
                      >
                        <Mail size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={startupData.website}
                      onChange={(e) => handleUpdateStartupField('website', e.target.value)}
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
                      onChange={(e) => handleUpdateStartupField('linkedin', e.target.value)}
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
                    onChange={(e) => handleUpdateStartupField('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
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
                        <label className="block text-xs text-gray-400 mb-1">Nome</label>
                        <input
                          type="text"
                          value={founder.name}
                          onChange={(e) => handleUpdateFounder(founder.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nome do fundador"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={founder.email}
                            onChange={(e) => handleUpdateFounder(founder.id, 'email', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="email@exemplo.com"
                          />
                          {founder.email && (
                            <a
                              href={`mailto:${founder.email}`}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Mail size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">WhatsApp</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={founder.whatsapp}
                            onChange={(e) => handleUpdateFounder(founder.id, 'whatsapp', e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="+55 11 99999-9999"
                          />
                          {founder.whatsapp && (
                            <a
                              href={`https://wa.me/${founder.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">LinkedIn</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={founder.linkedin}
                            onChange={(e) => handleUpdateFounder(founder.id, 'linkedin', e.target.value)}
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
                            onChange={(e) => handleUpdateFounder(founder.id, 'cargo', e.target.value)}
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

        {/* Right Panel - Interaction Timeline */}
        <div className="w-1/2 flex flex-col">
          {/* Message Input */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Nova Interação</h3>
            
            <div className="space-y-3">
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
                  <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
                  {startupData.founders?.map((founder) => (
                    <option key={founder.id} value={founder.name}>
                      {founder.name} {founder.cargo && `(${founder.cargo})`}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !selectedRecipient || isSending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {isSending ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-white mb-4">Timeline de Interações</h3>
            
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
                      </div>
                      <span className="text-gray-400 text-sm">
                        {format(new Date(message.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupInteractionTimeline;