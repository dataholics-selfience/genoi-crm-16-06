import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, Calendar, Building2, MapPin, Users, Briefcase, 
  ArrowLeft, Mail, Globe, Box, Linkedin, Facebook, 
  Twitter, Instagram, Trash2, FolderOpen, ChevronRight,
  ChevronLeft, Plus, GripVertical
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StartupType, SocialLink } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StartupInteractionTimeline from './StartupInteractionTimeline';

interface SavedStartupType {
  id: string;
  userId: string;
  userEmail: string;
  challengeId: string;
  challengeTitle: string;
  startupName: string;
  startupData: StartupType;
  selectedAt: string;
  stage: string;
  updatedAt: string;
}

const PIPELINE_STAGES = [
  { id: 'mapeada', name: 'Mapeada', color: 'bg-yellow-200 text-yellow-800 border-yellow-300' },
  { id: 'selecionada', name: 'Selecionada', color: 'bg-blue-200 text-blue-800 border-blue-300' },
  { id: 'contatada', name: 'Contatada', color: 'bg-red-200 text-red-800 border-red-300' },
  { id: 'entrevistada', name: 'Entrevistada', color: 'bg-green-200 text-green-800 border-green-300' },
  { id: 'poc', name: 'POC', color: 'bg-orange-200 text-orange-800 border-orange-300' }
];

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center">
      <span className="text-3xl font-extrabold text-white">{rating}</span>
      <div className="text-sm text-gray-400 mt-1">Match Score</div>
      <div className="flex items-center gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const SocialLinks = ({ startup, className = "" }: { startup: StartupType; className?: string }) => {
  const links: SocialLink[] = [
    {
      type: 'website',
      url: startup.website,
      icon: Globe,
      label: 'Website'
    },
    {
      type: 'email',
      url: `mailto:${startup.email}`,
      icon: Mail,
      label: 'Email'
    },
    ...(startup.socialLinks?.linkedin ? [{
      type: 'linkedin',
      url: startup.socialLinks.linkedin,
      icon: Linkedin,
      label: 'LinkedIn'
    }] : []),
    ...(startup.socialLinks?.facebook ? [{
      type: 'facebook',
      url: startup.socialLinks.facebook,
      icon: Facebook,
      label: 'Facebook'
    }] : []),
    ...(startup.socialLinks?.twitter ? [{
      type: 'twitter',
      url: startup.socialLinks.twitter,
      icon: Twitter,
      label: 'Twitter'
    }] : []),
    ...(startup.socialLinks?.instagram ? [{
      type: 'instagram',
      url: startup.socialLinks.instagram,
      icon: Instagram,
      label: 'Instagram'
    }] : [])
  ].filter(link => link.url);

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <link.icon size={16} />
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
};

