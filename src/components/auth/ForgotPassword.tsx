import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if user account was deleted
      const q = query(
        collection(db, 'deletedUsers'),
        where('email', '==', email.toLowerCase().trim())
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Esta conta foi excluída conforme os termos da LGPD, GDPR e padrões internacionais de proteção de dados dos usuários.');
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage('Email de recuperação enviado. Verifique sua caixa de entrada.');
      setError('');
    } catch (error: any) {
      setError('Erro ao enviar email de recuperação. Verifique o endereço informado.');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" alt="Genie Logo" className="mx-auto h-24" />
          <h2 className="mt-6 text-3xl font-bold text-white">Recuperar Senha</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md">{error}</div>}
          {message && <div className="text-green-500 text-center bg-green-900/20 p-3 rounded-md">{message}</div>}
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Enviar email de recuperação
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm text-blue-400 hover:text-blue-500">
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;