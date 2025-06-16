import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, Calendar, Building2, MapPin, Users, Briefcase, 
  ArrowLeft, Mail, Globe, Box, Linkedin, Facebook, 
  Twitter, Instagram, Trash2, FolderOpen, ChevronRight,
  ChevronLeft, Plus
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StartupType, SocialLink } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const StageSelector = ({ 
  currentStage, 
  onStageChange, 
  disabled = false 
}: { 
  currentStage: string; 
  onStageChange: (stage: string) => void;
  disabled?: boolean;
}) => {
  const currentIndex = PIPELINE_STAGES.findIndex(stage => stage.id === currentStage);
  
  const moveToNextStage = () => {
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      onStageChange(PIPELINE_STAGES[currentIndex + 1].id);
    }
  };

  const moveToPreviousStage = () => {
    if (currentIndex > 0) {
      onStageChange(PIPELINE_STAGES[currentIndex - 1].id);
    }
  };

  const currentStageData = PIPELINE_STAGES[currentIndex];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={moveToPreviousStage}
        disabled={disabled || currentIndex === 0}
        className={`p-1 rounded ${
          disabled || currentIndex === 0
            ? 'text-gray-500 cursor-not-allowed'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        <ChevronLeft size={16} />
      </button>
      
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${currentStageData.color}`}>
        {currentStageData.name}
      </span>
      
      <button
        onClick={moveToNextStage}
        disabled={disabled || currentIndex === PIPELINE_STAGES.length - 1}
        className={`p-1 rounded ${
          disabled || currentIndex === PIPELINE_STAGES.length - 1
            ? 'text-gray-500 cursor-not-allowed'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const SavedStartupCard = ({ 
  savedStartup, 
  onClick, 
  onRemove,
  onStageChange
}: { 
  savedStartup: SavedStartupType; 
  onClick: () => void;
  onRemove: (id: string) => void;
  onStageChange: (id: string, newStage: string) => void;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const startup = savedStartup.startupData;

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRemoving) return;

    setIsRemoving(true);

    try {
      await deleteDoc(doc(db, 'selectedStartups', savedStartup.id));
      onRemove(savedStartup.id);
    } catch (error) {
      console.error('Error removing startup:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (isUpdatingStage) return;

    setIsUpdatingStage(true);

    try {
      await updateDoc(doc(db, 'selectedStartups', savedStartup.id), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });
      onStageChange(savedStartup.id, newStage);
    } catch (error) {
      console.error('Error updating stage:', error);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const formattedDate = format(new Date(savedStartup.selectedAt), "dd/MM/yyyy", { locale: ptBR });

  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{startup.name}</h2>
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                isRemoving
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isRemoving ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Remover
                </>
              )}
            </button>
          </div>
          <div className="text-sm text-gray-400">
            <span className="text-blue-400">{savedStartup.challengeTitle}</span> • Salva em {formattedDate}
          </div>
          <SocialLinks startup={startup} />
        </div>
        <StarRating rating={startup.rating} />
      </div>
      
      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Estágio no Pipeline:</span>
        </div>
        <StageSelector
          currentStage={savedStartup.stage}
          onStageChange={handleStageChange}
          disabled={isUpdatingStage}
        />
      </div>

      <p className="text-gray-400 mb-6">{startup.description}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="text-blue-400" size={16} />
            {startup.foundedYear}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Building2 className="text-purple-400" size={16} />
            {startup.category}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Box className="text-pink-400" size={16} />
            {startup.vertical}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <MapPin className="text-emerald-400" size={16} />
            {startup.city}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="text-blue-400" size={16} />
            {startup.teamSize}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Briefcase className="text-purple-400" size={16} />
            {startup.businessModel}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Globe className="text-pink-400" size={16} />
            {startup.ipoStatus}
          </div>
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

const PipelineOverview = ({ startups }: { startups: SavedStartupType[] }) => {
  const stageStats = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: startups.filter(startup => startup.stage === stage.id).length
  }));

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8">
      <h3 className="text-xl font-bold text-white mb-4">Pipeline Overview</h3>
      <div className="grid grid-cols-5 gap-4">
        {stageStats.map((stage, index) => (
          <div key={stage.id} className="text-center">
            <div className={`rounded-lg p-4 border-2 ${stage.color}`}>
              <div className="text-2xl font-bold">{stage.count}</div>
              <div className="text-sm font-medium">{stage.name}</div>
            </div>
            {index < stageStats.length - 1 && (
              <div className="flex justify-center mt-2">
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SavedStartups = () => {
  const navigate = useNavigate();
  const [savedStartups, setSavedStartups] = useState<SavedStartupType[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('all');

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

  const handleBack = () => {
    if (selectedStartup) {
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

  const filteredStartups = selectedStage === 'all' 
    ? savedStartups 
    : savedStartups.filter(startup => startup.stage === selectedStage);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando pipeline...</div>
      </div>
    );
  }

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
              <PipelineOverview startups={savedStartups} />
              
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStage('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedStage === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Todas ({savedStartups.length})
                  </button>
                  {PIPELINE_STAGES.map(stage => {
                    const count = savedStartups.filter(startup => startup.stage === stage.id).length;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStage(stage.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                          selectedStage === stage.id
                            ? stage.color
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                        }`}
                      >
                        {stage.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredStartups.map((savedStartup) => (
                  <SavedStartupCard
                    key={savedStartup.id}
                    savedStartup={savedStartup}
                    onClick={() => handleStartupClick(savedStartup.startupData)}
                    onRemove={handleRemoveStartup}
                    onStageChange={handleStageChange}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedStartups;