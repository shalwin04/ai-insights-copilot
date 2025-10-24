import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, ingestionApi } from '../lib/api';

interface User {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isIngesting: boolean;
  ingestionStatus: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  triggerIngestion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<string | null>(null);

  const refreshAuth = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.data.authenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        // NOTE: Removed auto-ingestion - users now manually select files to index
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoIngestion = async () => {
    try {
      setIsIngesting(true);
      setIngestionStatus('Starting data ingestion...');

      console.log('📥 Calling auto-ingest API...');
      const response = await ingestionApi.autoIngestDrive();

      console.log('✅ Ingestion started:', response.data);
      setIngestionStatus(`Processing ${response.data.jobCount} files...`);

      // Wait a bit then clear status
      setTimeout(() => {
        setIsIngesting(false);
        setIngestionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('❌ Auto-ingestion failed:', error);
      setIngestionStatus('Ingestion failed - you may need to trigger it manually');
      setIsIngesting(false);

      // Clear error message after a delay
      setTimeout(() => {
        setIngestionStatus(null);
      }, 5000);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async () => {
    try {
      const response = await authApi.getAuthUrl();
      const authUrl = response.data.authUrl;

      // Open auth URL in a popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          refreshAuth();
        }
      }, 500);
    } catch (error) {
      console.error('Error initiating login:', error);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isIngesting,
        ingestionStatus,
        login,
        logout,
        refreshAuth,
        triggerIngestion: triggerAutoIngestion
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
