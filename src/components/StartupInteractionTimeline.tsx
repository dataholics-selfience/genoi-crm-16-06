import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Globe, Linkedin, Phone, User, Building2, 
  Calendar, Edit3, Save, X, Plus, Send, MessageSquare, 
  ExternalLink, Users
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
  linkedin: string;
  whatsapp: string;
}

interface InteractionMessage {
  id: string;
  startupId: string;
  userId: string;
  type: 'email' | 'whatsapp';
  content: string;
  sentAt: string;
  recipientName?: string;
}

interface StartupInteractionTimelineProps {
  startupId: string;
  onBack: () => void;
}

const StartupInteractionTimeline = ({ startupId, onBack }: StartupInteractionTimelineProps) => {
  const navigate = useNavigate();
  const [startupData, setStartupData] = useState<StartupInteractionData | null>(null);
  const [interactions, setInteractions] = useState<InteractionMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<StartupInteractionData>>({});
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [selectedRecipient, setSelectedRecipient] = useState('');
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
        setEditData(interactionData);

        // Fetch interactions
        const interactionsQuery = query(
          collection(db, 'startupInteractions'),
          where('startupId', '==', startupId),
          where('userId', '==', auth.currentUser.uid),
          orderBy('sentAt', 'desc')
        );

        const interactionsSnapshot = await getDocs(interactionsQuery);
        const interactionsList = interactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InteractionMessage[];

        setInteractions(interactionsList);
      } catch (error) {
        console.error('Error fetching startup data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStartupData();
  }, [startupId]);

  const handleSaveEdit = async () => {
    if (!auth.currentUser || !startupData) return;

    try {
      // Update the selectedStartups document with new data
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        founders: editData.founders || [],
        updatedAt: new Date().toISOString()
      });

      setStartupData({ ...startupData, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating startup data:', error);
    }
  };

  const handleAddFounder = () => {
    const newFounder: FounderData = {
      id: crypto.randomUUID(),
      name: '',
      linkedin: '',
      whatsapp: ''
    };

    setEditData(prev => ({
      ...prev,
      founders: [...(prev.founders || []), newFounder]
    }));
  };

  const handleUpdateFounder = (founderId: string, field: keyof FounderData, value: string) => {
    setEditData(prev => ({
      ...prev,
      founders: (prev.founders || []).map(founder =>
        founder.id === founderId ? { ...founder, [field]: value } : founder
      )
    }));
  };

  const handleRemoveFounder = (founderId: string) => {
    setEditData(prev => ({
      ...prev,
      founders: (prev.founders || []).filter(founder => founder.id !== founderId)
    }));
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !startupData || !newMessage.trim()) return;

    setIsSending(true);

    try {
      const messageData: Omit<InteractionMessage, 'id'> = {
        startupId,
        userId: auth.currentUser.uid,
        type: messageType,
        content: newMessage.trim(),
        sentAt: new Date().toISOString(),
        recipientName: selectedRecipient || startupData.startupName
      };

      const docRef = await addDoc(collection(db, 'startupInteractions'), messageData);
      
      const newInteraction: InteractionMessage = {
        id: docRef.id,
        ...messageData
      };

      setInteractions(prev => [newInteraction, ...prev]);
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
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Startup Data */}
        <div className="w-1/2 p-6 border-r border-gray-700 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4">Informações da Startup</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Startup</label>
                  <input
                    type="text"
                    value={isEditing ? (editData.startupName || '') : startupData.startupName}
                    onChange={(e) => setEditData(prev => ({ ...prev, startupName: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={isEditing ? (editData.email || '') : startupData.email}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
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
                      value={isEditing ? (editData.website || '') : startupData.website}
                      onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
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
                      value={isEditing ? (editData.linkedin || '') : startupData.linkedin}
                      onChange={(e) => setEditData(prev => ({ ...prev, linkedin: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
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
                    value={isEditing ? (editData.description || '') : startupData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 resize-none"
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
                {isEditing && (
                  <button
                    onClick={handleAddFounder}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {(isEditing ? editData.founders : startupData.founders)?.map((founder) => (
                  <div key={founder.id} className="border border-gray-600 rounded-lg p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-white font-medium">Fundador</span>
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveFounder(founder.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Nome</label>
                        <input
                          type="text"
                          value={founder.name}
                          onChange={(e) => handleUpdateFounder(founder.id, 'name', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">LinkedIn</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={founder.linkedin}
                            onChange={(e) => handleUpdateFounder(founder.id, 'linkedin', e.target.value)}
                            disabled={!isEditing}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
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
                        <label className="block text-xs text-gray-400 mb-1">WhatsApp/Celular</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={founder.whatsapp}
                            onChange={(e) => handleUpdateFounder(founder.id, 'whatsapp', e.target.value)}
                            disabled={!isEditing}
                            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
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
                    </div>
                  </div>
                ))}

                {(!startupData.founders || startupData.founders.length === 0) && !isEditing && (
                  <div className="text-center py-4 text-gray-500">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum fundador cadastrado</p>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
                >
                  <Save size={16} />
                  Salvar Alterações
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(startupData);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
                >
                  Cancelar
                </button>
              </div>
            )}
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
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>

                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="">Destinatário</option>
                  <option value={startupData.startupName}>{startupData.startupName} (Geral)</option>
                  {startupData.founders?.map((founder) => (
                    <option key={founder.id} value={founder.name}>
                      {founder.name} (Fundador)
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
              />

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
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
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Timeline de Interações</h3>
            
            <div className="space-y-4">
              {interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma interação registrada</p>
                  <p className="text-sm">Envie sua primeira mensagem para começar</p>
                </div>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {interaction.type === 'email' ? (
                          <Mail size={16} className="text-blue-400" />
                        ) : (
                          <Phone size={16} className="text-green-400" />
                        )}
                        <span className="text-white font-medium">
                          {interaction.type === 'email' ? 'Email' : 'WhatsApp'}
                        </span>
                        {interaction.recipientName && (
                          <span className="text-gray-400 text-sm">
                            para {interaction.recipientName}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {format(new Date(interaction.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{interaction.content}</p>
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