import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Map of plan IDs to their corresponding names and token amounts
const PLAN_CONFIG = {
  'h5g9f3d7c1b4n8m2k6l9p4q': { name: 'Mestre Jedi', tokens: 3000 },
  'j8k2m9n4p5q7r3s6t1v8w2x': { name: 'Jedi', tokens: 1000 },
  'w2x6y9z4a7b1c5d8e3f2g4h': { name: 'Mestre Yoda', tokens: 11000 }
};

const PlanSuccess = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handlePlanSuccess = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Validate plan ID
        const planConfig = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
        if (!planConfig) {
          setError('Plano inválido');
          setIsLoading(false);
          return;
        }

        // Add artificial delay for loading animation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const now = new Date();
        const expirationDate = new Date(now.setMonth(now.getMonth() + 1));
        const transactionId = crypto.randomUUID();

        // Update user's plan in users collection
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          plan: planConfig.name,
          updatedAt: now.toISOString()
        });

        // Update or create token usage record
        await setDoc(doc(db, 'tokenUsage', auth.currentUser.uid), {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          plan: planConfig.name,
          totalTokens: planConfig.tokens,
          usedTokens: 0,
          lastUpdated: now.toISOString(),
          expirationDate: expirationDate.toISOString()
        });

        // Record plan purchase in GDPR compliance
        await setDoc(doc(collection(db, 'gdprCompliance'), transactionId), {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          type: 'plan_purchase',
          plan: planConfig.name,
          tokens: planConfig.tokens,
          purchasedAt: now.toISOString(),
          transactionId
        });

        // Navigate to home
        navigate('/');
      } catch (error) {
        console.error('Error processing plan success:', error);
        setError('Erro ao processar plano');
        setIsLoading(false);
      }
    };

    handlePlanSuccess();
  }, [planId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="animate-spin mx-auto w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full" />
        <h2 className="text-2xl font-bold text-white">Processando seu plano</h2>
        <p className="text-gray-400">
          Aguarde enquanto configuramos seu novo plano...
        </p>
      </div>
    </div>
  );
};

export default PlanSuccess;