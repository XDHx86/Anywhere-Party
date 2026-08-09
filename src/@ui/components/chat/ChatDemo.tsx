/**
 * Chat Sidebar Demo Component
 * Example usage of the Material Design 3 chat components
 */

import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { ChatSidebar, ChatMessage, Reaction } from './index';
import { MaterialButton } from '../cards/MaterialButton';

// Mock data for demonstration
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Alice',
    content: 'Hey everyone! Ready to watch the movie?',
    timestamp: new Date(Date.now() - 300000),
    reactions: [
      {
        id: 'r1',
        emoji: '👍',
        userId: 'user2',
        userName: 'Bob',
        timestamp: new Date(Date.now() - 290000),
      },
    ],
    type: 'received',
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Bob',
    content: "Absolutely! I've been looking forward to this all week.",
    timestamp: new Date(Date.now() - 240000),
    reactions: [
      {
        id: 'r2',
        emoji: '🎉',
        userId: 'user1',
        userName: 'Alice',
        timestamp: new Date(Date.now() - 230000),
      },
    ],
    type: 'received',
  },
  {
    id: '3',
    userId: 'current',
    userName: 'You',
    content: "Same here! Let me know when you're ready to start.",
    timestamp: new Date(Date.now() - 180000),
    reactions: [],
    type: 'sent',
  },
];

export const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const currentUserId = 'current';

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: currentUserId,
        userName: 'You',
        content,
        timestamp: new Date(),
        reactions: [],
        type: 'sent',
      };

      setMessages((prev) => [...prev, newMessage]);
    },
    [currentUserId]
  );

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const newReaction: Reaction = {
        id: `reaction-${Date.now()}`,
        emoji,
        userId: currentUserId,
        userName: 'You',
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: [...msg.reactions, newReaction] } : msg
        )
      );
    },
    [currentUserId]
  );

  const handleRemoveReaction = useCallback((messageId: string, reactionId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, reactions: msg.reactions.filter((r) => r.id !== reactionId) }
          : msg
      )
    );
  }, []);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ p: 3 }}>
        <MaterialButton onClick={toggleChat} variant="filled" color="primary">
          {isChatOpen ? 'Close Chat' : 'Open Chat'}
        </MaterialButton>

        <Box sx={{ mt: 2 }}>
          <p>This is a demo of the Material Design 3 chat sidebar.</p>
          <p>Click the button above to toggle the chat sidebar.</p>
          <p>Features demonstrated:</p>
          <ul>
            <li>Material Design 3 card-style message bubbles</li>
            <li>Sent/received message variants with different styling</li>
            <li>Reaction buttons with Material icons</li>
            <li>Sticky input bar with Material input field</li>
            <li>Smooth animations and transitions</li>
            <li>Virtual scrolling for performance (with large message lists)</li>
            <li>Message batching and efficient rendering</li>
          </ul>
        </Box>
      </Box>

      <ChatSidebar
        messages={messages}
        onSendMessage={handleSendMessage}
        onReaction={handleReaction}
        onRemoveReaction={handleRemoveReaction}
        currentUserId={currentUserId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </Box>
  );
};

export default ChatDemo;
