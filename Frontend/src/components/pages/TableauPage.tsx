import { useState } from "react";
import { useTableau } from "../../contexts/TableauContext";
import { TableauWorkbookBrowser } from "../features/TableauWorkbookBrowser";
import { TableauViz } from "../features/TableauViz";
import { TableauDataUpload } from "../features/TableauDataUpload";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { BarChart3, Sparkles, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export function TableauPage() {
  const { isAuthenticated, isLoading, error, selectedView, selectedWorkbook, connect } = useTableau();
  const [showViz, setShowViz] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Tableau Integration</h2>
          <p className="text-muted-foreground mb-6">
            Connect to Tableau Cloud to access your visualizations and dashboards.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            size="lg"
            onClick={connect}
            disabled={isLoading}
            className="w-full mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Connect to Tableau Cloud
              </>
            )}
          </Button>

          <Alert className="mb-4">
            <p className="text-sm">
              Uses secure server-side authentication to connect to your Tableau workspace.
            </p>
          </Alert>
          <Badge variant="outline" className="mt-4">
            Powered by Tableau Embedding API v3
          </Badge>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Tableau Visualizations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and interact with your Tableau dashboards
            </p>
          </div>
          {selectedView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(selectedWorkbook?.webpageUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Tableau
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        {!selectedView ? (
          <div className="h-full space-y-4">
            <div className="mb-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <p className="font-medium">AI-Powered Discovery</p>
                <p className="text-sm mt-1">
                  Select a workbook and view to explore, or upload CSV data from Tableau for custom analysis.
                </p>
              </Alert>
            </div>

            {/* Upload Component */}
            <TableauDataUpload />

            {/* Workbook Browser */}
            <TableauWorkbookBrowser />
          </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            {/* View Info Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedView.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {selectedWorkbook?.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViz(false)}
                  >
                    Change View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowViz(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Show Visualization
                  </Button>
                </div>
              </div>
            </Card>

            {/* Visualization */}
            {showViz && (
              <div className="flex-1 overflow-hidden">
                <TableauViz
                  src={`https://10ax.online.tableau.com/t/shalwinspace/views/${selectedView.contentUrl.replace('/sheets/', '/')}`}
                  height="calc(100vh - 280px)"
                  toolbar="bottom"
                  onFirstInteractive={() => console.log("Viz loaded")}
                />
              </div>
            )}

            {!showViz && (
              <div className="flex-1">
                <TableauWorkbookBrowser />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
