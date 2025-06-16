import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, Calendar, Building2, MapPin, Users, Briefcase, 
  ArrowLeft, Mail, Globe, Box, Linkedin, Facebook, 
  Twitter, Instagram, Trash2, FolderOpen
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
}

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

const SavedStartupCard = ({ 
  savedStartup, 
  onClick, 
  onRemove 
}: { 
  savedStartup: SavedStartupType; 
  onClick: () => void;
  onRemove: (id: string) => void;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
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

const SavedStartups = () => {
  const navigate = useNavigate();
  const [savedStartups, setSavedStartups] = useState<SavedStartupType[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<StartupType | null>(null);
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
          where('userId', '==', auth.currentUser.uid),
          orderBy('selectedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const startups = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedStartupType[];
        
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando startups salvas...</div>
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
            Voltar para startups salvas
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
            <h2 className="text-lg font-medium">Startups Salvas</h2>
          </div>
          <span className="text-sm text-gray-400">{savedStartups.length} startup{savedStartups.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {savedStartups.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={64} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhuma startup salva</h3>
              <p className="text-gray-400 mb-6">
                Você ainda não salvou nenhuma startup. Explore as listas de startups e salve suas favoritas.
              </p>
              <button
                onClick={() => navigate('/startups')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explorar Startups
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {savedStartups.map((savedStartup) => (
                <SavedStartupCard
                  key={savedStartup.id}
                  savedStartup={savedStartup}
                  onClick={() => handleStartupClick(savedStartup.startupData)}
                  onRemove={handleRemoveStartup}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedStartups;