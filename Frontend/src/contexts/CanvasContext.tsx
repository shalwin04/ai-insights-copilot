import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InsightCard } from '@/types';
import type { Visualization } from './ChatContext';

interface CanvasContextType {
  pinnedCards: InsightCard[];
  addPinnedVisualization: (visualization: Visualization, messageId: string) => void;
  addExplorerVisualization: (visualization: any) => void;
  removePinnedCard: (id: string) => void;
  togglePinCard: (id: string) => void;
  clearPinnedCards: () => void;
}

const CANVAS_STORAGE_KEY = 'pinnedCanvasCards';

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [pinnedCards, setPinnedCards] = useState<InsightCard[]>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever pinnedCards changes
  useEffect(() => {
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(pinnedCards));
  }, [pinnedCards]);

  const addPinnedVisualization = useCallback((visualization: Visualization, messageId: string) => {
    const newCard: InsightCard = {
      id: `${messageId}-${Date.now()}`,
      type: 'chart',
      title: visualization.title,
      content: {
        chartType: visualization.type,
        data: visualization.data,
        description: visualization.description,
        xAxis: visualization.xAxis,
        yAxis: visualization.yAxis,
      },
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
      createdAt: new Date(),
      pinned: true,
    };

    setPinnedCards(prev => [...prev, newCard]);
  }, []);

  const addExplorerVisualization = useCallback((visualization: any) => {
    // Check if already pinned (by title and data)
    const alreadyPinned = pinnedCards.some((card) =>
      card.title === visualization.title &&
      JSON.stringify(card.content.data) === JSON.stringify(visualization.data)
    );

    if (alreadyPinned) {
      // Unpin
      setPinnedCards(prev => prev.filter(card =>
        !(card.title === visualization.title &&
          JSON.stringify(card.content.data) === JSON.stringify(visualization.data))
      ));
      return false; // Return false to indicate unpinned
    } else {
      // Pin new card
      const newCard: InsightCard = {
        id: `explorer-${Date.now()}`,
        type: 'chart',
        title: visualization.title,
        content: {
          chartType: visualization.type,
          data: visualization.data,
          description: visualization.description,
          xAxis: visualization.xAxis,
          yAxis: visualization.yAxis,
        },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        createdAt: new Date(),
        pinned: true,
      };

      setPinnedCards(prev => [...prev, newCard]);
      return true; // Return true to indicate pinned
    }
  }, [pinnedCards]);

  const removePinnedCard = useCallback((id: string) => {
    setPinnedCards(prev => prev.filter(card => card.id !== id));
  }, []);

  const togglePinCard = useCallback((id: string) => {
    setPinnedCards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, pinned: !card.pinned } : card
      )
    );
  }, []);

  const clearPinnedCards = useCallback(() => {
    setPinnedCards([]);
  }, []);

  const value: CanvasContextType = {
    pinnedCards,
    addPinnedVisualization,
    addExplorerVisualization,
    removePinnedCard,
    togglePinCard,
    clearPinnedCards,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
