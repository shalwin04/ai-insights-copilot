import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authApi, ingestionApi, API_ORIGIN } from "../lib/api";

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
      console.error("Error checking authentication:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoIngestion = async () => {
    try {
      setIsIngesting(true);
      setIngestionStatus("Starting data ingestion...");

      console.log("📥 Calling auto-ingest API...");
      const response = await ingestionApi.autoIngestDrive();

      console.log("✅ Ingestion started:", response.data);
      setIngestionStatus(`Processing ${response.data.jobCount} files...`);

      // Wait a bit then clear status
      setTimeout(() => {
        setIsIngesting(false);
        setIngestionStatus(null);
      }, 5000);
    } catch (error) {
      console.error("❌ Auto-ingestion failed:", error);
      setIngestionStatus(
        "Ingestion failed - you may need to trigger it manually"
      );
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
        "Google OAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for a postMessage from the popup (safer than polling popup.closed
      // which can be blocked by Cross-Origin-Opener-Policy). The backend callback
      // will postMessage({type: 'oauth', success: true}) to window.opener.
      const handleMessage = (e: MessageEvent) => {
        try {
          // Only accept messages from the backend API origin we trust
          if (e.origin !== API_ORIGIN) return;
          // narrow the data safely
          const data = e.data as unknown;
          if (
            typeof data === "object" &&
            data !== null &&
            "type" in (data as Record<string, unknown>)
          ) {
            const typed = data as { type?: string };
            if (typed.type === "oauth") {
              window.removeEventListener("message", handleMessage);
              try {
                popup?.close();
              } catch (err) {
                console.error("Error closing popup after oauth message:", err);
              }
              refreshAuth();
            }
          }
        } catch (err) {
          console.error("Error handling oauth message:", err);
        }
      };

      window.addEventListener("message", handleMessage);

      // Fallback: in case postMessage doesn't arrive, refresh auth after timeout
      void setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        try {
          popup?.close();
        } catch (err) {
          console.error("Error closing popup on fallback:", err);
        }
        refreshAuth();
      }, 30_000); // 30s

      // Clean up when refreshAuth completes (optional). We'll clear fallback when auth state updates via refreshAuth.
    } catch (error) {
      console.error("Error initiating login:", error);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error logging out:", error);
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
        triggerIngestion: triggerAutoIngestion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
