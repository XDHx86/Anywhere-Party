/**
 * Monitoring Dashboard Component
 * Displays extension health metrics, runtime bugs, and user feedback
 */

import React, { useState, useEffect } from 'react';
import { MaterialCard } from '../components/cards/MaterialCard';
import { MaterialIcon } from '../components/cards/MaterialIcon';
import {
  HealthMetrics,
  RuntimeBugEvent,
  UserFeedback,
} from '../../@core/monitoring/monitoring-service';

interface MonitoringDashboardProps {
  className?: string;
}

interface DashboardData {
  healthMetrics: HealthMetrics;
  recentBugs: RuntimeBugEvent[];
  recentFeedback: UserFeedback[];
  alerts: { severity: string; message: string; type: string; timestamp: number }[];
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className = '' }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request monitoring data from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MONITORING_DATA',
      });

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load monitoring data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_MONITORING_DATA',
      });

      if (response.success) {
        // Create and download JSON file
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      } else {
        setError(response.error || 'Failed to export data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const getHealthStatusColor = (value: number, threshold: number = 90): string => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold - 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-red-500 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading && !data) {
    return (
      <div className={`monitoring-dashboard ${className}`}>
        <MaterialCard className="p-6">
          <div className="flex items-center justify-center">
            <MaterialIcon name="refresh" className="animate-spin mr-2" />
            <span>Loading monitoring data...</span>
          </div>
        </MaterialCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`monitoring-dashboard ${className}`}>
        <MaterialCard className="p-6">
          <div className="flex items-center text-red-600">
            <MaterialIcon name="error" className="mr-2" />
            <span>Error: {error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </MaterialCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`monitoring-dashboard ${className}`}>
        <MaterialCard className="p-6">
          <div className="text-center text-gray-500">No monitoring data available</div>
        </MaterialCard>
      </div>
    );
  }

  return (
    <div className={`monitoring-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Extension Health Dashboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={loading}
          >
            <MaterialIcon name="refresh" className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
          >
            <MaterialIcon name="download" className="mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Health Metrics Overview */}
      <MaterialCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MaterialIcon name="info" className="mr-2" />
          Health Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getHealthStatusColor(data.healthMetrics.iconLoadSuccessRate)}`}
            >
              {data.healthMetrics.iconLoadSuccessRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Icon Load Success</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getHealthStatusColor(data.healthMetrics.apiCallSuccessRate)}`}
            >
              {data.healthMetrics.apiCallSuccessRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">API Call Success</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getHealthStatusColor(data.healthMetrics.roomCreationSuccessRate)}`}
            >
              {data.healthMetrics.roomCreationSuccessRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Room Creation Success</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getHealthStatusColor(100 - data.healthMetrics.errorRate, 95)}`}
            >
              {data.healthMetrics.errorRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              Average Response Time: {formatDuration(data.healthMetrics.averageResponseTime)}
            </span>
            <span>Last Updated: {formatTimestamp(data.healthMetrics.timestamp)}</span>
          </div>
        </div>
      </MaterialCard>

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <MaterialCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-600">
            <MaterialIcon name="warning" className="mr-2" />
            Active Alerts ({data.alerts.length})
          </h3>
          <div className="space-y-3">
            {data.alerts.slice(0, 5).map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-sm opacity-75">{alert.type}</div>
                  </div>
                  <div className="text-xs opacity-75">{formatTimestamp(alert.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </MaterialCard>
      )}

      {/* Recent Runtime Bugs */}
      <MaterialCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MaterialIcon name="error" className="mr-2" />
          Recent Runtime Bugs ({data.recentBugs.length})
        </h3>
        {data.recentBugs.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No recent runtime bugs detected</div>
        ) : (
          <div className="space-y-3">
            {data.recentBugs.slice(0, 10).map((bug, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(bug.severity)}`}
                    >
                      {bug.severity}
                    </span>
                    <span className="font-medium">{bug.bugType.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTimestamp(bug.timestamp)}</span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <strong>{bug.component}</strong> - {bug.operation}
                </div>
                <div className="text-sm text-gray-600 mb-2">{bug.errorMessage}</div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Impact: {bug.userImpact}</span>
                  {bug.recoveryAction && <span>Recovery: {bug.recoveryAction}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </MaterialCard>

      {/* Recent User Feedback */}
      <MaterialCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MaterialIcon name="chat" className="mr-2" />
          Recent User Feedback ({data.recentFeedback.length})
        </h3>
        {data.recentFeedback.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No recent user feedback</div>
        ) : (
          <div className="space-y-3">
            {data.recentFeedback.slice(0, 5).map((feedback, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(feedback.severity)}`}
                    >
                      {feedback.severity}
                    </span>
                    <span className="font-medium">{feedback.type.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-gray-500">({feedback.category})</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(feedback.timestamp)}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">{feedback.title}</div>
                <div className="text-sm text-gray-600 mb-2">
                  {feedback.description.length > 150
                    ? `${feedback.description.substring(0, 150)}...`
                    : feedback.description}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Status: {feedback.status}</span>
                  <span>ID: {feedback.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </MaterialCard>
    </div>
  );
};

export default MonitoringDashboard;
