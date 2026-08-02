/**
 * Monitoring Card Component for Options Page
 * Allows users to view monitoring status and submit feedback
 */

import React, { useState, useEffect } from 'react';
import { MaterialCard } from '../../components/cards/MaterialCard';
import { MaterialIcon } from '../../components/cards/MaterialIcon';
import { UserFeedbackForm } from '../../monitoring/UserFeedbackForm';
import { MonitoringDashboard } from '../../monitoring/MonitoringDashboard';

interface MonitoringCardProps {
  className?: string;
}

export const MonitoringCard: React.FC<MonitoringCardProps> = ({ className = '' }) => {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [healthStatus, setHealthStatus] = useState<'good' | 'warning' | 'error'>('good');

  useEffect(() => {
    loadMonitoringStatus();
  }, []);

  const loadMonitoringStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MONITORING_DATA',
      });

      if (response.success) {
        const { healthMetrics } = response.data;

        // Determine overall health status
        const avgSuccessRate =
          (healthMetrics.iconLoadSuccessRate +
            healthMetrics.apiCallSuccessRate +
            healthMetrics.roomCreationSuccessRate +
            healthMetrics.statePersistenceSuccessRate +
            healthMetrics.videoDetectionSuccessRate) /
          5;

        if (avgSuccessRate >= 95) {
          setHealthStatus('good');
        } else if (avgSuccessRate >= 80) {
          setHealthStatus('warning');
        } else {
          setHealthStatus('error');
        }
      }
    } catch (error) {
      console.error('Failed to load monitoring status:', error);
      setHealthStatus('error');
    }
  };

  const toggleMonitoring = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SET_MONITORING_ENABLED',
        enabled: !monitoringEnabled,
      });

      if (response.success) {
        setMonitoringEnabled(!monitoringEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    }
  };

  const exportLogs = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_LOGS',
      });

      if (response.success) {
        // Create and download log file
        const dataStr = response.logs;
        const dataBlob = new Blob([dataStr], { type: 'application/x-ndjson' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `watchparty-logs-${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getHealthStatusColor = () => {
    switch (healthStatus) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = () => {
    switch (healthStatus) {
      case 'good':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getHealthStatusText = () => {
    switch (healthStatus) {
      case 'good':
        return 'All systems operational';
      case 'warning':
        return 'Some issues detected';
      case 'error':
        return 'Multiple issues detected';
      default:
        return 'Status unknown';
    }
  };

  if (showDashboard) {
    return (
      <div className={`monitoring-card ${className}`}>
        <div className="mb-4">
          <button
            onClick={() => setShowDashboard(false)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <MaterialIcon name="arrow-left" className="mr-2" />
            Back to Monitoring Settings
          </button>
        </div>
        <MonitoringDashboard />
      </div>
    );
  }

  if (showFeedbackForm) {
    return (
      <div className={`monitoring-card ${className}`}>
        <UserFeedbackForm
          onSubmit={(feedbackId) => {
            setShowFeedbackForm(false);
            // Could show a success message here
          }}
          onCancel={() => setShowFeedbackForm(false)}
        />
      </div>
    );
  }

  return (
    <MaterialCard className={`monitoring-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <MaterialIcon name="info" className="mr-2" />
          Monitoring & Feedback
        </h3>
        <div className={`flex items-center ${getHealthStatusColor()}`}>
          <MaterialIcon name={getHealthStatusIcon()} className="mr-2" />
          <span className="text-sm font-medium">{getHealthStatusText()}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Monitoring Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium">Error Monitoring</div>
            <div className="text-sm text-gray-600">
              Track runtime bugs and performance issues to improve the extension
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={monitoringEnabled}
              onChange={toggleMonitoring}
              className="mr-2"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <MaterialIcon name="chat" className="mr-2" />
            Submit Feedback
          </button>

          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <MaterialIcon name="info" className="mr-2" />
            View Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={exportLogs}
            className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <MaterialIcon name="download" className="mr-2" />
            Export Logs
          </button>

          <button
            onClick={loadMonitoringStatus}
            className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <MaterialIcon name="refresh" className="mr-2" />
            Refresh Status
          </button>
        </div>

        {/* Information */}
        <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
          <div className="font-medium mb-1">Privacy Notice:</div>
          <div>
            Monitoring data is stored locally and includes error information to help improve the
            extension. No personal data is collected. You can disable monitoring at any time.
          </div>
        </div>
      </div>
    </MaterialCard>
  );
};

export default MonitoringCard;
