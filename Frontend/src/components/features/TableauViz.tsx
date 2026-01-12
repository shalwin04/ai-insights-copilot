import { useEffect, useRef, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { Loader2, Maximize2, Download, RefreshCw } from "lucide-react";
import { tableauApi } from "../../lib/api";

interface TableauVizProps {
  src: string;
  width?: string;
  height?: string;
  toolbar?: "top" | "bottom" | "hidden";
  hideTabs?: boolean;
  onFirstInteractive?: () => void;
}

export function TableauViz({
  src,
  width = "100%",
  height = "600px",
  toolbar = "bottom",
  hideTabs = false,
  onFirstInteractive,
}: TableauVizProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vizRef = useRef<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load Tableau Embedding API script
  useEffect(() => {
    if (!window.customElements.get("tableau-viz")) {
      const script = document.createElement("script");
      script.src =
        "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js";
      script.type = "module";
      document.head.appendChild(script);
    }
  }, []);

  // Fetch embedding token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log('🔐 Fetching Tableau embedding token...');
        const response = await tableauApi.getEmbeddingToken();
        console.log('✅ Token received:', response.data.token.substring(0, 50) + '...');
        setToken(response.data.token);
      } catch (err) {
        console.error("❌ Failed to fetch embedding token:", err);
        setError("Failed to load authentication token");
      }
    };
    fetchToken();
  }, []);

  // Create Tableau viz when token is available
  useEffect(() => {
    if (!containerRef.current || !token) {
      console.log('⏳ Waiting for container and token...', { hasContainer: !!containerRef.current, hasToken: !!token });
      return;
    }

    // Clear any existing viz
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    console.log('🎨 Creating Tableau viz with token...');
    const viz = document.createElement('tableau-viz');
    viz.setAttribute('src', src);
    viz.setAttribute('token', token);
    viz.setAttribute('width', width);
    viz.setAttribute('height', height);
    viz.setAttribute('toolbar', toolbar);
    if (hideTabs) {
      viz.setAttribute('hide-tabs', 'true');
    }

    viz.addEventListener('firstinteractive', () => {
      console.log('✅ Tableau viz loaded successfully');
      setIsLoading(false);
      setError(null);
      onFirstInteractive?.();
    });

    vizRef.current = viz;
    containerRef.current.appendChild(viz);

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [token, src, width, height, toolbar, hideTabs, onFirstInteractive]);

  const handleRefresh = () => {
    // Reload the viz by re-mounting
    setIsLoading(true);
    if (vizRef.current) {
      const parent = vizRef.current.parentElement;
      const newViz = vizRef.current.cloneNode(true) as HTMLElement;
      parent?.replaceChild(newViz, vizRef.current);
      vizRef.current = newViz;
    }
  };

  const handleDownloadPDF = () => {
    // Note: Download functionality requires additional API integration
    console.log("Download PDF functionality requires Tableau Server API");
  };

  const handleMaximize = () => {
    if (vizRef.current) {
      if (document.fullscreenEnabled) {
        vizRef.current.requestFullscreen();
      }
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Loading visualization...
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 p-2 border-b bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadPDF}
          title="Download as PDF"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMaximize}
          title="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-full" ref={containerRef} />
    </Card>
  );
}
