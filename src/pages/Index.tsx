
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/AuthPage';
import SmartImageEditor from '@/components/SmartImageEditor';

const Index = () => {
  const { user } = useAuth();

  if (!user) {
    return <AuthPage />;
  }

  return <SmartImageEditor />;
};

export default Index;
