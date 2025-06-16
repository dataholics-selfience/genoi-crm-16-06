import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import { MessageType, ChallengeType } from '../types';

const welcomeMessages = [
  "Olá. Eu sou a Genie, sua agente de inovação aberta turbinada por IA! Crie agora um novo desafio e irei pesquisar em uma base de milhares de startups globais!",
  "Oi. Sou Genie, sua gênia IA do mundo da inovação! Vim aqui te conectar com milhares de startups. Descreva agora seu desafio!",
  "Bem-vindo! Sou a Genie, sua parceira em inovação. Vamos explorar juntos o universo das startups mais inovadoras do mundo?",
  "Olá! Como sua assistente de inovação, estou aqui para ajudar você a encontrar as melhores startups para seu desafio. Vamos começar?",
  "Oi! Sou Genie, sua guia no ecossistema global de startups. Pronta para transformar seu desafio em oportunidades!"
];

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [challenges, setChallenges] = useState<ChallengeType[]>([]);
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const challengesQuery = query(
      collection(db, 'challenges'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeChallenges = onSnapshot(challengesQuery, (snapshot) => {
      const newChallenges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChallengeType[];
      
      setChallenges(newChallenges);

      if (newChallenges.length === 0) {
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: randomMessage,
          timestamp: new Date().toISOString()
        }]);
      } else if (!currentChallengeId) {
        setCurrentChallengeId(newChallenges[0].id);
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching challenges:', error);
      setIsLoading(false);
    });

    return () => unsubscribeChallenges();
  }, [currentChallengeId]);

  useEffect(() => {
    if (!auth.currentUser || !currentChallengeId) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('challengeId', '==', currentChallengeId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageType[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentChallengeId]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const addMessage = async (message: Omit<MessageType, 'id' | 'timestamp'>) => {
    if (!auth.currentUser || !currentChallengeId) return;

    const newMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser.uid,
      challengeId: currentChallengeId
    };

    try {
      await addDoc(collection(db, 'messages'), newMessage);
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const selectChallenge = (challengeId: string) => {
    setCurrentChallengeId(challengeId);
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        challenges={challenges}
        currentChallengeId={currentChallengeId}
        onSelectChallenge={selectChallenge}
      />
      <ChatInterface 
        messages={messages} 
        addMessage={addMessage} 
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        currentChallenge={challenges.find(c => c.id === currentChallengeId)}
      />
    </div>
  );
};

export default Layout;