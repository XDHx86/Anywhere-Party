/**
 * Material Design 3 Chat Sidebar Component
 * Main chat interface with Material styling and performance optimizations
 */

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography, IconButton, Tooltip, Divider, Fade } from '@mui/material';
import { MaterialCard } from '../cards/MaterialCard';
import { MaterialIcon } from '../cards/MaterialIcon';
import { MessageCard } from './MessageCard';
import { InputBar } from './InputBar';
import { VirtualScroll } from './VirtualScroll';
import { ChatSidebarProps, ChatMessage } from './types';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

const SidebarContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>(({ theme, isOpen }) => ({
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100vh',
  width: isOpen ? 320 : 0,
  backgroundColor: theme.palette.background.paper,
  borderLeft: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 1000,

  // Material Design 3 elevation and shadows
  boxShadow: isOpen ? theme.shadows[8] : 'none',

  // Smooth slide animation
  transition: createTransition(['width', 'box-shadow'], 'medium2', 'emphasized'),

  // Backdrop blur effect
  backdropFilter: 'blur(8px)',

  [theme.breakpoints.down('sm')]: {
    width: isOpen ? '100vw' : 0,
  },
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  minHeight: 64,
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
  fontSize: theme.typography.pxToRem(18),
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  transition: createTransition(['color', 'transform'], 'short2', 'standard'),

  '&:hover': {
    color: theme.palette.text.primary,
    transform: 'scale(1.1)',
    backgroundColor: theme.palette.action.hover,
  },
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
}));

const MessagesArea = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(1),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const EmptyIcon = styled(MaterialIcon)(({ theme }) => ({
  fontSize: 48,
  marginBottom: theme.spacing(2),
  opacity: 0.5,
}));

const MessagesList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 0),
  minHeight: 0, // Allow flex shrinking
}));

const TypingIndicator = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  color: theme.palette.text.secondary,
  fontSize: theme.typography.pxToRem(12),
  fontStyle: 'italic',
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,

  '& .dots': {
    display: 'inline-block',
    animation: 'typing 1.4s infinite',
  },

  '@keyframes typing': {
    '0%, 60%, 100%': {
      opacity: 0,
    },
    '30%': {
      opacity: 1,
    },
  },
}));

// Message batching for performance
const BATCH_SIZE = 50;
const MESSAGE_HEIGHT = 80; // Approximate height per message

export const ChatSidebar = memo<ChatSidebarProps>(
  ({
    messages,
    onSendMessage,
    onReaction,
    onRemoveReaction,
    currentUserId,
    isOpen,
    onClose,
    className,
    'data-testid': testId,
  }) => {
    const { theme } = useMaterialTheme();
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Memoized message batching for performance
    const batchedMessages = useMemo(() => {
      return messages.slice(-BATCH_SIZE); // Show last 50 messages
    }, [messages]);

    // Optimized message rendering with React.memo
    const renderMessage = useCallback(
      (message: ChatMessage, index: number) => (
        <MessageCard
          key={message.id}
          message={message}
          onReaction={onReaction}
          onRemoveReaction={onRemoveReaction}
          currentUserId={currentUserId}
        />
      ),
      [onReaction, onRemoveReaction, currentUserId]
    );

    // Auto-scroll to bottom for new messages
    const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
      if (isOpen && messages.length > 0) {
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [messages.length, isOpen, scrollToBottom]);

    // Handle message sending with optimistic updates
    const handleSendMessage = useCallback(
      (message: string) => {
        onSendMessage(message);

        // Show typing indicator briefly
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
      },
      [onSendMessage]
    );

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen && onClose) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isOpen, onClose]);

    return (
      <Fade in={isOpen} timeout={300}>
        <SidebarContainer isOpen={isOpen} className={className} data-testid={testId}>
          <SidebarHeader>
            <HeaderTitle variant="h6">Chat ({messages.length})</HeaderTitle>
            {onClose && (
              <Tooltip title="Close chat" arrow>
                <CloseButton onClick={onClose} size="small" aria-label="Close chat">
                  <MaterialIcon name="x" size="small" />
                </CloseButton>
              </Tooltip>
            )}
          </SidebarHeader>

          <MessagesContainer>
            {messages.length === 0 ? (
              <EmptyState>
                <EmptyIcon name="message-circle" />
                <Typography variant="body2" color="textSecondary">
                  No messages yet
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Start the conversation!
                </Typography>
              </EmptyState>
            ) : (
              <MessagesArea>
                {/* Use virtual scrolling for large message lists */}
                {messages.length > BATCH_SIZE ? (
                  <VirtualScroll
                    items={messages}
                    itemHeight={MESSAGE_HEIGHT}
                    containerHeight={400}
                    renderItem={renderMessage}
                    overscan={5}
                  />
                ) : (
                  <MessagesList>
                    {batchedMessages.map((message, index) => renderMessage(message, index))}
                    <div ref={messagesEndRef} />
                  </MessagesList>
                )}
              </MessagesArea>
            )}

            {isTyping && (
              <TypingIndicator>
                Someone is typing<span className="dots">...</span>
              </TypingIndicator>
            )}
          </MessagesContainer>

          <Divider />

          <InputBar
            onSendMessage={handleSendMessage}
            placeholder="Type a message..."
            disabled={false}
          />
        </SidebarContainer>
      </Fade>
    );
  }
);

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
