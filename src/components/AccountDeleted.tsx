import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const AccountDeleted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <img 
            src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" 
            alt="Genie Logo" 
            className="mx-auto h-24"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">Conta Apagada</h2>
          <p className="mt-2 text-gray-400">
            A conta associada ao email {email} foi apagada anteriormente.
            Para reativar sua conta, entre em contato com o administrador do sistema.
          </p>
        </div>

        <Link 
          to="/login"
          className="block w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/login';
          }}
        >
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
};

export default AccountDeleted;