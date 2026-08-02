/**
 * Chat Integration Component
 * Connects Material Design 3 chat interface with real-time messaging system
 * Requirements: 27.5
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { integrationService } from '../../services/integration-service';
import { useResponsiveDesign } from '../../hooks/useResponsiveDesign';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  reactions: Reaction[];
  type: 'sent' | 'received';
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ChatIntegrationProps {
  roomId?: string;
  userId?: string;
  userName?: string;
  onMessageSend?: (message: string) => void;
  onReactionAdd?: (messageId: string, emoji: string) => void;
  className?: string;
}

export const ChatIntegration: React.FC<ChatIntegrationProps> = ({
  roomId,
  userId,
  userName,
  onMessageSend,
  onReactionAdd,
  className,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const responsive = useResponsiveDesign();

  // Connect to chat system on mount
  useEffect(() => {
    const connectChat = async () => {
      try {
        setIsLoading(true);
        const connected = await integrationService.connectChatInterface();
        setIsConnected(connected);

        if (connected && roomId) {
          // Join chat room
          await integrationService.sendMessage('CHAT_JOIN_ROOM', {
            roomId,
            userId,
            userName,
          });

          // Load chat history
          const historyResponse = await integrationService.sendMessage('CHAT_GET_HISTORY', {
            roomId,
          });

          if (historyResponse?.success && historyResponse.messages) {
            setMessages(historyResponse.messages);
          }
        }
      } catch (error) {
        console.error('Failed to connect to chat system:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    connectChat();
  }, [roomId, userId, userName]);

  // Setup message listeners
  useEffect(() => {
    const handleChatMessage = (message: any) => {
      if (message.roomId === roomId) {
        const chatMessage: ChatMessage = {
          id: message.id,
          userId: message.userId,
          userName: message.userName,
          content: message.content,
          timestamp: new Date(message.timestamp),
          reactions: message.reactions || [],
          type: message.type || 'text',
        };

        setMessages((prev) => [...prev, chatMessage]);
      }
    };

    const handleReactionUpdate = (message: any) => {
      if (message.roomId === roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message.messageId ? { ...msg, reactions: message.reactions } : msg
          )
        );
      }
    };

    const handleChatHistory = (message: any) => {
      if (message.roomId === roomId && message.messages) {
        setMessages(message.messages);
      }
    };

    // Register message handlers
    integrationService.registerMessageHandler('CHAT_MESSAGE', handleChatMessage);
    integrationService.registerMessageHandler('CHAT_REACTION_UPDATE', handleReactionUpdate);
    integrationService.registerMessageHandler('CHAT_HISTORY', handleChatHistory);

    return () => {
      integrationService.unregisterMessageHandler('CHAT_MESSAGE');
      integrationService.unregisterMessageHandler('CHAT_REACTION_UPDATE');
      integrationService.unregisterMessageHandler('CHAT_HISTORY');
    };
  }, [roomId]);

  // Handle sending messages
  const handleMessageSend = useCallback(
    async (content: string) => {
      if (!isConnected || !roomId || !userId || !content.trim()) {
        return;
      }

      try {
        const response = await integrationService.sendMessage('CHAT_SEND_MESSAGE', {
          roomId,
          userId,
          userName,
          content: content.trim(),
          type: 'text',
        });

        if (response?.success) {
          // Message will be added via the message listener
          onMessageSend?.(content);
        } else {
          console.error('Failed to send message:', response?.error);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    [isConnected, roomId, userId, userName, onMessageSend]
  );

  // Handle adding reactions
  const handleReactionAdd = useCallback(
    async (messageId: string, emoji: string) => {
      if (!isConnected || !roomId || !userId) {
        return;
      }

      try {
        const response = await integrationService.sendMessage('CHAT_ADD_REACTION', {
          roomId,
          messageId,
          userId,
          userName,
          emoji,
        });

        if (response?.success) {
          // Reaction will be updated via the reaction listener
          onReactionAdd?.(messageId, emoji);
        } else {
          console.error('Failed to add reaction:', response?.error);
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    },
    [isConnected, roomId, userId, userName, onReactionAdd]
  );

  // Handle removing reactions
  const handleReactionRemove = useCallback(
    async (messageId: string, reactionId: string) => {
      if (!isConnected || !roomId || !userId) {
        return;
      }

      try {
        await integrationService.sendMessage('CHAT_REMOVE_REACTION', {
          roomId,
          messageId,
          reactionId,
          userId,
        });
      } catch (error) {
        console.error('Error removing reaction:', error);
      }
    },
    [isConnected, roomId, userId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomId && userId) {
        integrationService
          .sendMessage('CHAT_LEAVE_ROOM', {
            roomId,
            userId,
          })
          .catch(console.error);
      }
    };
  }, [roomId, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64 text-center p-4">
        <div>
          <p className="text-gray-500 mb-2">Chat system unavailable</p>
          <button onClick={() => window.location.reload()} className="text-primary hover:underline">
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatSidebar
      messages={messages}
      currentUserId={userId || ''}
      onSendMessage={handleMessageSend}
      onReaction={handleReactionAdd}
      onRemoveReaction={handleReactionRemove}
      isOpen={true}
      className={className}
    />
  );
};

export default ChatIntegration;
