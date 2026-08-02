/**
 * OverlayDemo Component
 * Demo component for testing Material Design 3 overlay system
 */

import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Reaction } from './types';
import OverlayManager from './OverlayManager';
import { MaterialButton } from '../cards/MaterialButton';
import { MaterialCard } from '../cards/MaterialCard';
import { useMaterialTheme } from '../../theme/theme-provider';

const OverlayDemo: React.FC = () => {
  const { theme } = useMaterialTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Sample avatars
  const sampleAvatars: Avatar[] = [
    {
      id: 'avatar-1',
      userId: 'user-1',
      name: 'Alice Johnson',
      color: '#6200EE',
      position: { x: 0, y: 0 },
      isActive: true,
      isHost: true,
      isMuted: false,
      lastSeen: new Date(),
    },
    {
      id: 'avatar-2',
      userId: 'user-2',
      name: 'Bob Smith',
      color: '#03DAC6',
      position: { x: 0, y: 0 },
      isActive: true,
      isHost: false,
      isMuted: true,
      lastSeen: new Date(),
    },
    {
      id: 'avatar-3',
      userId: 'user-3',
      name: 'Carol Davis',
      avatarUrl: 'https://via.placeholder.com/64/FF5722/FFFFFF?text=CD',
      color: '#FF5722',
      position: { x: 0, y: 0 },
      isActive: true,
      isHost: false,
      isMuted: false,
      lastSeen: new Date(),
    },
    {
      id: 'avatar-4',
      userId: 'user-4',
      name: 'David Wilson',
      color: '#4CAF50',
      position: { x: 0, y: 0 },
      isActive: false,
      isHost: false,
      isMuted: false,
      lastSeen: new Date(Date.now() - 60000),
    },
  ];

  // Sample reactions
  const sampleEmojis = ['❤️', '😂', '😮', '😢', '👍', '👎', '🎉', '🔥'];

  // Add avatars
  const addAvatars = () => {
    setAvatars(sampleAvatars);
  };

  // Remove avatars
  const removeAvatars = () => {
    setAvatars([]);
  };

  // Add random reaction
  const addReaction = () => {
    const emoji = sampleEmojis[Math.floor(Math.random() * sampleEmojis.length)];
    const newReaction: Reaction = {
      id: `reaction-${Date.now()}`,
      emoji,
      userId: sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)].userId,
      timestamp: new Date(),
      videoTimestamp: Math.random() * 100,
      position: { x: 0, y: 0 }, // Will be calculated by OverlayManager
      duration: 3000,
      fadeOutDelay: 2000,
    };

    setReactions((prev) => [...prev, newReaction]);
  };

  // Clear reactions
  const clearReactions = () => {
    setReactions([]);
  };

  // Handle avatar click
  const handleAvatarClick = (userId: string) => {
    console.log('Avatar clicked:', userId);
    const avatar = avatars.find((a) => a.userId === userId);
    if (avatar) {
      alert(`Clicked on ${avatar.name}`);
    }
  };

  // Handle reaction complete
  const handleReactionComplete = (reactionId: string) => {
    console.log('Reaction completed:', reactionId);
  };

  // Auto-add reactions for demo
  useEffect(() => {
    if (avatars.length > 0) {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          // 30% chance every 2 seconds
          addReaction();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [avatars.length]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '400px',
    backgroundColor: theme.palette.grey[100],
    border: `2px dashed ${theme.palette.outline}`,
    borderRadius: theme.shape.borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  };

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <MaterialCard elevation="low" padding="lg">
          <h2
            style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              color: theme.palette.onSurface,
              fontSize: theme.typography.fontSize.headlineSmall,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            Material Design 3 Overlay System Demo
          </h2>

          {/* Controls */}
          <div style={controlsStyle}>
            <MaterialButton
              variant="filled"
              color="primary"
              onClick={addAvatars}
              disabled={avatars.length > 0}
            >
              Add Avatars
            </MaterialButton>

            <MaterialButton
              variant="outlined"
              color="primary"
              onClick={removeAvatars}
              disabled={avatars.length === 0}
            >
              Remove Avatars
            </MaterialButton>

            <MaterialButton
              variant="filled"
              color="secondary"
              onClick={addReaction}
              disabled={avatars.length === 0}
            >
              Add Reaction
            </MaterialButton>

            <MaterialButton
              variant="outlined"
              color="secondary"
              onClick={clearReactions}
              disabled={reactions.length === 0}
            >
              Clear Reactions
            </MaterialButton>
          </div>

          {/* Demo Container */}
          <div ref={containerRef} style={containerStyle}>
            {avatars.length === 0 && reactions.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: theme.palette.text.secondary,
                  fontSize: theme.typography.fontSize.bodyLarge,
                }}
              >
                Click "Add Avatars" to see the overlay system in action
              </div>
            )}

            {/* Overlay Manager */}
            <OverlayManager
              containerElement={containerRef.current || undefined}
              avatars={avatars}
              reactions={reactions}
              responsive={true}
              maxAvatars={12}
              maxReactions={20}
              onAvatarClick={handleAvatarClick}
              onReactionComplete={handleReactionComplete}
            />
          </div>

          {/* Status */}
          <div
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: theme.palette.surfaceVariant,
              borderRadius: theme.shape.borderRadius.sm,
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.palette.onSurfaceVariant,
            }}
          >
            <div>Active Avatars: {avatars.filter((a) => a.isActive).length}</div>
            <div>Active Reactions: {reactions.length}</div>
            <div>
              Container: {containerRef.current?.clientWidth || 0}x
              {containerRef.current?.clientHeight || 0}
            </div>
          </div>
        </MaterialCard>
      </div>
    </div>
  );
};

export default OverlayDemo;
