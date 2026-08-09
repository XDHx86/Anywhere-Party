/**
 * Material Design 3 Message Card Component
 * Card-style message bubbles with elevation and rounded corners
 */

import React, { memo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography, Chip } from '@mui/material';
import { MaterialCard } from '../cards/MaterialCard';
import { ReactionButtons } from './ReactionButtons';
import { MessageCardProps } from './types';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

const MessageContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'messageType',
})<{ messageType: 'sent' | 'received' }>(({ theme, messageType }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: messageType === 'sent' ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
  maxWidth: '85%',
  alignSelf: messageType === 'sent' ? 'flex-end' : 'flex-start',

  // Add class name for reaction buttons hover state
  '&.message-container': {
    // This allows the ReactionButtons component to show on hover
  },
}));

const MessageBubble = styled(MaterialCard, {
  shouldForwardProp: (prop) => prop !== 'messageType',
})<{ messageType: 'sent' | 'received' }>(({ theme, messageType }) => ({
  maxWidth: '100%',
  wordBreak: 'break-word',
  position: 'relative',

  // Message type specific styling
  ...(messageType === 'sent' && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      transform: 'translateY(-2px) scale(1.02)',
    },
  }),

  ...(messageType === 'received' && {
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
    color: theme.palette.text.primary,
    '&:hover': {
      backgroundColor:
        theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700],
      transform: 'translateY(-2px) scale(1.02)',
    },
  }),

  // Enhanced Material Design 3 animations
  transition: createTransition(
    ['background-color', 'transform', 'box-shadow'],
    'medium1',
    'standard'
  ),

  '&:hover': {
    boxShadow: theme.shadows[4],
    transition: createTransition(
      ['background-color', 'transform', 'box-shadow'],
      'medium1',
      'emphasized'
    ),
  },
}));

const MessageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(0.5),
  gap: theme.spacing(1),
}));

const UserName = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.pxToRem(12),
  opacity: 0.8,
}));

const Timestamp = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(10),
  opacity: 0.6,
  fontWeight: theme.typography.fontWeightRegular,
}));

const MessageContent = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.pxToRem(14),
  lineHeight: 1.4,
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
}));

const ReactionsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
}));

const ReactionChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: theme.typography.pxToRem(11),
  '& .MuiChip-label': {
    padding: '0 6px',
  },
  transition: createTransition(['background-color', 'transform'], 'short2', 'standard'),
  '&:hover': {
    transform: 'scale(1.1)',
    transition: createTransition(['transform'], 'short1', 'emphasized'),
  },
}));

export const MessageCard = memo<MessageCardProps>(
  ({ message, onReaction, onRemoveReaction, currentUserId, className, 'data-testid': testId }) => {
    useMaterialTheme();

    const formatTimestamp = (timestamp: Date) => {
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return 'now';
      if (minutes < 60) return `${minutes}m`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
      return timestamp.toLocaleDateString();
    };

    const handleReactionClick = (reactionId: string, emoji: string) => {
      const reaction = message.reactions.find((r) => r.id === reactionId);
      if (reaction && reaction.userId === currentUserId) {
        onRemoveReaction(message.id, reactionId);
      } else {
        onReaction(message.id, emoji);
      }
    };

    // Group reactions by emoji
    const groupedReactions = message.reactions.reduce(
      (acc, reaction) => {
        const existing = acc[reaction.emoji] ?? [];
        existing.push(reaction);
        acc[reaction.emoji] = existing;
        return acc;
      },
      {} as Record<string, typeof message.reactions>
    );

    return (
      <MessageContainer
        messageType={message.type}
        className={`message-container ${className || ''}`}
        data-testid={testId}
      >
        <MessageBubble
          messageType={message.type}
          elevation="low"
          variant="elevated"
          rounded="lg"
          padding="sm"
        >
          <MessageHeader>
            <UserName variant="caption">{message.userName}</UserName>
            <Timestamp variant="caption">{formatTimestamp(message.timestamp)}</Timestamp>
          </MessageHeader>

          <MessageContent variant="body2">{message.content}</MessageContent>

          {Object.keys(groupedReactions).length > 0 && (
            <ReactionsContainer>
              {Object.entries(groupedReactions).map(([emoji, reactions]) => {
                const userReaction = reactions.find((r) => r.userId === currentUserId);
                return (
                  <ReactionChip
                    key={emoji}
                    label={`${emoji} ${reactions.length}`}
                    size="small"
                    variant={userReaction ? 'filled' : 'outlined'}
                    color={userReaction ? 'primary' : 'default'}
                    onClick={() =>
                      handleReactionClick(userReaction?.id || reactions[0]?.id || '', emoji)
                    }
                    clickable
                  />
                );
              })}
            </ReactionsContainer>
          )}
        </MessageBubble>

        <ReactionButtons
          messageId={message.id}
          reactions={message.reactions}
          onReaction={onReaction}
          onRemoveReaction={onRemoveReaction}
          currentUserId={currentUserId}
        />
      </MessageContainer>
    );
  }
);

MessageCard.displayName = 'MessageCard';

export default MessageCard;
