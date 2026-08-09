/**
 * Material Design 3 Tabs Component
 * Implements Material Design 3 tab navigation with smooth transitions
 */

import React, { useCallback } from 'react';
import { Tabs, Tab, TabsProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { createTransition } from '../../animations/material-animations';

export interface MaterialTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'standard' | 'scrollable';
  className?: string;
  'data-testid'?: string;
}

// Styled tabs component with Material Design 3 styling
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  minHeight: '48px',

  '& .MuiTabs-indicator': {
    height: '3px',
    borderRadius: '3px 3px 0 0',
    backgroundColor: theme.palette.primary.main,
    transition: createTransition(['left', 'width'], 'medium2', 'standard'),
  },

  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(1),
  },
}));

// Styled tab component
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  minHeight: '48px',
  padding: '12px 16px',
  color: theme.palette.text.secondary,
  borderRadius: '12px 12px 0 0',
  transition: createTransition(['color', 'background-color'], 'short4', 'standard'),

  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main + '08', // 8% opacity
  },

  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 600,
  },

  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  '&.Mui-disabled': {
    opacity: 0.38,
    color: theme.palette.text.disabled,
  },

  // Icon styling
  '& .MuiTab-iconWrapper': {
    marginBottom: '4px',
    fontSize: '1.25rem',
  },
}));

export const MaterialTabs: React.FC<MaterialTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'standard',
  className,
  // 'data-testid': testId, // unused
}) => {
  // const { theme } = useMaterialTheme(); // unused

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      onTabChange(newValue);
    },
    [onTabChange]
  );

  const tabsProps: TabsProps = {
    value: activeTab,
    onChange: handleTabChange,
    variant: variant === 'scrollable' ? 'scrollable' : 'standard',
    scrollButtons: variant === 'scrollable' ? 'auto' : false,
    allowScrollButtonsMobile: variant === 'scrollable',
    className,
  };

  return (
    <StyledTabs {...tabsProps}>
      {tabs.map((tab) => (
        <StyledTab
          key={tab.id}
          value={tab.id}
          label={tab.label}
          icon={tab.icon as React.ReactElement}
          disabled={tab.disabled}
          iconPosition="top"
          aria-label={`${tab.label} tab`}
        />
      ))}
    </StyledTabs>
  );
};

export default MaterialTabs;
