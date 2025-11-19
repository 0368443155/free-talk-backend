"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Reaction {
  id: string;
  emoji: string;
  participantName: string;
  timestamp: number;
  x: number; // Position percentage (0-100)
  y: number; // Position percentage (0-100)
}

interface ReactionOverlayProps {
  onReactionReceived?: (reaction: Reaction) => void;
}

/**
 * UC-07: Flying emoji reaction overlay
 * Displays animated emoji reactions that fly across the screen
 */
export function ReactionOverlay({ onReactionReceived }: ReactionOverlayProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Add a new reaction to the overlay
  const addReaction = useCallback((emoji: string, participantName: string) => {
    const reaction: Reaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      participantName,
      timestamp: Date.now(),
      x: Math.random() * 80 + 10, // 10-90% to avoid edges
      y: Math.random() * 60 + 20, // 20-80% for main area
    };

    setReactions(prev => [...prev, reaction]);

    // Remove reaction after animation completes
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);

    onReactionReceived?.(reaction);
  }, [onReactionReceived]);

  // Clean up old reactions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setReactions(prev => prev.filter(r => now - r.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Expose addReaction method to parent via ref
  React.useImperativeHandle(onReactionReceived, () => ({
    addReaction,
  }), [addReaction]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((reaction) => (
        <ReactionEmoji key={reaction.id} reaction={reaction} />
      ))}
    </div>
  );
}

interface ReactionEmojiProps {
  reaction: Reaction;
}

function ReactionEmoji({ reaction }: ReactionEmojiProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const style: React.CSSProperties = {
    left: `${reaction.x}%`,
    top: `${reaction.y}%`,
    transform: isVisible 
      ? 'translateY(-100px) translateX(20px) scale(1.2)' 
      : 'translateY(0) translateX(0) scale(1)',
    opacity: isVisible ? 0 : 1,
    transition: 'all 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fontSize: '2rem',
    position: 'absolute',
    zIndex: 50,
    pointerEvents: 'none',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  };

  return (
    <div style={style} className="select-none">
      <div className="flex flex-col items-center">
        <span className="text-4xl mb-1">{reaction.emoji}</span>
        <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded-full whitespace-nowrap">
          {reaction.participantName}
        </span>
      </div>
    </div>
  );
}

// Hook for using reactions
export function useReactions() {
  const [reactionOverlayRef, setReactionOverlayRef] = useState<{
    addReaction: (emoji: string, participantName: string) => void;
  } | null>(null);

  const addReaction = useCallback((emoji: string, participantName: string) => {
    reactionOverlayRef?.addReaction(emoji, participantName);
  }, [reactionOverlayRef]);

  const ReactionComponent = useCallback((props: ReactionOverlayProps) => (
    <ReactionOverlay 
      {...props}
      onReactionReceived={setReactionOverlayRef as any}
    />
  ), []);

  return {
    addReaction,
    ReactionOverlay: ReactionComponent,
  };
}