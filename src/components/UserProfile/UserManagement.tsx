import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  updateProfile, 
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  collection
} from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { auth, db } from '../../firebase';
import { UserType, TokenUsageType } from '../../types';
import TokenUsageChart from '../TokenUsageChart';

const UserManagement = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    company: '',
    email: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [showReauthDialog, setShowReauthDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          setError('Usuário não encontrado');
          return;
        }
        
        const data = userDoc.data() as UserType;
        setUserData(data);
        setFormData({
          name: data.name || '',
          cpf: data.cpf || '',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone || '',
        });

        const tokenDoc = await getDoc(doc(db, 'tokenUsage', auth.currentUser.uid));
        if (tokenDoc.exists()) {
          setTokenUsage(tokenDoc.data() as TokenUsageType);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erro ao carregar dados');
      }
    };

    fetchData();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        phone: formData.phone,
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(db, 'gdprCompliance', 'profileUpdate'), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        updatedAt: new Date().toISOString(),
        type: 'profile_update',
        transactionId: crypto.randomUUID()
      });

      setMessage('Perfil atualizado com sucesso!');
      setError('');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Erro ao atualizar perfil');
      setMessage('');
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!auth.currentUser?.email) {
        setError('Email não encontrado');
        return;
      }

      await sendPasswordResetEmail(auth, auth.currentUser.email);

      await setDoc(doc(db, 'gdprCompliance', 'passwordReset'), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        requestedAt: new Date().toISOString(),
        type: 'password_reset',
        transactionId: crypto.randomUUID()
      });

      setMessage('Email de redefinição de senha enviado!');
      setError('');
    } catch (err) {
      console.error('Error sending password reset:', err);
      setError('Erro ao enviar email de redefinição');
      setMessage('');
    }
  };

  const handleReauthenticate = async () => {
    if (!auth.currentUser?.email) {
      setError('Email não encontrado');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      setShowReauthDialog(false);
      await proceedWithAccountDeletion();
    } catch (err) {
      console.error('Error reauthenticating:', err);
      setError('Senha incorreta. Por favor, tente novamente.');
    }
  };

  const proceedWithAccountDeletion = async () => {
    if (!auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const userEmail = auth.currentUser.email;

      await setDoc(doc(db, 'gdprCompliance', 'accountDeletion'), {
        uid: userId,
        email: userEmail,
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
        type: 'account_deletion',
        transactionId: crypto.randomUUID()
      });

      await setDoc(doc(db, 'deletedUsers', userId), {
        uid: userId,
        email: userEmail,
        deletedAt: serverTimestamp(),
        name: userData?.name,
        company: userData?.company,
        plan: userData?.plan
      });

      await updateDoc(doc(db, 'users', userId), {
        disabled: true,
        disabledAt: serverTimestamp(),
        email: userEmail
      });

      await deleteUser(auth.currentUser);

      navigate('/account-deleted', { state: { email: userEmail } });
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err instanceof Error) {
        if (err.message.includes('requires-recent-login')) {
          setShowReauthDialog(true);
          return;
        }
        setError(`Erro ao deletar a conta: ${err.message}`);
      } else {
        setError('Erro ao deletar conta. Por favor, tente novamente.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETAR') {
      setError('Digite DELETAR para confirmar');
      return;
    }

    if (!auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    setIsDeleting(true);
    setError('');

    await proceedWithAccountDeletion();
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-300 hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">Perfil</h1>
        <Link
          to="/plans"
          className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          {userData?.plan || 'Padawan'} →
        </Link>
      </div>

      {tokenUsage && (
        <div className="mb-8">
          <TokenUsageChart
            totalTokens={tokenUsage.totalTokens}
            usedTokens={tokenUsage.usedTokens}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mb-12">
        {message && <div className="text-green-500 text-center bg-green-900/20 p-3 rounded-md">{message}</div>}
        {error && <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md">{error}</div>}

        <div className="space-y-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            disabled
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white opacity-50"
            placeholder="Nome completo"
          />
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            disabled
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white opacity-50"
            placeholder="CPF"
          />
          <input
            type="text"
            name="company"
            value={formData.company}
            disabled
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white opacity-50"
            placeholder="Empresa"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white opacity-50"
            placeholder="Email"
          />
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Celular"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Atualizar Perfil
          </button>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="flex-1 py-3 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Redefinir Senha
          </button>
        </div>
      </form>

      <div className="border-t border-red-800 pt-8">
        <h2 className="text-xl font-bold text-red-500 mb-4">Zona de Perigo</h2>
        {showReauthDialog ? (
          <div className="space-y-4">
            <p className="text-red-400">
              Por favor, insira sua senha para confirmar a deleção da conta:
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-red-700 rounded-md text-white"
              placeholder="Senha"
            />
            <div className="flex gap-4">
              <button
                onClick={handleReauthenticate}
                disabled={isDeleting}
                className={`flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowReauthDialog(false);
                  setPassword('');
                  setIsDeleting(false);
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : !showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-md text-white"
          >
            Apagar conta
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-red-400">
              Para confirmar a deleção da conta e anonimização dos dados, digite DELETAR no campo abaixo:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-red-700 rounded-md text-white"
              placeholder="Digite DELETAR"
            />
            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className={`flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? 'Deletando...' : 'Confirmar Deleção'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