const DraggableStartupCard = ({ 
  startup, 
  onRemove,
  onClick
}: { 
  startup: SavedStartupType;
  onRemove: (id: string) => void;
  onClick: () => void;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRemoving) return;

    setIsRemoving(true);

    try {
      await deleteDoc(doc(db, 'selectedStartups', startup.id));
      onRemove(startup.id);
    } catch (error) {
      console.error('Error removing startup:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', startup.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className="bg-gray-700 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-600 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical size={16} className="text-gray-400 group-hover:text-gray-300" />
          <span className="text-white font-medium text-sm truncate">{startup.startupName}</span>
        </div>
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className={`p-1 rounded text-xs ${
            isRemoving
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
          }`}
        >
          {isRemoving ? '...' : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  );
};

const PipelineStage = ({ 
  stage, 
  startups, 
  onDrop, 
  onStartupClick,
  onRemoveStartup 
}: { 
  stage: typeof PIPELINE_STAGES[0];
  startups: SavedStartupType[];
  onDrop: (startupId: string, newStage: string) => void;
  onStartupClick: (startupId: string) => void;
  onRemoveStartup: (id: string) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const startupId = e.dataTransfer.getData('text/plain');
    if (startupId) {
      onDrop(startupId, stage.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-4 min-h-[300px] transition-all ${
        isDragOver 
          ? 'border-blue-400 bg-blue-900/20' 
          : 'border-gray-600 bg-gray-800/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg px-3 py-1 rounded-full border ${stage.color}`}>
          {stage.name}
        </h3>
        <span className="text-gray-400 text-sm">
          {startups.length} startup{startups.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {startups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Plus size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Arraste startups aqui</p>
          </div>
        ) : (
          startups.map((startup) => (
            <DraggableStartupCard
              key={startup.id}
              startup={startup}
              onRemove={onRemoveStartup}
              onClick={() => onStartupClick(startup.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const PipelineBoard = ({ 
  startups, 
  onStageChange, 
  onStartupClick,
  onRemoveStartup 
}: { 
  startups: SavedStartupType[];
  onStageChange: (startupId: string, newStage: string) => void;
  onStartupClick: (startupId: string) => void;
  onRemoveStartup: (id: string) => void;
}) => {
  const handleDrop = async (startupId: string, newStage: string) => {
    try {
      await updateDoc(doc(db, 'selectedStartups', startupId), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });
      onStageChange(startupId, newStage);
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {PIPELINE_STAGES.map((stage) => {
        const stageStartups = startups.filter(startup => startup.stage === stage.id);
        
        return (
          <PipelineStage
            key={stage.id}
            stage={stage}
            startups={stageStartups}
            onDrop={handleDrop}
            onStartupClick={onStartupClick}
            onRemoveStartup={onRemoveStartup}
          />
        );
      })}
    </div>
  );
};

const StartupDetailCard = ({ startup }: { startup: StartupType }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">{startup.name}</h2>
          <SocialLinks startup={startup} />
        </div>
        <StarRating rating={startup.rating} />
      </div>
      <p className="text-gray-400 mb-6">{startup.description}</p>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="text-blue-400" size={16} />
          <span className="text-gray-400">Fundação:</span>
          {startup.foundedYear}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Building2 className="text-purple-400" size={16} />
          <span className="text-gray-400">Categoria:</span>
          {startup.category}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Box className="text-pink-400" size={16} />
          <span className="text-gray-400">Vertical:</span>
          {startup.vertical}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <MapPin className="text-emerald-400" size={16} />
          <span className="text-gray-400">Localização:</span>
          {startup.city}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Users className="text-blue-400" size={16} />
          <span className="text-gray-400">Tamanho da Equipe:</span>
          {startup.teamSize}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Briefcase className="text-purple-400" size={16} />
          <span className="text-gray-400">Modelo de Negócio:</span>
          {startup.businessModel}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Globe className="text-pink-400" size={16} />
          <span className="text-gray-400">Status IPO:</span>
          {startup.ipoStatus}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400">{startup.reasonForChoice}</p>
        </div>
      </div>
    </div>
  );
};

const SavedStartups = () => {
  const navigate = useNavigate();
  const [savedStartups, setSavedStartups] = useState<SavedStartupType[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupType | null>(null);
  const [selectedStartupId, setSelectedStartupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedStartups = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        const q = query(
          collection(db, 'selectedStartups'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const startups = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedStartupType[];
        
        // Sort in memory by updatedAt descending
        startups.sort((a, b) => new Date(b.updatedAt || b.selectedAt).getTime() - new Date(a.updatedAt || a.selectedAt).getTime());
        
        setSavedStartups(startups);
      } catch (error) {
        console.error('Error fetching saved startups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedStartups();
  }, [navigate]);

  const handleStartupClick = (startup: StartupType) => {
    setSelectedStartup(startup);
  };

  const handleStartupInteractionClick = (startupId: string) => {
    setSelectedStartupId(startupId);
  };

  const handleBack = () => {
    if (selectedStartupId) {
      setSelectedStartupId(null);
    } else if (selectedStartup) {
      setSelectedStartup(null);
    } else {
      navigate(-1);
    }
  };

  const handleRemoveStartup = (removedId: string) => {
    setSavedStartups(prev => prev.filter(startup => startup.id !== removedId));
  };

  const handleStageChange = (startupId: string, newStage: string) => {
    setSavedStartups(prev => prev.map(startup => 
      startup.id === startupId 
        ? { ...startup, stage: newStage, updatedAt: new Date().toISOString() }
        : startup
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando pipeline...</div>
      </div>
    );
  }

  // Show interaction timeline
  if (selectedStartupId) {
    return (
      <StartupInteractionTimeline
        startupId={selectedStartupId}
        onBack={handleBack}
      />
    );
  }

  // Show startup detail card
  if (selectedStartup) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar para pipeline
          </button>

          <StartupDetailCard startup={selectedStartup} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-gray-300 hover:text-white focus:outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 ml-4">
            <FolderOpen size={20} className="text-gray-400" />
            <h2 className="text-lg font-medium">Pipeline CRM</h2>
          </div>
          <span className="text-sm text-gray-400">{savedStartups.length} startup{savedStartups.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {savedStartups.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={64} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Pipeline vazio</h3>
              <p className="text-gray-400 mb-6">
                Você ainda não tem startups no seu pipeline. Explore as listas de startups e adicione suas favoritas.
              </p>
              <button
                onClick={() => navigate('/startups')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explorar Startups
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Pipeline Overview</h3>
                <div className="grid grid-cols-5 gap-4 mb-6">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = savedStartups.filter(startup => startup.stage === stage.id).length;
                    return (
                      <div key={stage.id} className="text-center">
                        <div className={`rounded-lg p-4 border-2 ${stage.color}`}>
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-sm font-medium">{stage.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <PipelineBoard
                startups={savedStartups}
                onStageChange={handleStageChange}
                onStartupClick={handleStartupInteractionClick}
                onRemoveStartup={handleRemoveStartup}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedStartups;