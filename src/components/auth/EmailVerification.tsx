import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const EmailVerification = () => {
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (user.emailVerified) {
        try {
          // Update user activation status
          await setDoc(doc(db, 'users', user.uid), {
            activated: true,
            activatedAt: new Date().toISOString(),
            email: user.email,
            uid: user.uid
          }, { merge: true });

          // Record email verification in gdprCompliance
          await setDoc(doc(db, 'gdprCompliance', 'emailVerified'), {
            uid: user.uid,
            email: user.email,
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
            type: 'email_verification',
            transactionId: crypto.randomUUID()
          });

          navigate('/');
        } catch (error) {
          console.error('Error updating user activation:', error);
          setError('Erro ao ativar conta. Por favor, tente novamente.');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (resendDisabled) return;

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setError('Email de verificação reenviado. Por favor, verifique sua caixa de entrada.');
        setResendDisabled(true);
        setCountdown(300);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      if (error instanceof Error && error.message.includes('too-many-requests')) {
        setError('Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.');
        setResendDisabled(true);
        setCountdown(300);
      } else {
        setError('Erro ao reenviar email. Por favor, tente novamente.');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <img 
            src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" 
            alt="Genie Logo" 
            className="mx-auto h-24"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">Verifique seu Email</h2>
          <p className="mt-2 text-gray-400">
            Por favor, verifique seu email para ativar sua conta. 
            Você receberá um link de verificação em breve.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar para o Login
          </button>

          <div className="text-center">
            <button
              onClick={handleResendEmail}
              disabled={resendDisabled}
              className="text-blue-400 hover:text-blue-300 text-lg"
            >
              {resendDisabled 
                ? `Aguarde ${formatTime(countdown)} para reenviar` 
                : 'Reenviar email de verificação'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;