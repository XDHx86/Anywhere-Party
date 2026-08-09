/**
 * Import Preview Modal Component
 * Shows configuration diff and validation before applying changes
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialButton } from '../../components/cards/MaterialButton';
import { MaterialIcon } from '../../components/cards/MaterialIcon';
import { ValidationResult } from '../utils/validation';

export interface ConfigDiff {
  added: Record<string, unknown>;
  modified: Record<string, { old: unknown; new: unknown }>;
  removed: string[];
  summary: {
    totalChanges: number;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
  };
}

export interface ImportPreviewModalProps {
  open: boolean;
  configDiff: ConfigDiff | null;
  validationResult: ValidationResult | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const StyledDialog = styled(Dialog, {
  shouldForwardProp: (_prop) => true,
})(() => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    maxWidth: '800px',
    width: '90vw',
    maxHeight: '90vh',
  },
}));

const DiffContainer = styled(Paper, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px',
}));

const ChangeItem = styled(Box, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  wordBreak: 'break-all',
}));

const AddedItem = styled(ChangeItem, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  backgroundColor: theme.palette.success.light + '20',
  borderLeft: `4px solid ${theme.palette.success.main}`,
}));

const ModifiedItem = styled(ChangeItem, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  backgroundColor: theme.palette.warning.light + '20',
  borderLeft: `4px solid ${theme.palette.warning.main}`,
}));

const RemovedItem = styled(ChangeItem, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  backgroundColor: theme.palette.error.light + '20',
  borderLeft: `4px solid ${theme.palette.error.main}`,
}));

const SummaryChip = styled(Chip, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  margin: theme.spacing(0.5),
  fontWeight: 500,
}));

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  open,
  configDiff,
  validationResult,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);

  useEffect(() => {
    if (open && configDiff) {
      // Auto-expand sections with changes
      const sectionsToExpand = ['summary'];
      if (configDiff.summary.addedCount > 0) sectionsToExpand.push('added');
      if (configDiff.summary.modifiedCount > 0) sectionsToExpand.push('modified');
      if (configDiff.summary.removedCount > 0) sectionsToExpand.push('removed');
      if (validationResult?.errors.length || validationResult?.warnings.length) {
        sectionsToExpand.push('validation');
      }
      setExpandedSections(sectionsToExpand);
    }
  }, [open, configDiff, validationResult]);

  const handleSectionToggle = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderValidationErrors = () => {
    if (
      !validationResult ||
      (!validationResult.errors.length && !validationResult.warnings.length)
    ) {
      return null;
    }

    return (
      <Accordion
        expanded={expandedSections.includes('validation')}
        onChange={() => handleSectionToggle('validation')}
      >
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon
              name={validationResult.errors.length > 0 ? 'error' : 'warning'}
              color={validationResult.errors.length > 0 ? 'error' : 'primary'}
            />
            <Typography variant="h6">Validation Issues</Typography>
            <SummaryChip
              label={`${validationResult.errors.length + validationResult.warnings.length} issues`}
              color={validationResult.errors.length > 0 ? 'error' : 'warning'}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {validationResult.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error" gutterBottom>
                Errors (will prevent import):
              </Typography>
              <List dense>
                {validationResult.errors.map((error, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <MaterialIcon name="error" color="error" size="small" />
                    </ListItemIcon>
                    <ListItemText primary={error.field} secondary={error.message} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {validationResult.warnings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                Warnings (import will proceed):
              </Typography>
              <List dense>
                {validationResult.warnings.map((warning, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <MaterialIcon name="warning" color="primary" size="small" />
                    </ListItemIcon>
                    <ListItemText primary={warning.field} secondary={warning.message} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderSummary = () => {
    if (!configDiff) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('summary')}
        onChange={() => handleSectionToggle('summary')}
      >
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon name="summarize" color="primary" />
            <Typography variant="h6">Import Summary</Typography>
            <SummaryChip
              label={`${configDiff.summary.totalChanges} changes`}
              color="primary"
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {configDiff.summary.addedCount > 0 && (
              <SummaryChip
                icon={<MaterialIcon name="add" size="small" />}
                label={`${configDiff.summary.addedCount} added`}
                color="success"
                variant="outlined"
              />
            )}
            {configDiff.summary.modifiedCount > 0 && (
              <SummaryChip
                icon={<MaterialIcon name="edit" size="small" />}
                label={`${configDiff.summary.modifiedCount} modified`}
                color="warning"
                variant="outlined"
              />
            )}
            {configDiff.summary.removedCount > 0 && (
              <SummaryChip
                icon={<MaterialIcon name="remove" size="small" />}
                label={`${configDiff.summary.removedCount} removed`}
                color="error"
                variant="outlined"
              />
            )}
          </Box>

          <Alert severity="info" sx={{ mt: 1 }}>
            Review the changes below and click "Apply Changes" to import the configuration. This
            action cannot be undone.
          </Alert>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderAddedChanges = () => {
    if (!configDiff || Object.keys(configDiff.added).length === 0) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('added')}
        onChange={() => handleSectionToggle('added')}
      >
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon name="add" color="primary" />
            <Typography variant="h6">Added Settings</Typography>
            <SummaryChip label={configDiff.summary.addedCount} color="success" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <DiffContainer>
            {Object.entries(configDiff.added).map(([key, value]) => (
              <AddedItem key={key}>
                <Typography variant="body2" component="div">
                  <strong>+ {key}:</strong> {formatValue(value)}
                </Typography>
              </AddedItem>
            ))}
          </DiffContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderModifiedChanges = () => {
    if (!configDiff || Object.keys(configDiff.modified).length === 0) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('modified')}
        onChange={() => handleSectionToggle('modified')}
      >
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon name="edit" color="primary" />
            <Typography variant="h6">Modified Settings</Typography>
            <SummaryChip label={configDiff.summary.modifiedCount} color="warning" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <DiffContainer>
            {Object.entries(configDiff.modified).map(([key, { old, new: newValue }]) => (
              <ModifiedItem key={key}>
                <Typography variant="body2" component="div" gutterBottom>
                  <strong>~ {key}:</strong>
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body2" color="error.main" component="div">
                    - {formatValue(old)}
                  </Typography>
                  <Typography variant="body2" color="success.main" component="div">
                    + {formatValue(newValue)}
                  </Typography>
                </Box>
              </ModifiedItem>
            ))}
          </DiffContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderRemovedChanges = () => {
    if (!configDiff || configDiff.removed.length === 0) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('removed')}
        onChange={() => handleSectionToggle('removed')}
      >
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon name="remove" color="error" />
            <Typography variant="h6">Removed Settings</Typography>
            <SummaryChip label={configDiff.summary.removedCount} color="error" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <DiffContainer>
            {configDiff.removed.map((key) => (
              <RemovedItem key={key}>
                <Typography variant="body2" component="div">
                  <strong>- {key}</strong>
                </Typography>
              </RemovedItem>
            ))}
          </DiffContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;
  const canApply = configDiff && configDiff.summary.totalChanges > 0 && !hasErrors;

  return (
    <StyledDialog open={open} onClose={onCancel} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MaterialIcon name="preview" color="primary" />
          <Typography variant="h5" component="div">
            Import Configuration Preview
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!configDiff ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
            }}
          >
            <MaterialIcon name="refresh" size="large" />
          </Box>
        ) : (
          <Box>
            {renderValidationErrors()}
            {renderSummary()}
            {renderAddedChanges()}
            {renderModifiedChanges()}
            {renderRemovedChanges()}

            {configDiff.summary.totalChanges === 0 && (
              <Alert severity="info">
                No configuration changes detected. The imported configuration is identical to your
                current settings.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <MaterialButton
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          fullWidth={isMobile}
        >
          Cancel
        </MaterialButton>

        <MaterialButton
          variant="filled"
          onClick={onConfirm}
          disabled={!canApply || loading}
          loading={loading}
          startIcon={<MaterialIcon name="check" size="small" />}
          fullWidth={isMobile}
        >
          {hasErrors ? 'Cannot Apply (Errors)' : 'Apply Changes'}
        </MaterialButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default ImportPreviewModal;
