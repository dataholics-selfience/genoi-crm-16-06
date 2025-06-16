import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Baby, Swords, SwordIcon, Sparkles, ArrowLeft, Shield, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';

const plans = [
  {
    id: 'padawan',
    name: 'Padawan',
    icon: Baby,
    description: 'Plano para iniciantes que estão começando no caminho da inovação',
    tokens: 100,
    price: 0,
    highlight: false,
    stripeLink: ''
  },
  {
    id: 'jedi',
    name: 'Jedi',
    icon: SwordIcon,
    description: 'Plano para o guerreiro que está aprendendo as artes da inovação por IA',
    tokens: 1000,
    price: 600,
    highlight: true,
    stripeLink: 'https://buy.stripe.com/9B6cN5dT9gDme7tdzdfYY0o'
  },
  {
    id: 'mestre-jedi',
    name: 'Mestre Jedi',
    icon: Swords,
    description: 'Plano para o Jedi que se superou, e agora pode derrotar as forças da inércia inovativa',
    tokens: 3000,
    price: 1800,
    highlight: false,
    stripeLink: 'https://buy.stripe.com/eVqeVd4iz0Eo0gDan1fYY0p'
  },
  {
    id: 'mestre-yoda',
    name: 'Mestre Yoda',
    icon: Sparkles,
    description: 'Plano para o inovador que enfrentou batalhas e está preparado para defender as forças da disrupção',
    tokens: 11000,
    price: 6000,
    highlight: false,
    stripeLink: 'https://buy.stripe.com/9B68wP5mD5YI5AXcv9fYY0q'
  }
];

const SecurityBadge = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-2 text-gray-300">
    <Icon size={20} className="text-green-500" />
    <span>{text}</span>
  </div>
);

const Plans = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrentPlan(userDoc.data().plan);
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
      }
    };

    fetchUserPlan();
  }, []);

  const handlePlanClick = async (plan: typeof plans[0]) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    if (plan.id === 'padawan') {
      setError('O plano Padawan é o plano inicial e não pode ser contratado. Por favor, escolha outro plano.');
      return;
    }

    try {
      // Record plan click in Firestore
      await setDoc(doc(collection(db, 'planClicks'), crypto.randomUUID()), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        planId: plan.id,
        clickedAt: new Date().toISOString(),
        transactionId: crypto.randomUUID()
      });

      // Open Stripe checkout in the same window
      window.location.href = plan.stripeLink;
    } catch (error) {
      console.error('Error recording plan click:', error);
      setError('Erro ao processar sua solicitação. Por favor, tente novamente.');
    }
  };

  const isPlanDisabled = (planName: string) => {
    if (!currentPlan) return false;
    return currentPlan.toLowerCase().replace(' ', '-') === planName;
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white mr-4"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-4">Escolha seu plano</h1>
            <p className="text-gray-400 text-lg">Desbloqueie o poder da inovação com nossos planos personalizados</p>
          </div>
          <div className="w-8" />
        </div>

        {error && (
          <div className="text-red-500 text-center mb-4 bg-red-900/20 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPadawan = plan.id === 'padawan';
            const isDisabled = isPlanDisabled(plan.id);
            
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-800 rounded-xl p-6 ${
                  plan.highlight ? 'ring-2 ring-blue-500 transform hover:scale-105' : 'hover:bg-gray-700'
                } transition-all duration-300`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                    Mais popular
                  </div>
                )}
                
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-blue-900 rounded-full">
                    <Icon size={32} className="text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-4">{plan.name}</h3>
                <p className="text-gray-400 text-center mb-6 h-24">{plan.description}</p>
                
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-white mb-2">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
                  </div>
                  <div className="text-blue-400">{plan.tokens} tokens</div>
                </div>

                <button
                  onClick={() => !isPadawan && !isDisabled && handlePlanClick(plan)}
                  disabled={isPadawan || isDisabled}
                  className={`block w-full py-3 px-4 rounded-lg text-white text-center font-bold transition-colors ${
                    isPadawan || isDisabled
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isPadawan ? 'Plano inicial' : isDisabled ? 'Plano atual' : 'Começar agora'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-6 rounded-xl">
            <SecurityBadge icon={Shield} text="Pagamento Seguro SSL" />
          </div>
          <div className="bg-gray-800 p-6 rounded-xl">
            <SecurityBadge icon={Lock} text="Certificado PCI DSS" />
          </div>
          <div className="bg-gray-800 p-6 rounded-xl">
            <SecurityBadge icon={Shield} text="Proteção Antifraude" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
