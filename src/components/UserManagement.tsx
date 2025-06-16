// ... previous imports remain the same
import TokenUsageChart from './TokenUsageChart';

const UserManagement = () => {
  // ... previous state declarations remain the same
  const [tokenUsage, setTokenUsage] = useState<TokenUsageType | null>(null);

  useEffect(() => {
    const fetchTokenUsage = async () => {
      if (!auth.currentUser) return;
      
      try {
        const tokenDoc = await getDoc(doc(db, 'tokenUsage', auth.currentUser.uid));
        if (tokenDoc.exists()) {
          setTokenUsage(tokenDoc.data() as TokenUsageType);
        }
      } catch (error) {
        console.error('Error fetching token usage:', error);
      }
    };

    fetchTokenUsage();
  }, []);

  // ... rest of the component implementation

  return (
    <div className="min-h-screen bg-black p-4 max-w-lg mx-auto">
      {/* ... previous JSX remains the same */}

      {tokenUsage && (
        <div className="mt-8">
          <TokenUsageChart
            totalTokens={tokenUsage.totalTokens}
            usedTokens={tokenUsage.usedTokens}
          />
        </div>
      )}

      {/* ... rest of the JSX remains the same */}
    </div>
  );
};

export default UserManagement;