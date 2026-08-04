/**
 * PlaylistCard — MD3 playlist section for the popup.
 * Shows the shared video queue when PLAYLISTS feature flag is enabled.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SkipNext as SkipNextIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';

interface PlaylistItem {
  id: string;
  url: string;
  title?: string;
  duration?: number;
  addedBy: string;
  thumbnailUrl?: string;
}

interface PlaylistCardProps {
  isHost: boolean;
  onAction: (type: string, payload: Record<string, unknown>) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ isHost, onAction }) => {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Load playlist on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PLAYLIST' }, (response) => {
      if (response?.success) {
        setItems(response.playlist.items || []);
        setCurrentIndex(response.playlist.currentIndex || 0);
      }
    });

    // Listen for playlist updates
    const listener = (message: {
      type: string;
      playlist?: { items: PlaylistItem[]; currentIndex: number };
    }) => {
      if (message.type === 'PLAYLIST_STATE' && message.playlist) {
        setItems(message.playlist.items || []);
        setCurrentIndex(message.playlist.currentIndex || 0);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleAdd = useCallback(() => {
    if (!newUrl.trim()) return;
    const item: PlaylistItem = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: newUrl.trim(),
      title: newTitle.trim() || undefined,
      addedBy: 'You',
    };
    onAction('ADD_TO_PLAYLIST', { items: [item] });
    setItems((prev) => [...prev, item]);
    setNewUrl('');
    setNewTitle('');
    setAddDialogOpen(false);
  }, [newUrl, newTitle, onAction]);

  const handleRemove = useCallback(
    (id: string) => {
      onAction('REMOVE_FROM_PLAYLIST', { itemIds: [id] });
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [onAction]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      const itemIds = newItems.map((i) => i.id);
      onAction('REORDER_PLAYLIST', { itemIds, newIndex: index - 1 });
      setItems(newItems);
    },
    [items, onAction]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return;
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      const itemIds = newItems.map((i) => i.id);
      onAction('REORDER_PLAYLIST', { itemIds, newIndex: index });
      setItems(newItems);
    },
    [items, onAction]
  );

  const handleSkip = useCallback(
    (itemId: string) => {
      onAction('VOTE_SKIP', { itemId });
    },
    [onAction]
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card data-testid="playlist-card" sx={{ mb: 1 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Playlist ({items.length})
          </Typography>
          {isHost && (
            <IconButton
              size="small"
              onClick={() => setAddDialogOpen(true)}
              data-testid="add-to-playlist"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No videos in queue.{' '}
            {isHost ? 'Add a video to get started.' : 'Waiting for host to add videos.'}
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item, index) => (
              <ListItem
                key={item.id}
                sx={{
                  px: 0.5,
                  borderRadius: 1,
                  bgcolor: index === currentIndex ? 'action.hover' : 'transparent',
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleSkip(item.id)}
                      title="Vote to skip"
                    >
                      <SkipNextIcon fontSize="small" />
                    </IconButton>
                    {isHost && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === items.length - 1}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemove(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                }
              >
                {index === currentIndex && (
                  <PlayIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                )}
                <ListItemText
                  primary={item.title || item.url}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {item.duration ? (
                        <Chip
                          label={formatDuration(item.duration)}
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        by {item.addedBy}
                      </Typography>
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* Add Video Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Video to Playlist</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Video URL"
              fullWidth
              variant="outlined"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              sx={{ mb: 1 }}
            />
            <TextField
              margin="dense"
              label="Title (optional)"
              fullWidth
              variant="outlined"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} variant="contained" disabled={!newUrl.trim()}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PlaylistCard;
