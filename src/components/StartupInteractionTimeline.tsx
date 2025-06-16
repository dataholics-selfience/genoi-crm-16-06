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
  const [isSending, setIsSending] = useState(false);

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
        startupId: startupData.id,
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

      onMessageSent(newCrmMessage);
      setNewMessage('');
      setSelectedRecipient('');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
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
              <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
              {startupData.founders?.filter(founder => founder.name.trim()).map((founder) => (
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
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !selectedRecipient || isSending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {isSending ? 'Enviando...' : 'Enviar Mensagem'}
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

        // Fetch CRM messages
        const messagesQuery = query(
          collection(db, 'crmMessages'),
          where('startupId', '==', startupId),
          where('userId', '==', auth.currentUser.uid)
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesList = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CRMMessage[];

        // Sort messages by sentAt in JavaScript instead of Firestore
        const sortedMessages = messagesList.sort((a, b) => 
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        );

        setCrmMessages(sortedMessages);
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
        {/* Left Panel - Startup Data (35% width) */}
        <div className="w-[35%] p-6 border-r border-gray-700 overflow-y-auto custom-scrollbar">
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

        {/* Right Panel - Timeline (65% width) */}
        <div className="w-[65%] flex flex-col">
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