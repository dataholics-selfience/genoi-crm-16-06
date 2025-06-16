import { useState, useEffect } from 'react';
import { Brain, Rocket, Search, Code, ListChecks, Target } from 'lucide-react';

const loadingStates = [
  {
    icon: Brain,
    text: 'Processando desafio e buscando entre milhares de startups...',
    color: 'text-blue-400'
  },
  {
    icon: ListChecks,
    text: 'Criando uma short list de startups qualificadas',
    color: 'text-purple-400'
  },
  {
    icon: Search,
    text: 'Realizando uma pesquisa de mercado e do desafio',
    color: 'text-green-400'
  },
  {
    icon: Target,
    text: 'Gerando um processo seletivo final de startups',
    color: 'text-yellow-400'
  },
  {
    icon: Code,
    text: 'Criando as POCs para solucionar o desafio',
    color: 'text-pink-400'
  },
  {
    icon: Rocket,
    text: 'Finalizando a lista de indicação de startups para seu desafio!',
    color: 'text-emerald-400'
  }
];

export const LoadingStates = () => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % loadingStates.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingStates[currentState].icon;

  return (
    <div className="flex items-center gap-4 bg-gray-800/50 p-6 rounded-lg transform transition-all duration-500 animate-fade-in">
      <CurrentIcon 
        className={`w-8 h-8 ${loadingStates[currentState].color} animate-pulse transform transition-all duration-500 scale-110`} 
      />
      <span className="text-lg text-gray-300 animate-fade-in transition-all duration-500">
        {loadingStates[currentState].text}
      </span>
    </div>
  );
};