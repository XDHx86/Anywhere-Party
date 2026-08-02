/**
 * User Feedback Form Component
 * Allows users to submit bug reports, feature requests, and general feedback
 */

import React, { useState } from 'react';
import { MaterialCard } from '../components/cards/MaterialCard';
import { MaterialIcon } from '../components/cards/MaterialIcon';

interface UserFeedbackFormProps {
  onSubmit?: (feedbackId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface FeedbackFormData {
  type: 'bug_report' | 'feature_request' | 'general_feedback';
  severity: 'low' | 'medium' | 'high';
  category: 'ui' | 'functionality' | 'performance' | 'compatibility' | 'other';
  title: string;
  description: string;
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  attachments: {
    logs: boolean;
    screenshot: boolean;
    config: boolean;
  };
  tags: string[];
}

export const UserFeedbackForm: React.FC<UserFeedbackFormProps> = ({
  onSubmit,
  onCancel,
  className = '',
}) => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'bug_report',
    severity: 'medium',
    category: 'functionality',
    title: '',
    description: '',
    steps: [''],
    expectedBehavior: '',
    actualBehavior: '',
    attachments: {
      logs: false,
      screenshot: false,
      config: false,
    },
    tags: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: keyof FeedbackFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData((prev) => ({
      ...prev,
      steps: newSteps,
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        steps: newSteps,
      }));
    }
  };

  const handleAttachmentChange = (type: keyof typeof formData.attachments, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        [type]: checked,
      },
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    setFormData((prev) => ({
      ...prev,
      tags,
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (!formData.description.trim()) {
      return 'Description is required';
    }
    if (formData.type === 'bug_report') {
      if (!formData.actualBehavior.trim()) {
        return 'Actual behavior is required for bug reports';
      }
      if (!formData.expectedBehavior.trim()) {
        return 'Expected behavior is required for bug reports';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Filter out empty steps
      const cleanedSteps = formData.steps.filter((step) => step.trim().length > 0);

      const response = await chrome.runtime.sendMessage({
        type: 'SUBMIT_USER_FEEDBACK',
        feedback: {
          ...formData,
          steps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
          userId: 'current_user', // Will be set by background script
        },
      });

      if (response.success) {
        setSuccess(`Feedback submitted successfully! ID: ${response.feedbackId}`);

        // Reset form
        setFormData({
          type: 'bug_report',
          severity: 'medium',
          category: 'functionality',
          title: '',
          description: '',
          steps: [''],
          expectedBehavior: '',
          actualBehavior: '',
          attachments: {
            logs: false,
            screenshot: false,
            config: false,
          },
          tags: [],
        });

        if (onSubmit) {
          onSubmit(response.feedbackId);
        }
      } else {
        setError(response.error || 'Failed to submit feedback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`user-feedback-form ${className}`}>
      <MaterialCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <MaterialIcon name="chat" className="mr-2" />
            Submit Feedback
          </h3>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <MaterialIcon name="close" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
            <MaterialIcon name="error" className="mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center">
            <MaterialIcon name="success" className="mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Type *</label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="bug_report">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="general_feedback">General Feedback</option>
            </select>
          </div>

          {/* Severity and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ui">User Interface</option>
                <option value="functionality">Functionality</option>
                <option value="performance">Performance</option>
                <option value="compatibility">Compatibility</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief summary of the issue or request"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the issue, request, or feedback"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={1000}
            />
          </div>

          {/* Steps to Reproduce (for bug reports) */}
          {formData.type === 'bug_report' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Steps to Reproduce
              </label>
              {formData.steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder="Describe this step"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formData.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <MaterialIcon name="close" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <MaterialIcon name="add" className="mr-1" />
                Add Step
              </button>
            </div>
          )}

          {/* Expected and Actual Behavior (for bug reports) */}
          {formData.type === 'bug_report' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Behavior *
                </label>
                <textarea
                  value={formData.expectedBehavior}
                  onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                  placeholder="What should happen?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Behavior *
                </label>
                <textarea
                  value={formData.actualBehavior}
                  onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                  placeholder="What actually happens?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include Attachments
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.attachments.logs}
                  onChange={(e) => handleAttachmentChange('logs', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include extension logs</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.attachments.config}
                  onChange={(e) => handleAttachmentChange('config', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include configuration (API keys will be excluded)</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (optional)</label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="Enter tags separated by commas (e.g., chrome, popup, sync)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Tags help categorize and organize feedback</p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <>
                  <MaterialIcon name="refresh" className="animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <MaterialIcon name="send" className="mr-2" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </MaterialCard>
    </div>
  );
};

export default UserFeedbackForm;
