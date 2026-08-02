/**
 * Material Design 3 Input Bar Component
 * Sticky input bar with Material input field and send button
 */

import React, { memo, useState, useRef, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Box, InputAdornment, Tooltip, TextField } from '@mui/material';
import { MaterialButton } from '../cards/MaterialButton';
import { MaterialIcon } from '../cards/MaterialIcon';
import { InputBarProps } from './types';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

const InputContainer = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'flex-end',
  zIndex: 100,
  backdropFilter: 'blur(8px)',

  // Enhanced Material Design 3 styling
  boxShadow: `0 -2px 8px ${
    theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
  }`,

  transition: createTransition(['background-color', 'border-color'], 'medium2', 'standard'),

  '&:focus-within': {
    borderTopColor: theme.palette.primary.main,
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
    transition: createTransition(['background-color', 'border-color'], 'medium1', 'emphasized'),
  },
}));

const MessageInput = styled(TextField)(({ theme }) => ({
  flex: 1,

  '& .MuiOutlinedInput-root': {
    borderRadius: 24, // More rounded for chat
    backgroundColor: theme.palette.background.default,
    transition: createTransition(['background-color', 'border-color'], 'short2', 'standard'),

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },

    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: 2,
      },
    },
  },

  '& .MuiOutlinedInput-input': {
    padding: '12px 16px',
    fontSize: theme.typography.pxToRem(14),
    lineHeight: 1.4,
    maxHeight: '120px', // Allow for multiline
    overflow: 'auto',
  },
}));

const SendButton = styled(MaterialButton)(({ theme }) => ({
  minWidth: 48,
  height: 48,
  borderRadius: '50%',
  padding: 0,

  '&:disabled': {
    backgroundColor: theme.palette.action.disabled,
    color: theme.palette.action.disabled,
  },

  '&:not(:disabled)': {
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    boxShadow: theme.shadows[3],

    '&:hover': {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
      boxShadow: theme.shadows[6],
      transform: 'scale(1.05)',
    },

    '&:active': {
      transform: 'scale(0.95)',
    },
  },
}));

const EmojiButton = styled(MaterialButton)(({ theme }) => ({
  minWidth: 40,
  height: 40,
  borderRadius: '50%',
  padding: 0,
  color: theme.palette.text.secondary,

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.primary.main,
    transform: 'scale(1.1)',
  },
}));

export const InputBar = memo<InputBarProps>(
  ({
    onSendMessage,
    disabled = false,
    placeholder = 'Type a message...',
    className,
    'data-testid': testId,
  }) => {
    const { theme } = useMaterialTheme();
    const [message, setMessage] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSend = useCallback(() => {
      const trimmedMessage = message.trim();
      if (trimmedMessage && !disabled) {
        onSendMessage(trimmedMessage);
        setMessage('');
        inputRef.current?.focus();
      }
    }, [message, disabled, onSendMessage]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
          event.preventDefault();
          handleSend();
        }
      },
      [handleSend, isComposing]
    );

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setMessage(event.target.value);
    }, []);

    const handleCompositionStart = useCallback(() => {
      setIsComposing(true);
    }, []);

    const handleCompositionEnd = useCallback(() => {
      setIsComposing(false);
    }, []);

    const canSend = message.trim().length > 0 && !disabled;

    return (
      <InputContainer className={className} data-testid={testId}>
        <MessageInput
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title="Add emoji" arrow>
                  <EmojiButton variant="text" size="small" disabled={disabled}>
                    <MaterialIcon name="smile" size="small" />
                  </EmojiButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Type your message',
          }}
          data-testid="message-input"
        />

        <Tooltip title={canSend ? 'Send message' : 'Type a message to send'} arrow>
          <span>
            <SendButton
              onClick={handleSend}
              disabled={!canSend}
              variant="filled"
              color="primary"
              data-testid="send-button"
              aria-label="Send message"
            >
              <MaterialIcon name="send" size="small" color={canSend ? 'inherit' : 'disabled'} />
            </SendButton>
          </span>
        </Tooltip>
      </InputContainer>
    );
  }
);

InputBar.displayName = 'InputBar';

export default InputBar;
