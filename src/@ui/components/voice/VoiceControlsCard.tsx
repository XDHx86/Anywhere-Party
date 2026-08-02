/**
 * Material Design 3 Voice Controls Card
 *
 * Provides voice communication controls including mute, push-to-talk,
 * and per-user volume controls with Material Design 3 styling.
 *
 * Requirements: 4.2, 4.3, 4.4
 */

import React, { useState, useEffect } from 'react';
import {
  WebRTCVoiceManager,
  ParticipantAudioState,
  VoiceConnectionStatus,
} from '../../../@core/webrtc-voice/webrtc-voice-manager';

interface VoiceControlsCardProps {
  voiceManager: WebRTCVoiceManager;
  className?: string;
}

interface VoiceControlsState {
  isMuted: boolean;
  isPushToTalkEnabled: boolean;
  isPushToTalkPressed: boolean;
  participants: ParticipantAudioState[];
  connectionStatus: VoiceConnectionStatus;
}

export const VoiceControlsCard: React.FC<VoiceControlsCardProps> = ({
  voiceManager,
  className = '',
}) => {
  const [state, setState] = useState<VoiceControlsState>({
    isMuted: false,
    isPushToTalkEnabled: false,
    isPushToTalkPressed: false,
    participants: [],
    connectionStatus: { connected: false, connectionType: 'failed' },
  });

  useEffect(() => {
    // Set up event listeners
    const handleMuteStateChanged = (data: { muted: boolean }) => {
      setState((prev) => ({ ...prev, isMuted: data.muted }));
    };

    const handlePushToTalkStateChanged = (enabled: boolean) => {
      setState((prev) => ({ ...prev, isPushToTalkEnabled: enabled }));
    };

    const handlePushToTalkPressed = (pressed: boolean) => {
      setState((prev) => ({ ...prev, isPushToTalkPressed: pressed }));
    };

    const handleParticipantConnected = () => {
      setState((prev) => ({ ...prev, participants: voiceManager.getParticipants() }));
    };

    const handleParticipantDisconnected = () => {
      setState((prev) => ({ ...prev, participants: voiceManager.getParticipants() }));
    };

    const handleVoiceActivity = () => {
      setState((prev) => ({ ...prev, participants: voiceManager.getParticipants() }));
    };

    const handleConnectionFailed = (status: VoiceConnectionStatus) => {
      setState((prev) => ({ ...prev, connectionStatus: status }));
    };

    const handleInitialized = (status: VoiceConnectionStatus) => {
      setState((prev) => ({ ...prev, connectionStatus: status }));
    };

    // Register event listeners
    voiceManager.on('muteStateChanged', handleMuteStateChanged);
    voiceManager.on('pushToTalkStateChanged', handlePushToTalkStateChanged);
    voiceManager.on('pushToTalkPressed', handlePushToTalkPressed);
    voiceManager.on('participantConnected', handleParticipantConnected);
    voiceManager.on('participantDisconnected', handleParticipantDisconnected);
    voiceManager.on('voiceActivity', handleVoiceActivity);
    voiceManager.on('connectionFailed', handleConnectionFailed);
    voiceManager.on('initialized', handleInitialized);

    // Initialize state
    setState((prev) => ({
      ...prev,
      isMuted: voiceManager.isMutedState(),
      participants: voiceManager.getParticipants(),
      connectionStatus: voiceManager.getConnectionStatus(),
    }));

    return () => {
      // Clean up event listeners
      voiceManager.off('muteStateChanged', handleMuteStateChanged);
      voiceManager.off('pushToTalkStateChanged', handlePushToTalkStateChanged);
      voiceManager.off('pushToTalkPressed', handlePushToTalkPressed);
      voiceManager.off('participantConnected', handleParticipantConnected);
      voiceManager.off('participantDisconnected', handleParticipantDisconnected);
      voiceManager.off('voiceActivity', handleVoiceActivity);
      voiceManager.off('connectionFailed', handleConnectionFailed);
      voiceManager.off('initialized', handleInitialized);
    };
  }, [voiceManager]);

  const handleMuteToggle = () => {
    voiceManager.setMuted(!state.isMuted);
  };

  const handlePushToTalkToggle = () => {
    voiceManager.enablePushToTalk(!state.isPushToTalkEnabled);
  };

  const handleVolumeChange = (userId: string, volume: number) => {
    voiceManager.setParticipantVolume(userId, volume);
  };

  const renderConnectionStatus = () => {
    if (!state.connectionStatus.connected) {
      return (
        <div className="voice-connection-error">
          <div className="error-icon">
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div className="error-content">
            <h4>Voice Chat Unavailable</h4>
            <p>{state.connectionStatus.degradationMessage || 'Unable to connect to voice chat'}</p>
            {state.connectionStatus.connectionType === 'failed' && (
              <button
                className="md3-button md3-button--outlined"
                onClick={() => voiceManager.initialize()}
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="voice-connection-status">
        <div className="status-indicator connected">
          <i className="fas fa-check-circle" />
        </div>
        <span className="status-text">
          Voice chat connected ({state.connectionStatus.connectionType.toUpperCase()})
        </span>
      </div>
    );
  };

  const renderLocalControls = () => (
    <div className="voice-local-controls">
      <h3>Your Microphone</h3>

      <div className="control-row">
        <button
          className={`md3-button md3-button--filled ${state.isMuted ? 'muted' : 'active'}`}
          onClick={handleMuteToggle}
          aria-label={state.isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <i className={`fas ${state.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
          {state.isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          className={`md3-button md3-button--outlined ${state.isPushToTalkEnabled ? 'active' : ''}`}
          onClick={handlePushToTalkToggle}
          aria-label="Toggle push-to-talk mode"
        >
          <i className="fas fa-hand-paper" />
          Push-to-Talk {state.isPushToTalkEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {state.isPushToTalkEnabled && (
        <div className="push-to-talk-indicator">
          <div className={`ptt-status ${state.isPushToTalkPressed ? 'active' : 'inactive'}`}>
            <i className="fas fa-microphone" />
            <span>{state.isPushToTalkPressed ? 'Speaking...' : 'Hold Space to speak'}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderParticipantControls = () => {
    if (state.participants.length === 0) {
      return (
        <div className="no-participants">
          <i className="fas fa-users" />
          <p>No other participants in voice chat</p>
        </div>
      );
    }

    return (
      <div className="voice-participants">
        <h3>Participants ({state.participants.length})</h3>

        {state.participants.map((participant) => (
          <div key={participant.userId} className="participant-control">
            <div className="participant-info">
              <div className="participant-avatar">
                <i className="fas fa-user" />
                {participant.speaking && (
                  <div className="speaking-indicator">
                    <i className="fas fa-volume-up" />
                  </div>
                )}
              </div>

              <div className="participant-details">
                <span className="participant-name">User {participant.userId}</span>
                <div className="participant-status">
                  <span
                    className={`connection-status ${participant.connected ? 'connected' : 'disconnected'}`}
                  >
                    {participant.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  {participant.muted && (
                    <span className="muted-indicator">
                      <i className="fas fa-microphone-slash" />
                      Muted
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="volume-control">
              <label htmlFor={`volume-${participant.userId}`} className="volume-label">
                <i className="fas fa-volume-down" />
              </label>
              <input
                id={`volume-${participant.userId}`}
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={participant.volume}
                onChange={(e) => handleVolumeChange(participant.userId, parseFloat(e.target.value))}
                className="md3-slider"
                aria-label={`Volume for User ${participant.userId}`}
              />
              <span className="volume-value">{Math.round(participant.volume * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`voice-controls-card md3-card ${className}`}>
      <div className="md3-card__content">
        <div className="card-header">
          <h2>
            <i className="fas fa-headset" />
            Voice Chat
          </h2>
        </div>

        {renderConnectionStatus()}

        {state.connectionStatus.connected && (
          <>
            {renderLocalControls()}
            {renderParticipantControls()}
          </>
        )}
      </div>

      <style>{`
        .voice-controls-card {
          background: var(--md3-surface);
          border-radius: 16px;
          padding: 24px;
          margin: 16px 0;
          box-shadow: var(--md3-elevation-level2);
          border: 1px solid var(--md3-outline-variant);
        }

        .card-header {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--md3-outline-variant);
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 500;
          color: var(--md3-on-surface);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .voice-connection-error {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: var(--md3-error-container);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .error-icon {
          color: var(--md3-error);
          font-size: 1.5rem;
          margin-top: 4px;
        }

        .error-content h4 {
          margin: 0 0 8px 0;
          color: var(--md3-on-error-container);
          font-size: 1rem;
          font-weight: 500;
        }

        .error-content p {
          margin: 0 0 16px 0;
          color: var(--md3-on-error-container);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .voice-connection-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--md3-primary-container);
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .status-indicator.connected {
          color: var(--md3-primary);
          font-size: 1.25rem;
        }

        .status-text {
          color: var(--md3-on-primary-container);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .voice-local-controls {
          margin-bottom: 32px;
        }

        .voice-local-controls h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 500;
          color: var(--md3-on-surface);
        }

        .control-row {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .md3-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .md3-button--filled {
          background: var(--md3-primary);
          color: var(--md3-on-primary);
        }

        .md3-button--filled:hover {
          background: var(--md3-primary-hover);
          box-shadow: var(--md3-elevation-level1);
        }

        .md3-button--filled.muted {
          background: var(--md3-error);
          color: var(--md3-on-error);
        }

        .md3-button--outlined {
          background: transparent;
          color: var(--md3-primary);
          border: 1px solid var(--md3-outline);
        }

        .md3-button--outlined:hover {
          background: var(--md3-primary-container);
        }

        .md3-button--outlined.active {
          background: var(--md3-primary-container);
          border-color: var(--md3-primary);
        }

        .push-to-talk-indicator {
          padding: 12px 16px;
          background: var(--md3-secondary-container);
          border-radius: 8px;
        }

        .ptt-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .ptt-status.active {
          color: var(--md3-primary);
          font-weight: 500;
        }

        .ptt-status.inactive {
          color: var(--md3-on-secondary-container);
        }

        .voice-participants h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          font-weight: 500;
          color: var(--md3-on-surface);
        }

        .no-participants {
          text-align: center;
          padding: 32px 16px;
          color: var(--md3-on-surface-variant);
        }

        .no-participants i {
          font-size: 2rem;
          margin-bottom: 12px;
          display: block;
        }

        .participant-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--md3-surface-variant);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .participant-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .participant-avatar {
          position: relative;
          width: 40px;
          height: 40px;
          background: var(--md3-primary-container);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-primary-container);
        }

        .speaking-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background: var(--md3-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md3-on-primary);
          font-size: 0.625rem;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .participant-details {
          flex: 1;
        }

        .participant-name {
          display: block;
          font-weight: 500;
          color: var(--md3-on-surface);
          margin-bottom: 4px;
        }

        .participant-status {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.75rem;
        }

        .connection-status.connected {
          color: var(--md3-primary);
        }

        .connection-status.disconnected {
          color: var(--md3-error);
        }

        .muted-indicator {
          color: var(--md3-error);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
        }

        .volume-label {
          color: var(--md3-on-surface-variant);
          font-size: 0.875rem;
        }

        .md3-slider {
          flex: 1;
          height: 4px;
          background: var(--md3-outline-variant);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .md3-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--md3-primary);
          border-radius: 50%;
          cursor: pointer;
        }

        .md3-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--md3-primary);
          border-radius: 50%;
          border: none;
          cursor: pointer;
        }

        .volume-value {
          font-size: 0.75rem;
          color: var(--md3-on-surface-variant);
          min-width: 32px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default VoiceControlsCard;
