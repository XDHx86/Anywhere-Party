/**
 * API Keys Settings Card Component
 * Secure input fields for external service API keys
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Link,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialButton } from '../../components/cards/MaterialButton';
import { MaterialIcon } from '../../components/cards/MaterialIcon';
import { MaterialInput } from '../../components/cards/MaterialInput';
import {
  getAPIKeyManager,
  APIKeyConfig,
  APIKeyValidationResult,
} from '../../../@core/api-keys/api-key-manager';
import type { ApiKeysSettings } from '../services/settings-service';

const StyledCard = styled(MaterialCard, {
  shouldForwardProp: (prop) =>
    prop !== 'materialVariant' && prop !== 'rounded' && prop !== 'padding',
})(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const ServiceItem = styled(ListItem, {
  shouldForwardProp: (_prop) => true,
})(({ theme }) => ({
  borderRadius: '8px',
  marginBottom: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
}));

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: 'valid' | 'invalid' | 'unknown' | 'testing' }>(({ theme, status }) => ({
  fontWeight: 500,
  ...(status === 'valid' && {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
  }),
  ...(status === 'invalid' && {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
  }),
  ...(status === 'testing' && {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark,
  }),
  ...(status === 'unknown' && {
    backgroundColor: theme.palette.grey[200],
    color: theme.palette.grey[700],
  }),
}));

interface APIKeyInfo extends Omit<APIKeyConfig, 'key'> {
  hasKey: boolean;
}

interface APIKeysCardProps {
  data: ApiKeysSettings;
  onChange: (field: string, value: string) => void;
}

// Supported API services
const API_SERVICES = [
  {
    id: 'opensubtitles',
    name: 'OpenSubtitles',
    description: 'Subtitle search and download service',
    website: 'https://www.opensubtitles.com/api',
    instructions: 'Sign up for a free account and generate an API key in your profile settings.',
    required: false,
  },
  {
    id: 'tmdb',
    name: 'The Movie Database (TMDB)',
    description: 'Movie and TV show metadata service',
    website: 'https://www.themoviedb.org/settings/api',
    instructions: 'Create a free account and request an API key for personal use.',
    required: false,
  },
];

export const APIKeysCard: React.FC<APIKeysCardProps> = ({ data: _data, onChange: _onChange }) => {
  const [apiKeyInfos, setApiKeyInfos] = useState<Record<string, APIKeyInfo>>({});
  const [validationResults, setValidationResults] = useState<
    Record<string, APIKeyValidationResult>
  >({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [keyInput, setKeyInput] = useState('');
  const [keyInputError, setKeyInputError] = useState('');

  const apiKeyManager = getAPIKeyManager();

  useEffect(() => {
    loadAPIKeyInfos();
  }, []);

  const loadAPIKeyInfos = async () => {
    const infos: Record<string, APIKeyInfo> = {};

    for (const service of API_SERVICES) {
      try {
        const info = await apiKeyManager.getAPIKeyInfo(service.id);
        const hasKey = await apiKeyManager.hasAPIKey(service.id);

        infos[service.id] = {
          service: service.id,
          encrypted: info?.encrypted ?? false,
          createdAt: info?.createdAt ?? new Date(),
          lastUsed: info?.lastUsed,
          isValid: info?.isValid,
          hasKey,
        };
      } catch (error) {
        console.error(`Failed to load API key info for ${service.id}:`, error);
        infos[service.id] = {
          service: service.id,
          encrypted: false,
          createdAt: new Date(),
          hasKey: false,
        };
      }
    }

    setApiKeyInfos(infos);
  };

  const handleAddKey = (serviceId: string) => {
    setSelectedService(serviceId);
    setKeyInput('');
    setKeyInputError('');
    setDialogOpen(true);
  };

  const handleRemoveKey = async (serviceId: string) => {
    if (!confirm(`Are you sure you want to remove the API key for ${getServiceName(serviceId)}?`)) {
      return;
    }

    try {
      await apiKeyManager.removeAPIKey(serviceId);
      await loadAPIKeyInfos();

      // Clear validation result
      setValidationResults((prev) => {
        const updated = { ...prev };
        delete updated[serviceId];
        return updated;
      });
    } catch (error) {
      console.error(`Failed to remove API key for ${serviceId}:`, error);
    }
  };

  const handleTestKey = async (serviceId: string) => {
    setLoading((prev) => ({ ...prev, [serviceId]: true }));

    try {
      const result = await apiKeyManager.testAPIConnection(serviceId);
      setValidationResults((prev) => ({ ...prev, [serviceId]: result }));

      // Update the API key info with validation status
      await loadAPIKeyInfos();
    } catch (error) {
      console.error(`Failed to test API key for ${serviceId}:`, error);
      setValidationResults((prev) => ({
        ...prev,
        [serviceId]: {
          isValid: false,
          error: 'Test failed',
          service: serviceId,
          testedAt: new Date(),
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) {
      setKeyInputError('API key is required');
      return;
    }

    setKeyInputError('');
    setLoading((prev) => ({ ...prev, [selectedService]: true }));

    try {
      // Validate the key first
      const isValid = await apiKeyManager.validateAPIKey(selectedService, keyInput.trim());

      if (isValid) {
        // Store the key
        await apiKeyManager.storeAPIKey(selectedService, keyInput.trim());
        await loadAPIKeyInfos();

        // Test the connection
        await handleTestKey(selectedService);

        setDialogOpen(false);
        setKeyInput('');
      } else {
        setKeyInputError('Invalid API key. Please check your key and try again.');
      }
    } catch (error) {
      console.error(`Failed to save API key for ${selectedService}:`, error);
      setKeyInputError('Failed to save API key. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, [selectedService]: false }));
    }
  };

  const getServiceName = (serviceId: string): string => {
    return API_SERVICES.find((s) => s.id === serviceId)?.name ?? serviceId;
  };

  const getStatusChip = (serviceId: string) => {
    const info = apiKeyInfos[serviceId];
    const validation = validationResults[serviceId];
    const isLoading = loading[serviceId];

    if (isLoading) {
      return <StatusChip status="testing" label="Testing..." size="small" />;
    }

    if (!info?.hasKey) {
      return <StatusChip status="unknown" label="No Key" size="small" />;
    }

    if (validation) {
      return (
        <StatusChip
          status={validation.isValid ? 'valid' : 'invalid'}
          label={validation.isValid ? 'Valid' : 'Invalid'}
          size="small"
        />
      );
    }

    if (info.isValid !== undefined) {
      return (
        <StatusChip
          status={info.isValid ? 'valid' : 'invalid'}
          label={info.isValid ? 'Valid' : 'Invalid'}
          size="small"
        />
      );
    }

    return <StatusChip status="unknown" label="Untested" size="small" />;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const selectedServiceInfo = API_SERVICES.find((s) => s.id === selectedService);

  return (
    <StyledCard>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <MaterialIcon name="key" color="primary" />
          <Typography variant="h6">API Keys</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            API keys are stored securely in your browser's local storage with encryption. These keys
            are never shared with our servers and remain on your device.
          </Typography>
        </Alert>

        <List>
          {API_SERVICES.map((service, index) => {
            const info = apiKeyInfos[service.id];
            const validation = validationResults[service.id];

            return (
              <React.Fragment key={service.id}>
                <ServiceItem>
                  <ListItemIcon>
                    <MaterialIcon name="api" color="primary" />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {service.name}
                        </Typography>
                        {getStatusChip(service.id)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {service.description}
                        </Typography>
                        {info?.hasKey && (
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Added: {formatDate(info.createdAt)}
                            </Typography>
                            {info.lastUsed && (
                              <Typography variant="caption" color="text.secondary">
                                Last used: {formatDate(info.lastUsed)}
                              </Typography>
                            )}
                          </Box>
                        )}
                        {validation && !validation.isValid && validation.error && (
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            Error: {validation.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {info?.hasKey ? (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleTestKey(service.id)}
                            disabled={loading[service.id]}
                            title="Test API key"
                          >
                            <MaterialIcon name="refresh" size="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveKey(service.id)}
                            color="error"
                            title="Remove API key"
                          >
                            <MaterialIcon name="delete" size="small" />
                          </IconButton>
                        </>
                      ) : (
                        <MaterialButton
                          variant="outlined"
                          size="small"
                          onClick={() => handleAddKey(service.id)}
                          startIcon={<MaterialIcon name="add" size="small" />}
                        >
                          Add Key
                        </MaterialButton>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ServiceItem>

                {index < API_SERVICES.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            );
          })}
        </List>

        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<MaterialIcon name="expand_more" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MaterialIcon name="help" color="primary" size="small" />
              <Typography variant="subtitle2">How to get API keys</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {API_SERVICES.map((service) => (
                <Box key={service.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {service.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {service.instructions}
                  </Typography>
                  <Link
                    href={service.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                  >
                    Get API key →
                  </Link>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Add/Edit API Key Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MaterialIcon name="key" color="primary" />
            <Typography variant="h6">Add API Key - {selectedServiceInfo?.name}</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedServiceInfo?.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedServiceInfo?.instructions}
            </Typography>
            {selectedServiceInfo?.website && (
              <Link
                href={selectedServiceInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
              >
                Get API key →
              </Link>
            )}
          </Box>

          <MaterialInput
            label="API Key"
            type="password"
            value={keyInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInput(e.target.value)}
            error={!!keyInputError}
            helperText={keyInputError || 'Your API key will be stored securely on your device'}
            fullWidth
            autoFocus
            placeholder="Enter your API key..."
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <MaterialButton
            variant="outlined"
            onClick={() => setDialogOpen(false)}
            disabled={loading[selectedService]}
          >
            Cancel
          </MaterialButton>

          <MaterialButton
            variant="filled"
            onClick={handleSaveKey}
            loading={loading[selectedService]}
            startIcon={<MaterialIcon name="save" size="small" />}
          >
            Save & Test
          </MaterialButton>
        </DialogActions>
      </Dialog>
    </StyledCard>
  );
};

export default APIKeysCard;
