/**
 * Main Card Component
 * Room creation and joining controls using Material buttons
 * Requirements: 25.1, 25.2, 25.3
 */

import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialCard } from './MaterialCard';
import { MaterialButton } from './MaterialButton';
import { MaterialIcon } from './MaterialIcon';
import { useMaterialTheme } from '../../theme';
import { browserAPI } from '../../utils/browser-api';

// Types
export interface MainCardProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  currentView: 'main' | 'createRoom' | 'joinRoom' | 'roomView';
  roomInfo: {
    id: string | null;
    name: string | null;
    role: 'host' | 'co-host' | 'participant' | null;
    participantCount: number;
    isActive: boolean;
  };
  buttonStates: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  onViewChange: (view: 'main' | 'createRoom' | 'joinRoom' | 'roomView') => void;
  onButtonStateChange: (buttonId: string, state: 'idle' | 'loading' | 'success' | 'error') => void;
  onNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }) => void;
  onLoading: (operation: string, loading: boolean) => void;
  className?: string;
  'data-testid'?: string;
}

// Runtime message response shape (background script responses)
interface RuntimeResponse {
  success: boolean;
  error?: string;
  roomId?: string;
  [key: string]: unknown;
}

// Styled components
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const FormContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  justifyContent: 'flex-end',
  marginTop: theme.spacing(2),
}));

const RoomInfoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor:
    theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
}));

const RoomInfoItem = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const StatusIndicator = styled(Box)<{ status: string }>(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  borderRadius: '20px',
  fontSize: '0.875rem',
  fontWeight: 500,
  ...(status === 'connected' && {
    backgroundColor: theme.palette.success.main + '20',
    color: theme.palette.success.main,
  }),
  ...(status === 'connecting' && {
    backgroundColor: theme.palette.warning.main + '20',
    color: theme.palette.warning.main,
  }),
  ...(status === 'disconnected' && {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.secondary,
  }),
  ...(status === 'error' && {
    backgroundColor: theme.palette.error.main + '20',
    color: theme.palette.error.main,
  }),
}));

