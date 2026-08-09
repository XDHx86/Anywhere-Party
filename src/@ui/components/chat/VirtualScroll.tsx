/**
 * Virtual Scroll Component for Chat Performance
 * Implements virtual scrolling for large message histories
 */

import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { VirtualScrollProps } from './types';
import { createTransition } from '../../animations/material-animations';

const ScrollContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  scrollBehavior: 'smooth',

  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
    borderRadius: 3,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[400] : theme.palette.grey[600],
    borderRadius: 3,
    transition: createTransition(['background-color'], 'short2', 'standard'),

    '&:hover': {
      backgroundColor:
        theme.palette.mode === 'light' ? theme.palette.grey[500] : theme.palette.grey[500],
    },
  },
}));

const VirtualContent = styled(Box)({
  position: 'relative',
  width: '100%',
});

const ViewportContent = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
});

interface VirtualScrollState {
  scrollTop: number;
  containerHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: unknown[];
}

export const VirtualScroll = memo<VirtualScrollProps>(
  ({ items, itemHeight, containerHeight, renderItem, overscan = 5 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState<VirtualScrollState>({
      scrollTop: 0,
      containerHeight: 0,
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
    });

    // Calculate visible range
    const visibleRange = useMemo(() => {
      const { scrollTop, containerHeight: currentContainerHeight } = scrollState;
      const actualContainerHeight = currentContainerHeight || containerHeight;

      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(actualContainerHeight / itemHeight);
      const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

      return { startIndex, endIndex };
    }, [
      scrollState.scrollTop,
      scrollState.containerHeight,
      containerHeight,
      itemHeight,
      items.length,
      overscan,
    ]);

    // Get visible items
    const visibleItems = useMemo(() => {
      return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    }, [items, visibleRange.startIndex, visibleRange.endIndex]);

    // Handle scroll events
    const handleScroll = useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        const scrollTop = target.scrollTop;
        const containerHeight = target.clientHeight;

        setScrollState((prev) => ({
          ...prev,
          scrollTop,
          containerHeight,
          startIndex: visibleRange.startIndex,
          endIndex: visibleRange.endIndex,
          visibleItems,
        }));
      },
      [visibleRange.startIndex, visibleRange.endIndex, visibleItems]
    );

    // Update container height on mount and resize
    useEffect(() => {
      const updateContainerHeight = () => {
        if (containerRef.current) {
          const height = containerRef.current.clientHeight;
          setScrollState((prev) => ({
            ...prev,
            containerHeight: height,
          }));
        }
      };

      updateContainerHeight();

      const resizeObserver = new ResizeObserver(updateContainerHeight);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Auto-scroll to bottom for new messages
    const scrollToBottom = useCallback(() => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = containerRef.current;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - itemHeight * 2;

        if (isNearBottom) {
          containerRef.current.scrollTop = scrollHeight;
        }
      }
    }, [itemHeight]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }, [items.length, scrollToBottom]);

    const totalHeight = items.length * itemHeight;
    const offsetY = visibleRange.startIndex * itemHeight;

    return (
      <ScrollContainer
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: containerHeight }}
      >
        <VirtualContent style={{ height: totalHeight }}>
          <ViewportContent style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => {
              const actualIndex = visibleRange.startIndex + index;
              return (
                <Box key={item.id || actualIndex} style={{ height: itemHeight }}>
                  {renderItem(item, actualIndex)}
                </Box>
              );
            })}
          </ViewportContent>
        </VirtualContent>
      </ScrollContainer>
    );
  }
);

VirtualScroll.displayName = 'VirtualScroll';

export default VirtualScroll;
