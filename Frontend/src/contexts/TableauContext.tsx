import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { tableauApi } from "../lib/api";

export interface TableauWorkbook {
  id: string;
  name: string;
  description?: string;
  contentUrl: string;
  webpageUrl: string;
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TableauView {
  id: string;
  name: string;
  contentUrl: string;
  viewUrlName: string;
  workbookId?: string;
}

interface TableauContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  workbooks: TableauWorkbook[];
  selectedWorkbook: TableauWorkbook | null;
  selectedView: TableauView | null;
  connect: () => Promise<void>;
  authenticateWithJWT: (username: string, secretId: string) => Promise<void>;
  fetchWorkbooks: () => Promise<void>;
  selectWorkbook: (workbook: TableauWorkbook) => void;
  selectView: (view: TableauView) => void;
  getWorkbookViews: (workbookId: string) => Promise<TableauView[]>;
}

const TableauContext = createContext<TableauContextType | undefined>(
  undefined
);

export const TableauProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbooks, setWorkbooks] = useState<TableauWorkbook[]>([]);
  const [selectedWorkbook, setSelectedWorkbook] =
    useState<TableauWorkbook | null>(null);
  const [selectedView, setSelectedView] = useState<TableauView | null>(null);

  // Check Tableau authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await tableauApi.getAuthStatus();
      setIsAuthenticated(response.data.authenticated);

      if (response.data.authenticated) {
        // Auto-fetch workbooks if already authenticated
        await fetchWorkbooks();
      }
    } catch (error) {
      console.error("Error checking Tableau auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await tableauApi.connect();
      setIsAuthenticated(true);
      await fetchWorkbooks();
    } catch (error: any) {
      console.error("Tableau connection failed:", error);
      setError(error.response?.data?.error || "Failed to connect to Tableau");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithJWT = async (username: string, secretId: string) => {
    try {
      setIsLoading(true);
      await tableauApi.authenticateJWT(username, secretId);
      setIsAuthenticated(true);
      await fetchWorkbooks();
    } catch (error) {
      console.error("Tableau JWT authentication failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkbooks = async () => {
    try {
      const response = await tableauApi.getWorkbooks();
      setWorkbooks(response.data.workbooks || []);
    } catch (error) {
      console.error("Failed to fetch Tableau workbooks:", error);
      setWorkbooks([]);
    }
  };

  const selectWorkbook = (workbook: TableauWorkbook) => {
    setSelectedWorkbook(workbook);
    setSelectedView(null); // Reset selected view when workbook changes
  };

  const selectView = (view: TableauView) => {
    setSelectedView(view);
  };

  const getWorkbookViews = async (
    workbookId: string
  ): Promise<TableauView[]> => {
    try {
      const response = await tableauApi.getWorkbookViews(workbookId);
      return response.data.views || [];
    } catch (error) {
      console.error("Failed to fetch workbook views:", error);
      return [];
    }
  };

  return (
    <TableauContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        error,
        workbooks,
        selectedWorkbook,
        selectedView,
        connect,
        authenticateWithJWT,
        fetchWorkbooks,
        selectWorkbook,
        selectView,
        getWorkbookViews,
      }}
    >
      {children}
    </TableauContext.Provider>
  );
};

export const useTableau = () => {
  const context = useContext(TableauContext);
  if (!context) {
    throw new Error("useTableau must be used within a TableauProvider");
  }
  return context;
};