// Main Card Component
export const MainCard: React.FC<MainCardProps> = ({
  connectionStatus,
  currentView,
  roomInfo,
  buttonStates,
  onViewChange,
  onButtonStateChange,
  onNotification,
  onLoading,
  className,
  'data-testid': testId,
}) => {
  const { theme } = useMaterialTheme();

  // Form states
  const [createRoomForm, setCreateRoomForm] = useState({
    name: '',
    isPublic: false,
    password: '',
    maxParticipants: 10,
  });

  const [joinRoomForm, setJoinRoomForm] = useState({
    roomId: '',
    password: '',
  });

  // Handlers
  const handleCreateRoom = async () => {
    try {
      onButtonStateChange('createRoom', 'loading');
      onLoading('createRoom', true);

      // Send message to background script
      const response = (await browserAPI.runtime.sendMessage({
        type: 'CREATE_ROOM',
        data: createRoomForm,
        timestamp: Date.now(),
      })) as RuntimeResponse;

      if (response.success) {
        onButtonStateChange('createRoom', 'success');
        onNotification({
          type: 'success',
          message: `Room created successfully! ID: ${response.roomId}`,
        });
        onViewChange('roomView');
      } else {
        throw new Error(response.error || 'Failed to create room');
      }
    } catch (error) {
      onButtonStateChange('createRoom', 'error');
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create room',
      });
    } finally {
      onLoading('createRoom', false);
    }
  };

  const handleJoinRoom = async () => {
    try {
      onButtonStateChange('joinRoom', 'loading');
      onLoading('joinRoom', true);

      const response = (await browserAPI.runtime.sendMessage({
        type: 'JOIN_ROOM',
        data: joinRoomForm,
        timestamp: Date.now(),
      })) as RuntimeResponse;

      if (response.success) {
        onButtonStateChange('joinRoom', 'success');
        onNotification({
          type: 'success',
          message: `Joined room successfully!`,
        });
        onViewChange('roomView');
      } else {
        throw new Error(response.error || 'Failed to join room');
      }
    } catch (error) {
      onButtonStateChange('joinRoom', 'error');
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to join room',
      });
    } finally {
      onLoading('joinRoom', false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      onButtonStateChange('leaveRoom', 'loading');
      onLoading('leaveRoom', true);

      const response = (await browserAPI.runtime.sendMessage({
        type: 'LEAVE_ROOM',
        timestamp: Date.now(),
      })) as RuntimeResponse;

      if (response.success) {
        onButtonStateChange('leaveRoom', 'success');
        onNotification({
          type: 'success',
          message: 'Left room successfully',
        });
        onViewChange('main');
      } else {
        throw new Error(response.error || 'Failed to leave room');
      }
    } catch (error) {
      onButtonStateChange('leaveRoom', 'error');
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to leave room',
      });
    } finally {
      onLoading('leaveRoom', false);
    }
  };

  const handleOpenSettings = () => {
    browserAPI.runtime.openOptionsPage();
  };

  const handleStartRoom = async () => {
    try {
      onButtonStateChange('startRoom', 'loading');
      onLoading('startRoom', true);

      const response = (await browserAPI.runtime.sendMessage({
        type: 'START_ROOM',
        timestamp: Date.now(),
      })) as RuntimeResponse;

      if (response.success) {
        onButtonStateChange('startRoom', 'success');
        onNotification({
          type: 'success',
          message: 'Room started successfully! Video detection active.',
        });
      } else {
        throw new Error(response.error || 'Failed to start room');
      }
    } catch (error) {
      onButtonStateChange('startRoom', 'error');
      onNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to start room',
      });
    } finally {
      onLoading('startRoom', false);
    }
  };

  // Render different views
  const renderMainView = () => (
    <MainContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontWeight: 500,
            color: theme.palette.onSurface,
          }}
        >
          Room Actions
        </Typography>
        <StatusIndicator status={connectionStatus}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
          />
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
          {connectionStatus === 'error' && 'Error'}
        </StatusIndicator>
      </Box>

      <ActionButtonsContainer>
        <MaterialButton
          variant="filled"
          size="large"
          fullWidth
          startIcon={<MaterialIcon name="plus" size="small" />}
          onClick={() => onViewChange('createRoom')}
          disabled={connectionStatus !== 'connected'}
        >
          Create Room
        </MaterialButton>

        <MaterialButton
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<MaterialIcon name="users" size="small" />}
          onClick={() => onViewChange('joinRoom')}
          disabled={connectionStatus !== 'connected'}
        >
          Join Room
        </MaterialButton>

        <MaterialButton
          variant="text"
          size="medium"
          fullWidth
          startIcon={<MaterialIcon name="settings" size="small" />}
          onClick={handleOpenSettings}
        >
          Settings
        </MaterialButton>
      </ActionButtonsContainer>
    </MainContainer>
  );

  const renderCreateRoomView = () => (
    <FormContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <MaterialButton
          variant="text"
          size="small"
          startIcon={<MaterialIcon name="arrow-left" size="small" />}
          onClick={() => onViewChange('main')}
        >
          Back
        </MaterialButton>
        <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
          Create New Room
        </Typography>
      </Box>

      <TextField
        label="Room Name (optional)"
        value={createRoomForm.name}
        onChange={(e) => setCreateRoomForm((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="My Watch Party"
        fullWidth
        variant="outlined"
        size="small"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={createRoomForm.isPublic}
            onChange={(e) => setCreateRoomForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
          />
        }
        label="Make room public (discoverable)"
      />

      <TextField
        label="Password (optional)"
        type="password"
        value={createRoomForm.password}
        onChange={(e) => setCreateRoomForm((prev) => ({ ...prev, password: e.target.value }))}
        placeholder="Leave empty for no password"
        fullWidth
        variant="outlined"
        size="small"
      />

      <TextField
        label="Max Participants"
        type="number"
        value={createRoomForm.maxParticipants}
        onChange={(e) =>
          setCreateRoomForm((prev) => ({
            ...prev,
            maxParticipants: parseInt(e.target.value) || 10,
          }))
        }
        slotProps={{ htmlInput: { min: 2, max: 50 } }}
        fullWidth
        variant="outlined"
        size="small"
      />

      <FormActions>
        <MaterialButton variant="outlined" onClick={() => onViewChange('main')}>
          Cancel
        </MaterialButton>
        <MaterialButton
          variant="filled"
          onClick={handleCreateRoom}
          loading={buttonStates.createRoom === 'loading'}
        >
          Create Room
        </MaterialButton>
      </FormActions>
    </FormContainer>
  );

  const renderJoinRoomView = () => (
    <FormContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <MaterialButton
          variant="text"
          size="small"
          startIcon={<MaterialIcon name="arrow-left" size="small" />}
          onClick={() => onViewChange('main')}
        >
          Back
        </MaterialButton>
        <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
          Join Room
        </Typography>
      </Box>

      <TextField
        label="Room ID or Invitation Link"
        value={joinRoomForm.roomId}
        onChange={(e) => setJoinRoomForm((prev) => ({ ...prev, roomId: e.target.value }))}
        placeholder="Enter room ID or paste invitation link"
        fullWidth
        variant="outlined"
        size="small"
        required
      />

      <TextField
        label="Password (if required)"
        type="password"
        value={joinRoomForm.password}
        onChange={(e) => setJoinRoomForm((prev) => ({ ...prev, password: e.target.value }))}
        placeholder="Enter room password"
        fullWidth
        variant="outlined"
        size="small"
      />

      <FormActions>
        <MaterialButton variant="outlined" onClick={() => onViewChange('main')}>
          Cancel
        </MaterialButton>
        <MaterialButton
          variant="filled"
          onClick={handleJoinRoom}
          loading={buttonStates.joinRoom === 'loading'}
          disabled={!joinRoomForm.roomId.trim()}
        >
          Join Room
        </MaterialButton>
      </FormActions>
    </FormContainer>
  );

  const renderRoomView = () => (
    <MainContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          Room: {roomInfo.name || roomInfo.id}
        </Typography>
        <StatusIndicator status={roomInfo.isActive ? 'connected' : 'disconnected'}>
          {roomInfo.isActive ? 'Active' : 'Inactive'}
        </StatusIndicator>
      </Box>

      <RoomInfoContainer>
        <RoomInfoItem>
          <Typography variant="body2" color="text.secondary">
            Room ID
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {roomInfo.id}
          </Typography>
        </RoomInfoItem>
        <RoomInfoItem>
          <Typography variant="body2" color="text.secondary">
            Your Role
          </Typography>
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
            {roomInfo.role}
          </Typography>
        </RoomInfoItem>
        <RoomInfoItem>
          <Typography variant="body2" color="text.secondary">
            Participants
          </Typography>
          <Typography variant="body2">{roomInfo.participantCount}</Typography>
        </RoomInfoItem>
      </RoomInfoContainer>

      <Divider />

      <ActionButtonsContainer>
        {!roomInfo.isActive ? (
          <MaterialButton
            variant="filled"
            size="large"
            fullWidth
            startIcon={<MaterialIcon name="play" size="small" />}
            onClick={handleStartRoom}
            loading={buttonStates.startRoom === 'loading'}
          >
            Start Room
          </MaterialButton>
        ) : (
          <MaterialButton
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<MaterialIcon name="pause" size="small" />}
            onClick={() => {
              /* TODO: Stop room */
            }}
          >
            Stop Room
          </MaterialButton>
        )}

        <MaterialButton
          variant="text"
          color="error"
          fullWidth
          startIcon={<MaterialIcon name="x" size="small" />}
          onClick={handleLeaveRoom}
          loading={buttonStates.leaveRoom === 'loading'}
        >
          Leave Room
        </MaterialButton>
      </ActionButtonsContainer>
    </MainContainer>
  );

  return (
    <MaterialCard
      elevation="low"
      variant="elevated"
      padding="lg"
      className={className}
      data-testid={testId}
    >
      {currentView === 'main' && renderMainView()}
      {currentView === 'createRoom' && renderCreateRoomView()}
      {currentView === 'joinRoom' && renderJoinRoomView()}
      {currentView === 'roomView' && renderRoomView()}
    </MaterialCard>
  );
};

export default MainCard;
