/**
 * SchedulingCard — MD3 scheduling section for the Options page.
 * Create and manage scheduled watch party sessions with ICS calendar invites.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { downloadICS } from '@core/scheduling';

interface ScheduledSession {
  id: string;
  title: string;
  scheduledTime: number;
  videoUrl?: string;
  hostId: string;
  reminders: Array<{ minutesBefore: number }>;
  description?: string;
}

interface SchedulingCardProps {
  onNotification?: (message: string, severity: 'success' | 'error' | 'info') => void;
}

export const SchedulingCard: React.FC<SchedulingCardProps> = ({ onNotification }) => {
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDateTime, setFormDateTime] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReminder, setFormReminder] = useState('15');
  const [formRecurrence, setFormRecurrence] = useState('NONE');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SCHEDULED_SESSIONS' }, (response) => {
      if (response?.success) {
        setSessions(response.sessions || []);
      }
    });
  }, []);

  const handleCreate = useCallback(() => {
    if (!formTitle.trim() || !formDateTime) return;

    const scheduledTime = new Date(formDateTime).getTime();
    if (isNaN(scheduledTime) || scheduledTime <= Date.now()) {
      onNotification?.('Please select a future date and time', 'error');
      return;
    }

    const session: ScheduledSession = {
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: formTitle.trim(),
      scheduledTime,
      videoUrl: formVideoUrl.trim() || undefined,
      hostId: 'current-user',
      reminders: [{ minutesBefore: parseInt(formReminder, 10) || 15 }],
      description: formDescription.trim() || undefined,
    };

    chrome.runtime.sendMessage({ type: 'SCHEDULE_SESSION_UI', session }, (response) => {
      if (response?.success) {
        setSessions((prev) => [...prev, session]);
        onNotification?.('Session scheduled successfully', 'success');
      } else {
        onNotification?.('Failed to schedule session', 'error');
      }
    });

    setDialogOpen(false);
    setFormTitle('');
    setFormDateTime('');
    setFormVideoUrl('');
    setFormDescription('');
    setFormReminder('15');
    setFormRecurrence('NONE');
  }, [formTitle, formDateTime, formVideoUrl, formDescription, formReminder, formRecurrence, onNotification]);

  const handleCancel = useCallback(
    (sessionId: string) => {
      chrome.runtime.sendMessage({ type: 'CANCEL_SESSION_UI', sessionId }, (response) => {
        if (response?.success) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          onNotification?.('Session cancelled', 'info');
        }
      });
    },
    [onNotification]
  );

  const handleDownloadICS = useCallback((session: ScheduledSession) => {
    downloadICS(session as any);
  }, []);

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Past';
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h`;
    const mins = Math.floor(diff / 60000);
    return `in ${mins}m`;
  };

  return (
    <Card data-testid="scheduling-card" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Scheduled Sessions
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setDialogOpen(true)}
            data-testid="schedule-new-session"
          >
            Schedule
          </Button>
        </Box>

        {sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No scheduled sessions. Click "Schedule" to plan a watch party.
          </Typography>
        ) : (
          <List dense disablePadding>
            {sessions.map((session) => (
              <ListItem
                key={session.id}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: session.scheduledTime > Date.now() ? 'action.hover' : 'transparent',
                  opacity: session.scheduledTime <= Date.now() ? 0.6 : 1,
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadICS(session)}
                      title="Download calendar invite"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleCancel(session.id)}
                      title="Cancel session"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={session.title}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="caption" component="span">
                        📅 {formatDateTime(session.scheduledTime)}
                      </Typography>
                      <Chip
                        label={getTimeUntil(session.scheduledTime)}
                        size="small"
                        variant="outlined"
                        color={session.scheduledTime > Date.now() ? 'primary' : 'default'}
                      />
                      {session.reminders.length > 0 && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          ⏰ {session.reminders[0].minutesBefore}min before
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* New Session Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="primary" />
              Schedule Watch Party
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Session Title"
              fullWidth
              variant="outlined"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Friday Movie Night"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Date & Time"
              type="datetime-local"
              fullWidth
              variant="outlined"
              value={formDateTime}
              onChange={(e) => setFormDateTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Video URL (optional)"
              fullWidth
              variant="outlined"
              value={formVideoUrl}
              onChange={(e) => setFormVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description (optional)"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Reminder</InputLabel>
                <Select
                  value={formReminder}
                  onChange={(e) => setFormReminder(e.target.value)}
                  label="Reminder"
                >
                  <MenuItem value="5">5 minutes before</MenuItem>
                  <MenuItem value="15">15 minutes before</MenuItem>
                  <MenuItem value="30">30 minutes before</MenuItem>
                  <MenuItem value="60">1 hour before</MenuItem>
                  <MenuItem value="1440">1 day before</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Recurrence</InputLabel>
                <Select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value)}
                  label="Recurrence"
                >
                  <MenuItem value="NONE">No repeat</MenuItem>
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained" disabled={!formTitle.trim() || !formDateTime}>
              Schedule
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SchedulingCard;
