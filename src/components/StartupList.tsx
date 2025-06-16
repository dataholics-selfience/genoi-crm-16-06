import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, Calendar, Building2, MapPin, Users, Briefcase, Award, 
  Target, Rocket, ArrowLeft, Mail, Globe, Box, Linkedin,
  Facebook, Twitter, Instagram, FolderOpen
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { StartupListType, StartupType, SocialLink } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const ProjectTimeline = ({ planning }: { planning: StartupListType['projectPlanning'] }) => {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-purple-500 before:to-pink-500">
      {planning.map((phase, index) => (
        <div key={index} className="relative flex items-start gap-6 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-blue-600 bg-gray-900 text-blue-600 font-bold">
            {index + 1}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm text-blue-400">{phase.duration}</span>
            <h3 className="text-xl font-bold text-white mb-2">{phase.phase}</h3>
            <p className="text-gray-400">{phase.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ResultsSection = ({ data }: { data: StartupListType }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Resultados Previstos</h3>
        <ul className="space-y-4">
          {data.expectedResults.map((result, index) => (
            <li key={index} className="flex items-start gap-3">
              <Target className="text-blue-400 mt-1" size={20} />
              <span className="text-gray-300">{result}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Vantagens Competitivas</h3>
        <ul className="space-y-4">
          {data.competitiveAdvantages.map((advantage, index) => (
            <li key={index} className="flex items-start gap-3">
              <Award className="text-purple-400 mt-1" size={20} />
              <span className="text-gray-300">{advantage}</span>
            </li>
          ))}
        </ul>
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

const StartupCard = ({ startup, onClick }: { startup: StartupType; onClick: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">{startup.name}</h2>
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

const StartupList = () => {
  const navigate = useNavigate();
  const [startupData, setStartupData] = useState<StartupListType | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<StartupType | null>(null);

  useEffect(() => {
    const fetchStartupData = async () => {
      try {
        const q = query(
          collection(db, 'startupLists'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setStartupData({ id: doc.id, ...doc.data() } as StartupListType);
        }
      } catch (error) {
        console.error('Error fetching startup data:', error);
      }
    };

    fetchStartupData();
  }, []);

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

  if (!startupData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  const formattedDate = startupData.createdAt 
    ? format(new Date(startupData.createdAt), "dd/MM/yyyy", { locale: ptBR })
    : '';

  if (selectedStartup) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar para lista
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
            <h2 className="text-lg font-medium">{startupData.challengeTitle}</h2>
          </div>
          <span className="text-sm text-gray-400">{formattedDate}</span>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {startupData.startups.map((startup, index) => (
              <StartupCard
                key={index}
                startup={startup}
                onClick={() => handleStartupClick(startup)}
              />
            ))}
          </div>

          <div className="space-y-16">
            <section>
              <h2 className="text-2xl font-bold text-white mb-8">Provas de conceito</h2>
              <ProjectTimeline planning={startupData.projectPlanning} />
            </section>

            <section>
              <ResultsSection data={startupData} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupList;