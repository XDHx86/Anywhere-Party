/**
 * Material Integration Component
 * Main integration component that connects all Material Design 3 components
 * Requirements: 25.5, 26.5, 27.5, 28.4
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MaterialThemeProvider } from '../theme';
import { ChatIntegration } from './chat/ChatIntegration';
import { OverlayIntegration } from './overlays/OverlayIntegration';
import { integrationService } from '../services/integration-service';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';

export interface MaterialIntegrationProps {
  children: React.ReactNode;
  roomId?: string;
  userId?: string;
  userName?: string;
  enableChat?: boolean;
  enableOverlays?: boolean;
  onIntegrationStatusChange?: (status: any) => void;
}

export interface IntegrationStatus {
  connected: boolean;
  chatConnected: boolean;
  overlaysConnected: boolean;
  videoDetected: boolean;
  lastSync: Date | null;
  errors: string[];
}

export const MaterialIntegration: React.FC<MaterialIntegrationProps> = ({
  children,
  roomId,
  userId,
  userName,
  enableChat = true,
  enableOverlays = true,
  onIntegrationStatusChange,
}) => {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    connected: false,
    chatConnected: false,
    overlaysConnected: false,
    videoDetected: false,
    lastSync: null,
    errors: [],
  });

  const responsive = useResponsiveDesign();

  // Initialize integration on mount
  useEffect(() => {
    const initializeIntegration = async () => {
      try {
        // Get initial integration status
        const status = integrationService.getIntegrationStatus();

        const newStatus: IntegrationStatus = {
          connected: status.config.backgroundScriptConnected,
          chatConnected: status.config.chatSystemConnected,
          overlaysConnected: status.config.overlaySystemActive,
          videoDetected: status.components.overlays.videoElementDetected,
          lastSync: new Date(),
          errors: [],
        };

        setIntegrationStatus(newStatus);
        onIntegrationStatusChange?.(newStatus);

        // Setup periodic status checks
        const statusInterval = setInterval(async () => {
          const currentStatus = integrationService.getIntegrationStatus();
          const updatedStatus: IntegrationStatus = {
            connected: currentStatus.config.backgroundScriptConnected,
            chatConnected: currentStatus.config.chatSystemConnected,
            overlaysConnected: currentStatus.config.overlaySystemActive,
            videoDetected: currentStatus.components.overlays.videoElementDetected,
            lastSync: new Date(),
            errors: [],
          };

          setIntegrationStatus(updatedStatus);
          onIntegrationStatusChange?.(updatedStatus);
        }, 5000); // Check every 5 seconds

        return () => clearInterval(statusInterval);
      } catch (error) {
        console.error('Failed to initialize integration:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setIntegrationStatus((prev) => ({
          ...prev,
          errors: [...prev.errors, errorMessage],
        }));
      }
    };

    initializeIntegration();
  }, [onIntegrationStatusChange]);

  // Handle integration errors
  const handleIntegrationError = useCallback((error: string, component: string) => {
    console.error(`Integration error in ${component}:`, error);
    setIntegrationStatus((prev) => ({
      ...prev,
      errors: [...prev.errors, `${component}: ${error}`],
    }));
  }, []);

  // Handle chat connection status
  const handleChatStatusChange = useCallback((connected: boolean) => {
    setIntegrationStatus((prev) => ({
      ...prev,
      chatConnected: connected,
      lastSync: new Date(),
    }));
  }, []);

  // Handle overlay connection status
  const handleOverlayStatusChange = useCallback((connected: boolean, videoDetected: boolean) => {
    setIntegrationStatus((prev) => ({
      ...prev,
      overlaysConnected: connected,
      videoDetected,
      lastSync: new Date(),
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      integrationService.disconnect().catch(console.error);
    };
  }, []);

  return (
    <MaterialThemeProvider>
      {children}

      {/* Chat Integration */}
      {enableChat && roomId && userId && (
        <ChatIntegration
          roomId={roomId}
          userId={userId}
          userName={userName}
          onMessageSend={(message) => {
            // Handle message send success
            handleChatStatusChange(true);
          }}
          onReactionAdd={(messageId, emoji) => {
            // Handle reaction add success
            handleChatStatusChange(true);
          }}
        />
      )}

      {/* Overlay Integration */}
      {enableOverlays && (
        <OverlayIntegration
          roomId={roomId}
          userId={userId}
          enabled={enableOverlays}
          onOverlayCreate={(overlay) => {
            // Handle overlay create success
            handleOverlayStatusChange(true, true);
          }}
          onOverlayRemove={(overlayId) => {
            // Handle overlay remove success
            handleOverlayStatusChange(true, integrationStatus.videoDetected);
          }}
        />
      )}

      {/* Integration Status Debug (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10000,
            maxWidth: '300px',
          }}
        >
          <div>Integration Status:</div>
          <div>Connected: {integrationStatus.connected ? '✓' : '✗'}</div>
          <div>Chat: {integrationStatus.chatConnected ? '✓' : '✗'}</div>
          <div>Overlays: {integrationStatus.overlaysConnected ? '✓' : '✗'}</div>
          <div>Video: {integrationStatus.videoDetected ? '✓' : '✗'}</div>
          {integrationStatus.errors.length > 0 && (
            <div style={{ color: '#ff6b6b', marginTop: '4px' }}>
              Errors: {integrationStatus.errors.length}
            </div>
          )}
        </div>
      )}
    </MaterialThemeProvider>
  );
};

export default MaterialIntegration;
