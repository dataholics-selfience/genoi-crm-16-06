import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateInputs = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Por favor, preencha todos os campos.');
      return false;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Por favor, insira um email válido.');
      return false;
    }
    if (trimmedPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Reset error state
      setError('');
      
      // Validate inputs before attempting login
      if (!validateInputs()) {
        return;
      }

      // Set loading state
      setIsLoading(true);

      // Trim values before storing them
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Attempt login with a small delay to prevent brute force attempts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Attempt login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      // Verify user exists
      const user = userCredential.user;
      if (!user) {
        throw new Error('No user data available');
      }

      // Check email verification
      if (!user.emailVerified) {
        await auth.signOut();
        setError('Por favor, verifique seu email antes de fazer login.');
        navigate('/verify-email');
        return;
      }

      // Clear any existing errors
      setError('');
      
      // Navigate on success
      navigate('/', { replace: true });
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase error codes with more detailed messages
      const errorMessages: { [key: string]: string } = {
        'auth/invalid-credential': 'Email ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.',
        'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
        'auth/too-many-requests': 'Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet e tente novamente.',
        'auth/invalid-email': 'O formato do email é inválido.',
        'auth/user-not-found': 'Não existe uma conta com este email.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/popup-closed-by-user': 'O processo de login foi interrompido. Por favor, tente novamente.',
        'auth/operation-not-allowed': 'Este método de login não está habilitado. Entre em contato com o suporte.',
        'auth/requires-recent-login': 'Por favor, faça login novamente para continuar.',
      };

      // Set appropriate error message with fallback
      setError(
        errorMessages[error.code] || 
        'Ocorreu um erro ao fazer login. Por favor, verifique suas credenciais e tente novamente.'
      );
      
    } finally {
      // Always reset loading state
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" 
            alt="Genie Logo" 
            className="mx-auto h-24"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'fallback-logo.png';
            }}
          />
          <h2 className="mt-6 text-3xl font-bold text-white">Login</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Senha"
                disabled={isLoading}
                minLength={6}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-400 hover:text-blue-500"
              tabIndex={isLoading ? -1 : 0}
            >
              Esqueceu a senha?
            </Link>
            <Link 
              to="/register" 
              className="text-lg text-blue-400 hover:text-blue-500 font-medium uppercase"
              tabIndex={isLoading ? -1 : 0}
            >
              CRIAR CONTA
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;