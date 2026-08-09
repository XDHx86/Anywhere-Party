/**
 * Material Design 3 Reaction Buttons Component
 * Material icon buttons for message reactions
 */

import React, { memo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box, IconButton, Tooltip, Fade, ClickAwayListener } from '@mui/material';
import { MaterialIcon } from '../cards/MaterialIcon';
import { ReactionButtonsProps, REACTION_EMOJIS } from './types';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

const ReactionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  opacity: 0,
  transform: 'translateY(4px)',
  transition: createTransition(['opacity', 'transform'], 'medium2', 'standard'),

  '.message-container:hover &': {
    opacity: 1,
    transform: 'translateY(0)',
    transition: createTransition(['opacity', 'transform'], 'medium1', 'emphasized'),
  },
}));

const ReactionButton = styled(IconButton)(({ theme }) => ({
  width: 28,
  height: 28,
  padding: 4,
  fontSize: '14px',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  transition: createTransition(
    ['background-color', 'transform', 'border-color'],
    'short2',
    'standard'
  ),

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.2)',
    borderColor: theme.palette.primary.main,
    transition: createTransition(
      ['background-color', 'transform', 'border-color'],
      'short1',
      'emphasized'
    ),
  },

  '&:active': {
    transform: 'scale(1.1)',
  },
}));

const QuickReactionButton = styled(IconButton)(({ theme }) => ({
  width: 24,
  height: 24,
  padding: 2,
  fontSize: '12px',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  transition: createTransition(
    ['background-color', 'transform', 'box-shadow'],
    'short2',
    'standard'
  ),

  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    transform: 'scale(1.15)',
    boxShadow: theme.shadows[4],
    transition: createTransition(
      ['background-color', 'transform', 'box-shadow'],
      'short1',
      'emphasized'
    ),
  },
}));

const ReactionPalette = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 16,
  boxShadow: theme.shadows[8],
  border: `1px solid ${theme.palette.divider}`,
  position: 'absolute',
  top: -50,
  left: 0,
  zIndex: 1000,
  transform: 'scale(0.8)',
  transformOrigin: 'bottom left',
  transition: createTransition(['transform', 'opacity'], 'medium2', 'emphasized'),

  '&.open': {
    transform: 'scale(1)',
  },
}));

export const ReactionButtons = memo<ReactionButtonsProps>(
  ({
    messageId,
    reactions,
    onReaction,
    onRemoveReaction,
    currentUserId,
    className,
    'data-testid': testId,
  }) => {
    const { theme } = useMaterialTheme();
    const [showPalette, setShowPalette] = useState(false);

    const handleQuickReaction = (emoji: string) => {
      const existingReaction = reactions.find(
        (r) => r.emoji === emoji && r.userId === currentUserId
      );

      if (existingReaction) {
        onRemoveReaction(messageId, existingReaction.id);
      } else {
        onReaction(messageId, emoji);
      }
    };

    const handleMoreReactions = () => {
      setShowPalette(!showPalette);
    };

    const handlePaletteReaction = (emoji: string) => {
      handleQuickReaction(emoji);
      setShowPalette(false);
    };

    const handleClickAway = () => {
      setShowPalette(false);
    };

    // Get most common reactions for quick access
    const quickReactions = ['❤️', '😂', '👍'];

    return (
      <ClickAwayListener onClickAway={handleClickAway}>
        <Box sx={{ position: 'relative' }}>
          <ReactionContainer className={`reaction-buttons ${className || ''}`} data-testid={testId}>
            {/* Quick reaction buttons */}
            {quickReactions.map((emoji) => {
              const hasReacted = reactions.some(
                (r) => r.emoji === emoji && r.userId === currentUserId
              );

              return (
                <Tooltip key={emoji} title={`React with ${emoji}`} arrow>
                  <QuickReactionButton
                    onClick={() => handleQuickReaction(emoji)}
                    size="small"
                    sx={{
                      backgroundColor: hasReacted ? theme.palette.primary.main : '#ffffff',
                      color: hasReacted
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                    }}
                  >
                    {emoji}
                  </QuickReactionButton>
                </Tooltip>
              );
            })}

            {/* More reactions button */}
            <Tooltip title="More reactions" arrow>
              <ReactionButton onClick={handleMoreReactions} size="small">
                <MaterialIcon name="plus" size="small" />
              </ReactionButton>
            </Tooltip>
          </ReactionContainer>

          {/* Reaction palette */}
          <Fade in={showPalette} timeout={200}>
            <ReactionPalette className={showPalette ? 'open' : ''}>
              {REACTION_EMOJIS.map((emoji) => {
                const hasReacted = reactions.some(
                  (r) => r.emoji === emoji && r.userId === currentUserId
                );

                return (
                  <Tooltip key={emoji} title={`React with ${emoji}`} arrow>
                    <ReactionButton
                      onClick={() => handlePaletteReaction(emoji)}
                      size="small"
                      sx={{
                        backgroundColor: hasReacted ? theme.palette.primary.main : '#ffffff',
                        color: hasReacted
                          ? theme.palette.primary.contrastText
                          : theme.palette.text.primary,
                      }}
                    >
                      {emoji}
                    </ReactionButton>
                  </Tooltip>
                );
              })}
            </ReactionPalette>
          </Fade>
        </Box>
      </ClickAwayListener>
    );
  }
);

ReactionButtons.displayName = 'ReactionButtons';

export default ReactionButtons;
