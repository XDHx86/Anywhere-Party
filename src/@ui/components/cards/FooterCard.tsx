/**
 * Footer Card Component
 * Connection status and compact action buttons
 * Requirements: 25.2, 25.3
 */

import React, { useState } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialCard } from './MaterialCard';
import { MaterialIcon } from './MaterialIcon';
import { useMaterialTheme } from '../../theme';
import { browserAPI } from '../../utils/browser-api';

// Types
export interface FooterCardProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  roomInfo: {
    id: string | null;
    name: string | null;
    role: 'host' | 'co-host' | 'participant' | null;
    participantCount: number;
    isActive: boolean;
  };
  onNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }) => void;
  className?: string;
  'data-testid'?: string;
}

// Styled components
const FooterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  minHeight: '48px',
}));

const StatusSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flex: 1,
}));

const ActionsSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const StatusIndicator = styled(Box)<{ status: string }>(({ theme, status }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor:
    status === 'connected'
      ? theme.palette.success.main
      : status === 'connecting'
        ? theme.palette.warning.main
        : status === 'error'
          ? theme.palette.error.main
          : theme.palette.grey[400],
  animation: status === 'connecting' ? 'pulse 2s infinite' : 'none',
  boxShadow: status === 'connected' ? `0 0 0 2px ${theme.palette.success.main}20` : 'none',

  '@keyframes pulse': {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.7, transform: 'scale(1.1)' },
  },
}));

const CompactButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.75),
  borderRadius: '8px',
  transition: theme.transitions.create(['background-color', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.05)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

// Footer Card Component
export const FooterCard: React.FC<FooterCardProps> = ({
  connectionStatus,
  roomInfo,
  onNotification,
  className,
  'data-testid': testId,
}) => {
  useMaterialTheme();
  const [isMuted, setIsMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return roomInfo.id ? `Room: ${roomInfo.id.slice(0, 8)}...` : 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleChatToggle = async () => {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'TOGGLE_CHAT',
        isOpen: !isChatOpen,
        timestamp: Date.now(),
      })) as { success: boolean; error?: string };

      if (response.success) {
        setIsChatOpen(!isChatOpen);
        onNotification({
          type: 'success',
          message: `Chat ${!isChatOpen ? 'opened' : 'closed'}`,
        });
      } else {
        throw new Error(response.error || 'Failed to toggle chat');
      }
    } catch (error) {
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to toggle chat',
      });
    }
  };

  const handleMuteToggle = async () => {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'TOGGLE_MUTE',
        isMuted: !isMuted,
        timestamp: Date.now(),
      })) as { success: boolean; error?: string };

      if (response.success) {
        setIsMuted(!isMuted);
        onNotification({
          type: 'success',
          message: `Microphone ${!isMuted ? 'muted' : 'unmuted'}`,
        });
      } else {
        throw new Error(response.error || 'Failed to toggle mute');
      }
    } catch (error) {
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to toggle mute',
      });
    }
  };

  const handleSettingsOpen = () => {
    browserAPI.runtime.openOptionsPage();
  };

  const handleCopyRoomId = async () => {
    if (!roomInfo.id) return;

    try {
      await navigator.clipboard.writeText(roomInfo.id);
      onNotification({
        type: 'success',
        message: 'Room ID copied to clipboard',
      });
    } catch {
      onNotification({
        type: 'error',
        message: 'Failed to copy room ID',
      });
    }
  };

  return (
    <MaterialCard
      elevation="none"
      variant="filled"
      padding="md"
      className={className}
      data-testid={testId}
    >
      <FooterContainer>
        <StatusSection>
          <StatusIndicator status={connectionStatus} />
          <Chip
            label={getStatusText()}
            size="small"
            color={getStatusColor()}
            variant="outlined"
            onClick={roomInfo.id ? handleCopyRoomId : undefined}
            sx={{
              cursor: roomInfo.id ? 'pointer' : 'default',
              fontSize: '0.75rem',
              height: '24px',
            }}
          />

          {roomInfo.participantCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {roomInfo.participantCount} participant{roomInfo.participantCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </StatusSection>

        <ActionsSection>
          <Tooltip title={isChatOpen ? 'Close Chat' : 'Open Chat'}>
            <CompactButton
              onClick={handleChatToggle}
              disabled={connectionStatus !== 'connected' || !roomInfo.isActive}
              data-testid="chat-toggle-button"
            >
              <MaterialIcon
                name={isChatOpen ? 'message-square-off' : 'message-square'}
                size="small"
                color={isChatOpen ? 'primary' : 'inherit'}
              />
            </CompactButton>
          </Tooltip>

          <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
            <CompactButton
              onClick={handleMuteToggle}
              disabled={connectionStatus !== 'connected' || !roomInfo.isActive}
              data-testid="mute-toggle-button"
            >
              <MaterialIcon
                name={isMuted ? 'mic-off' : 'mic'}
                size="small"
                color={isMuted ? 'error' : 'inherit'}
              />
            </CompactButton>
          </Tooltip>

          <Tooltip title="Open Settings">
            <CompactButton onClick={handleSettingsOpen} data-testid="settings-button">
              <MaterialIcon name="settings" size="small" />
            </CompactButton>
          </Tooltip>
        </ActionsSection>
      </FooterContainer>
    </MaterialCard>
  );
};

export default FooterCard;
