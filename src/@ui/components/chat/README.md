# Material Design 3 Chat Components

This directory contains the complete Material Design 3 chat sidebar implementation for the Watch Party Extension.

## Components

### 🎯 Core Components

- **`ChatSidebar`** - Main chat interface with Material Design 3 styling
- **`MessageCard`** - Card-style message bubbles with elevation and rounded corners
- **`InputBar`** - Sticky input bar with Material input field and send button
- **`ReactionButtons`** - Material icon buttons for message reactions
- **`VirtualScroll`** - Performance optimization component for large message lists

### 📁 Files

- `ChatSidebar.tsx` - Main chat sidebar component
- `MessageCard.tsx` - Individual message display component
- `ReactionButtons.tsx` - Reaction system for messages
- `InputBar.tsx` - Message input interface
- `VirtualScroll.tsx` - Virtual scrolling for performance
- `types.ts` - TypeScript interfaces and types
- `index.ts` - Component exports
- `ChatDemo.tsx` - Demo/example usage component

## Features

### 🎨 Material Design 3 Styling

- **Elevation System**: Cards use Material Design 3 elevation levels (none, low, medium, high)
- **Color Palette**: Primary (#6200EE), Secondary (#03DAC6), Surface colors
- **Rounded Corners**: Consistent 12-16px border radius
- **Spacing System**: 8/16/24 dp spacing throughout
- **Typography**: Material Design 3 type scale with Roboto/Inter fonts
- **Animations**: Smooth transitions using Material motion principles

### 💬 Chat Features

- **Message Types**: Sent/received variants with different styling
- **Reactions**: 8 emoji reactions (❤️ 😂 😮 😢 👍 👎 🎉 🔥)
- **Timestamps**: Relative time display (now, 5m, 2h, etc.)
- **User Names**: Display sender information
- **Message History**: Persistent chat history with scrolling

### ⚡ Performance Optimizations

- **Virtual Scrolling**: Handles large message lists efficiently
- **Message Batching**: Shows last 50 messages by default
- **React.memo**: Prevents unnecessary re-renders
- **Efficient Keys**: Proper key management for React lists
- **Smooth Animations**: Optimized transitions and hover effects

### 🎯 Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Screen reader compatibility
- **Focus Management**: Proper tab order
- **High Contrast**: Works with accessibility themes

## Usage

### Basic Usage

```tsx
import { ChatSidebar } from '@ui/components/chat';

function MyComponent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      content,
      timestamp: new Date(),
      reactions: [],
      type: 'sent',
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    // Add reaction logic
  };

  const handleRemoveReaction = (messageId: string, reactionId: string) => {
    // Remove reaction logic
  };

  return (
    <ChatSidebar
      messages={messages}
      onSendMessage={handleSendMessage}
      onReaction={handleReaction}
      onRemoveReaction={handleRemoveReaction}
      currentUserId="current-user"
      isOpen={isChatOpen}
      onClose={() => setIsChatOpen(false)}
    />
  );
}
```

### Message Data Structure

```tsx
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  reactions: Reaction[];
  type: 'sent' | 'received';
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}
```

## Requirements Fulfilled

This implementation fulfills all requirements from the specification:

- **27.1** ✅ Card-style message bubbles with Material Design 3 styling
- **27.2** ✅ Sticky input bar with Material input field and send button  
- **27.3** ✅ Reaction buttons and display system with Material icons
- **27.4** ✅ Consistent Material Design 3 typography and color scheme
- **27.5** ✅ Performance optimizations and smooth animations

## Integration

The chat components are designed to integrate seamlessly with:

- **Background Script**: For real-time messaging via WebSocket
- **Room Management**: For user permissions and room state
- **Theme System**: Supports light/dark themes automatically
- **Extension Popup**: Can be toggled from footer controls

## Testing

Use the `ChatDemo.tsx` component to test the chat functionality:

```tsx
import { ChatDemo } from '@ui/components/chat/ChatDemo';

// Renders a complete demo with mock data
<ChatDemo />
```

## Performance Notes

- Virtual scrolling activates automatically for >50 messages
- Message batching reduces initial render time
- Animations are optimized for 60fps performance
- Memory usage is optimized with proper cleanup