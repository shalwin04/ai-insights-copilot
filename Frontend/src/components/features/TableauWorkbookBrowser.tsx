import { useState, useEffect } from "react";
import { useTableau } from "../../contexts/TableauContext";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  BookOpen,
  BarChart3,
  Search,
  Loader2,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import type { TableauView } from "../../contexts/TableauContext";

export function TableauWorkbookBrowser() {
  const {
    workbooks,
    selectedWorkbook,
    selectWorkbook,
    selectView,
    getWorkbookViews,
  } = useTableau();

  const [searchQuery, setSearchQuery] = useState("");
  const [views, setViews] = useState<TableauView[]>([]);
  const [loadingViews, setLoadingViews] = useState(false);

  // Load views when workbook is selected
  useEffect(() => {
    if (selectedWorkbook) {
      loadViews(selectedWorkbook.id);
    } else {
      setViews([]);
    }
  }, [selectedWorkbook]);

  const loadViews = async (workbookId: string) => {
    try {
      setLoadingViews(true);
      const fetchedViews = await getWorkbookViews(workbookId);
      setViews(fetchedViews);
    } catch (error) {
      console.error("Failed to load views:", error);
    } finally {
      setLoadingViews(false);
    }
  };

  const filteredWorkbooks = workbooks.filter(
    (wb) =>
      wb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wb.project?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWorkbookClick = (workbook: typeof workbooks[0]) => {
    selectWorkbook(workbook);
  };

  const handleViewClick = (view: TableauView) => {
    selectView(view);
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Workbooks Panel */}
      <Card className="p-4 flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Workbooks
            <Badge variant="secondary" className="ml-auto">
              {workbooks.length}
            </Badge>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredWorkbooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No workbooks found</p>
              </div>
            ) : (
              filteredWorkbooks.map((workbook) => (
                <button
                  key={workbook.id}
                  onClick={() => handleWorkbookClick(workbook)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedWorkbook?.id === workbook.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card hover:bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workbook.name}</p>
                      {workbook.project && (
                        <p className="text-sm text-muted-foreground truncate">
                          {workbook.project.name}
                        </p>
                      )}
                      {workbook.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {workbook.description}
                        </p>
                      )}
                    </div>
                    {selectedWorkbook?.id === workbook.id && (
                      <ChevronRight className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Views Panel */}
      <Card className="p-4 flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Views
            {views.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {views.length}
              </Badge>
            )}
          </h3>
          {selectedWorkbook && (
            <p className="text-sm text-muted-foreground">
              From: {selectedWorkbook.name}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1">
          {!selectedWorkbook ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a workbook to view its visualizations</p>
            </div>
          ) : loadingViews ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading views...</p>
            </div>
          ) : views.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No views found in this workbook</p>
            </div>
          ) : (
            <div className="space-y-2">
              {views.map((view) => (
                <Button
                  key={view.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => handleViewClick(view)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{view.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {view.contentUrl}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
