import { useState, useEffect } from 'react';
import { Plus, X, FolderClosed, FolderOpen, Rocket, BarChart3 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import UserProfile from './UserProfile';
import { ChallengeType, StartupListType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  challenges: ChallengeType[];
  currentChallengeId: string | null;
  onSelectChallenge: (challengeId: string) => void;
}

const Sidebar = ({ isOpen, toggleSidebar, challenges, currentChallengeId, onSelectChallenge }: SidebarProps) => {
  const navigate = useNavigate();
  const [challengeStartups, setChallengeStartups] = useState<Record<string, StartupListType[]>>({});
  const [savedStartupsCount, setSavedStartupsCount] = useState(0);

  useEffect(() => {
    const fetchStartupLists = async () => {
      const startupsByChallenge: Record<string, StartupListType[]> = {};
      for (const challenge of challenges) {
        const q = query(
          collection(db, 'startupLists'),
          where('challengeId', '==', challenge.id)
        );
        const querySnapshot = await getDocs(q);
        startupsByChallenge[challenge.id] = querySnapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as StartupListType)
        );
      }
      setChallengeStartups(startupsByChallenge);
    };

    fetchStartupLists();
  }, [challenges]);

  useEffect(() => {
    const fetchSavedStartupsCount = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, 'selectedStartups'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        setSavedStartupsCount(querySnapshot.size);
      } catch (error) {
        console.error('Error fetching saved startups count:', error);
      }
    };

    fetchSavedStartupsCount();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (date: string) => {
    const challengeDate = new Date(date);
    return format(challengeDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      />

      <div 
        className={`fixed inset-y-0 left-0 flex flex-col w-64 bg-[#1a1b2e] text-gray-300 z-30 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <img 
            src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" 
            alt="Genie Logo" 
            className="h-12"
          />
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white focus:outline-none bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar">
          <div className="p-3 space-y-2">
            <Link 
              to="/new-challenge"
              className="w-full flex items-center gap-2 text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={18} />
              <span>Novo desafio</span>
            </Link>

            <Link 
              to="/saved-startups"
              className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <BarChart3 size={18} />
              <span>Pipeline CRM</span>
              {savedStartupsCount > 0 && (
                <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {savedStartupsCount}
                </span>
              )}
            </Link>
          </div>

          <div className="px-3 mb-2">
            <h2 className="text-sm font-normal text-gray-400 mb-2">Desafios</h2>
          </div>

          <nav className="px-3">
            {challenges.map((challenge) => {
              const isActive = currentChallengeId === challenge.id;
              const startups = challengeStartups[challenge.id] || [];
              
              return (
                <div key={challenge.id} className="mb-2">
                  <button
                    onClick={() => onSelectChallenge(challenge.id)}
                    className={`w-full flex flex-col text-sm p-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 text-white'
                        : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <FolderOpen size={14} className="text-blue-400" />
                      ) : (
                        <FolderClosed size={14} className="text-gray-500" />
                      )}
                      <span className="truncate text-left flex-1">{challenge.title}</span>
                      {startups.length > 0 && (
                        <Rocket size={14} className="text-gray-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 pl-6 mt-1">
                      {formatDate(challenge.createdAt)}
                    </div>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <Link to="/profile">
              <UserProfile hideText={false} />
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;