/**
 * Overlay Integration Component
 * Connects Material Design 3 overlays with video detection and annotation systems
 * Requirements: 28.4
 */

import React, { useEffect, useState } from 'react';
import OverlayManager from './OverlayManager';
import { Avatar, Reaction } from './types';
import { integrationService } from '../../services/integration-service';
import { useMaterialTheme } from '../../theme';
import { useResponsiveDesign } from '../../hooks/useResponsiveDesign';

export interface OverlayData {
  id: string;
  type: 'avatar' | 'reaction' | 'annotation' | 'floating';
  position: {
    x: number;
    y: number;
  };
  content: unknown;
  userId?: string;
  timestamp?: Date;
  duration?: number;
  zIndex?: number;
}

export interface VideoElement {
  element: HTMLVideoElement;
  bounds: DOMRect;
  url: string;
  duration: number;
  currentTime: number;
}

export interface OverlayIntegrationProps {
  roomId?: string;
  userId?: string;
  enabled?: boolean;
  onOverlayCreate?: (overlay: OverlayData) => void;
  onOverlayRemove?: (overlayId: string) => void;
  className?: string;
}

export const OverlayIntegration: React.FC<OverlayIntegrationProps> = ({
  roomId,
  userId,
  enabled = true,
  onOverlayCreate,
  onOverlayRemove,
  className,
}) => {
  const [overlays, setOverlays] = useState<OverlayData[]>([]);
  const [videoElement, setVideoElement] = useState<VideoElement | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  useMaterialTheme();
  const responsive = useResponsiveDesign();

  // Connect to overlay system on mount
  useEffect(() => {
    const connectOverlays = async () => {
      if (!enabled) return;

      try {
        const connected = await integrationService.connectOverlayComponents();
        setIsConnected(connected);

        if (connected) {
          // Check video detection status
          const videoStatus = (await integrationService.sendMessage(
            'GET_VIDEO_DETECTION_STATUS'
          )) as
            | { success?: boolean; videoFound?: boolean; videoElement?: VideoElement | null }
            | undefined;
          if (videoStatus?.success) {
            if (videoStatus.videoElement) {
              setVideoElement(videoStatus.videoElement);
            }
          }

          // Load existing overlays for room
          if (roomId) {
            const overlaysResponse = (await integrationService.sendMessage('GET_ROOM_OVERLAYS', {
              roomId,
            })) as { success?: boolean; overlays?: OverlayData[] } | undefined;

            if (overlaysResponse?.success && overlaysResponse.overlays) {
              setOverlays(overlaysResponse.overlays);
            }
          }
        }
      } catch (error) {
        console.error('Failed to connect to overlay system:', error);
        setIsConnected(false);
      }
    };

    connectOverlays();
  }, [enabled, roomId]);

  // Setup message listeners for overlay updates
  useEffect(() => {
    const handleOverlayCreate = (raw: unknown) => {
      const message = raw as {
        roomId?: string;
        id: string;
        type: OverlayData['type'];
        position: OverlayData['position'];
        content: unknown;
        userId?: string;
        timestamp?: number;
        duration?: number;
        zIndex?: number;
      };
      if (message.roomId === roomId) {
        const overlay: OverlayData = {
          id: message.id,
          type: message.type,
          position: message.position,
          content: message.content,
          userId: message.userId,
          timestamp: new Date(message.timestamp ?? Date.now()),
          duration: message.duration,
          zIndex: message.zIndex,
        };

        setOverlays((prev) => [...prev, overlay]);
        onOverlayCreate?.(overlay);
      }
    };

    const handleOverlayRemove = (raw: unknown) => {
      const message = raw as { roomId?: string; overlayId: string };
      if (message.roomId === roomId) {
        setOverlays((prev) => prev.filter((overlay) => overlay.id !== message.overlayId));
        onOverlayRemove?.(message.overlayId);
      }
    };

    const handleVideoDetection = (raw: unknown) => {
      const message = raw as { videoFound?: boolean; videoElement?: VideoElement | null };
      // Video-detected state is derived from `videoElement` being non-null,
      // so only the element itself needs to be tracked.
      if (message.videoElement) {
        setVideoElement(message.videoElement);
      } else {
        setVideoElement(null);
      }
    };

    const handleAnnotationUpdate = (raw: unknown) => {
      const message = raw as { roomId?: string; annotationId: string; content: unknown };
      if (message.roomId === roomId) {
        // Update annotation overlays
        setOverlays((prev) =>
          prev.map((overlay) =>
            overlay.type === 'annotation' && overlay.id === message.annotationId
              ? { ...overlay, content: message.content }
              : overlay
          )
        );
      }
    };

    // Register message handlers
    integrationService.registerMessageHandler('OVERLAY_CREATE', handleOverlayCreate);
    integrationService.registerMessageHandler('OVERLAY_REMOVE', handleOverlayRemove);
    integrationService.registerMessageHandler('VIDEO_DETECTION_UPDATE', handleVideoDetection);
    integrationService.registerMessageHandler('ANNOTATION_UPDATE', handleAnnotationUpdate);

    return () => {
      integrationService.unregisterMessageHandler('OVERLAY_CREATE');
      integrationService.unregisterMessageHandler('OVERLAY_REMOVE');
      integrationService.unregisterMessageHandler('VIDEO_DETECTION_UPDATE');
      integrationService.unregisterMessageHandler('ANNOTATION_UPDATE');
    };
  }, [roomId, onOverlayCreate, onOverlayRemove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomId && userId) {
        integrationService
          .sendMessage('OVERLAY_DISCONNECT', {
            roomId,
            userId,
          })
          .catch(console.error);
      }
    };
  }, [roomId, userId]);

  if (!enabled || !isConnected) {
    return null;
  }

  return (
    <OverlayManager
      avatars={overlays.filter((o) => o.type === 'avatar').map((o) => o.content as Avatar)}
      reactions={overlays.filter((o) => o.type === 'reaction').map((o) => o.content as Reaction)}
      videoElement={videoElement?.element || undefined}
      responsive={responsive.isMobile}
      className={className}
    />
  );
};

export default OverlayIntegration;
