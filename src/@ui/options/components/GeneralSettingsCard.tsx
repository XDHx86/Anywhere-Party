/**
 * General Settings Card Component
 * Implements Material Design 3 card for general room and connection settings
 * Requirements: 26.2, 26.3, 26.4
 */

import React from 'react';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialInput } from '../../components/cards/MaterialInput';
import { MaterialSwitch } from '../../components/cards/MaterialSwitch';
import { MaterialSelect } from '../../components/cards/MaterialSelect';
import { Typography, Box, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

export interface GeneralSettingsData {
  signalingServer: string;
  signalingWsPath: string;
  localDevMode: boolean;
  roomDefaultPassword: string;
  syncTolerance: number;
  syncTimeout: number;
  heartbeatInterval: number;
  reconnectInterval: number;
  roomStateTtl: number;
  videoDetectPoll?: number;
}

export interface GeneralSettingsCardProps {
  data: GeneralSettingsData;
  onChange: (field: keyof GeneralSettingsData, value: string | number | boolean) => void;
  className?: string;
}

// Styled components
const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(2),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(3),
}));

const FieldGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
  backgroundColor: theme.palette.divider,
}));

export const GeneralSettingsCard: React.FC<GeneralSettingsCardProps> = ({
  data,
  onChange,
  className,
}) => {
  const syncToleranceOptions = [
    { value: '50', label: '50ms (Very Strict)' },
    { value: '100', label: '100ms (Strict)' },
    { value: '200', label: '200ms (Balanced)' },
    { value: '300', label: '300ms (Default)' },
    { value: '500', label: '500ms (Relaxed)' },
    { value: '1000', label: '1000ms (Very Relaxed)' },
  ];

  const heartbeatOptions = [
    { value: '1000', label: '1 second (High Frequency)' },
    { value: '2000', label: '2 seconds (Default)' },
    { value: '3000', label: '3 seconds (Balanced)' },
    { value: '5000', label: '5 seconds (Low Frequency)' },
  ];

  return (
    <MaterialCard
      elevation="low"
      variant="elevated"
      rounded="lg"
      padding="lg"
      className={className}
    >
      <CardTitle variant="h2">General Settings</CardTitle>

      {/* Server Configuration */}
      <SectionTitle variant="h3">Server Configuration</SectionTitle>

      <FieldGroup>
        <MaterialInput
          label="Signaling Server URL"
          value={data.signalingServer}
          onChange={(e) => onChange('signalingServer', e.target.value)}
          helperText="WebSocket URL for the signaling server. Use ws:// for local development, wss:// for production."
          placeholder="wss://api.watchparty.example.com"
          fullWidth
          type="url"
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialInput
          label="WebSocket Path"
          value={data.signalingWsPath}
          onChange={(e) => onChange('signalingWsPath', e.target.value)}
          helperText="Optional path to append to the signaling server URL."
          placeholder="/ws"
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSwitch
          label="Local Development Mode"
          checked={data.localDevMode}
          onChange={(e) => onChange('localDevMode', e.target.checked)}
          helperText="Use lightweight local relay server instead of full signaling server."
        />
      </FieldGroup>

      <StyledDivider />

      {/* Room Defaults */}
      <SectionTitle variant="h3">Room Defaults</SectionTitle>

      <FieldGroup>
        <MaterialInput
          label="Default Room Password"
          value={data.roomDefaultPassword}
          onChange={(e) => onChange('roomDefaultPassword', e.target.value)}
          helperText="Default password for new rooms (optional)."
          placeholder="Leave empty for no default password"
          type="password"
          fullWidth
        />
      </FieldGroup>

      <StyledDivider />

      {/* Synchronization Settings */}
      <SectionTitle variant="h3">Synchronization Settings</SectionTitle>

      <FieldGroup>
        <MaterialSelect
          label="Sync Tolerance"
          value={data.syncTolerance.toString()}
          onChange={(e) => onChange('syncTolerance', parseInt(e.target.value as string))}
          options={syncToleranceOptions}
          helperText="Maximum allowed drift before triggering sync correction."
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialInput
          label="Sync Timeout (ms)"
          value={data.syncTimeout.toString()}
          onChange={(e) => onChange('syncTimeout', parseInt(e.target.value) || 5000)}
          helperText="Maximum time to wait for sync convergence (1000-30000ms)."
          type="number"
          inputProps={{ min: 1000, max: 30000, step: 1000 }}
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialSelect
          label="Heartbeat Interval"
          value={data.heartbeatInterval.toString()}
          onChange={(e) => onChange('heartbeatInterval', parseInt(e.target.value as string))}
          options={heartbeatOptions}
          helperText="Frequency of sync heartbeat messages."
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialInput
          label="Reconnect Interval (ms)"
          value={data.reconnectInterval.toString()}
          onChange={(e) => onChange('reconnectInterval', parseInt(e.target.value) || 5000)}
          helperText="Time between reconnection attempts (1000-30000ms)."
          type="number"
          inputProps={{ min: 1000, max: 30000, step: 1000 }}
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialInput
          label="Room State TTL (minutes)"
          value={Math.round(data.roomStateTtl / 60000).toString()}
          onChange={(e) => onChange('roomStateTtl', (parseInt(e.target.value) || 5) * 60000)}
          helperText="How long to keep room state after disconnection (1-60 minutes)."
          type="number"
          inputProps={{ min: 1, max: 60, step: 1 }}
          fullWidth
        />
      </FieldGroup>

      <FieldGroup>
        <MaterialInput
          label="Video Detection Polling (ms)"
          value={data.videoDetectPoll?.toString() || ''}
          onChange={(e) => {
            const value = e.target.value;
            onChange('videoDetectPoll', value ? parseInt(value) || 0 : 0);
          }}
          helperText="Optional fallback polling for video detection. Leave empty to disable."
          placeholder="Disabled (uses MutationObserver only)"
          type="number"
          inputProps={{ min: 100, max: 5000, step: 100 }}
          fullWidth
        />
      </FieldGroup>
    </MaterialCard>
  );
};

export default GeneralSettingsCard;
