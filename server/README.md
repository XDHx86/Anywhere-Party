# Local WebSocket Relay Server

A lightweight WebSocket relay server for Watch Party Extension development. This server provides in-memory room state management without requiring database dependencies, making it perfect for local development and testing.

## Features

- 🏠 **Room Management**: Create and join rooms with unique IDs
- 👥 **Participant Handling**: Automatic host promotion and participant tracking
- 🔄 **Sync State Relay**: Broadcast video synchronization messages
- 💬 **Chat Messages**: Real-time text communication
- 🧹 **Automatic Cleanup**: Remove inactive rooms and handle disconnections
- 🛑 **Graceful Shutdown**: Clean server shutdown with client notification

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Installation

```bash
cd server
npm install
```

### Running the Server

```bash
# Start the server
npm start

# Or run in development mode with auto-restart
npm run dev
```

The server will start on port 8080 by default. You can change the port using the `PORT` environment variable:

```bash
PORT=3000 npm start
```

### Testing

Run the included test suite to verify functionality:

```bash
# Make sure the server is running first
npm start

# In another terminal, run tests
npm test
```

## WebSocket API

### Connection

Connect to `ws://localhost:8080` (or your configured port).

### Message Format

All messages are JSON objects with a `type` field and additional payload data.

### Client → Server Messages

#### Create Room
```json
{
  "type": "CREATE_ROOM",
  "userId": "user123",
  "roomOptions": {}
}
```

#### Join Room
```json
{
  "type": "JOIN_ROOM",
  "userId": "user123",
  "roomId": "ABC123"
}
```

#### Leave Room
```json
{
  "type": "LEAVE_ROOM",
  "userId": "user123"
}
```

#### Update Sync State (Host Only)
```json
{
  "type": "SYNC_STATE",
  "userId": "host123",
  "state": {
    "currentTime": 42.5,
    "paused": false,
    "playbackRate": 1,
    "videoUrl": "https://example.com/video.mp4"
  }
}
```

#### Send Chat Message
```json
{
  "type": "CHAT_MESSAGE",
  "userId": "user123",
  "message": "Hello everyone!"
}
```

#### Heartbeat
```json
{
  "type": "HEARTBEAT",
  "userId": "user123"
}
```

### Server → Client Messages

#### Welcome
```json
{
  "type": "WELCOME",
  "timestamp": 1234567890,
  "serverId": "local-relay"
}
```

#### Room Created
```json
{
  "type": "ROOM_CREATED",
  "roomId": "ABC123",
  "hostId": "user123",
  "participants": [...],
  "currentState": {...},
  "timestamp": 1234567890
}
```

#### Room Joined
```json
{
  "type": "ROOM_JOINED",
  "roomId": "ABC123",
  "hostId": "host123",
  "participants": [...],
  "currentState": {...},
  "timestamp": 1234567890
}
```

#### Participant Joined
```json
{
  "type": "PARTICIPANT_JOINED",
  "userId": "newuser123",
  "participants": [...],
  "timestamp": 1234567890
}
```

#### Participant Left
```json
{
  "type": "PARTICIPANT_LEFT",
  "userId": "leftuser123",
  "participants": [...],
  "newHostId": "newhost123",
  "timestamp": 1234567890
}
```

#### Sync Update
```json
{
  "type": "SYNC_UPDATE",
  "state": {
    "currentTime": 42.5,
    "paused": false,
    "playbackRate": 1,
    "timestamp": 1234567890
  },
  "fromUserId": "host123",
  "timestamp": 1234567890
}
```

#### Chat Message
```json
{
  "type": "CHAT_MESSAGE",
  "userId": "sender123",
  "message": "Hello everyone!",
  "timestamp": 1234567890
}
```

#### Error
```json
{
  "type": "ERROR",
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "Room ABC123 not found"
  },
  "timestamp": 1234567890
}
```

## Configuration

The server can be configured using environment variables:

- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment mode (development/production)

## Room Management

### Room IDs

Room IDs are automatically generated as 6-character alphanumeric codes (e.g., "ABC123").

### Host Management

- The user who creates a room becomes the host
- Only hosts can update sync state
- If a host leaves, the first remaining participant becomes the new host
- Empty rooms are automatically cleaned up

### Cleanup

- Rooms inactive for 30 minutes are automatically removed
- Disconnected participants are immediately removed from rooms
- The server logs cleanup activities for debugging

## Development

### Project Structure

```
server/
├── local-relay.js      # Main server implementation
├── test-relay.js       # Test suite
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Key Classes

- `LocalWebSocketRelay`: Main server class handling connections and routing
- `InMemoryRoom`: Room state management with participant tracking

### Logging

The server provides detailed console logging:
- 🚀 Server startup
- 🔌 Connection events
- 🏠 Room creation/cleanup
- 👤 Participant join/leave
- 🔄 Sync state updates
- 💬 Chat messages
- ❌ Errors and warnings

## Integration with Extension

To use this server with the Watch Party Extension:

1. Set `LOCAL_DEV_MODE: true` in your extension configuration
2. Configure `SIGNALING_SERVER: "ws://localhost:8080"` (or your port)
3. Start the local relay server
4. The extension will connect to the local server instead of a remote signaling server

## Limitations

This is a development server with the following limitations:

- **In-memory only**: No persistence across server restarts
- **Single instance**: No clustering or load balancing
- **Basic security**: No authentication or rate limiting
- **Simple protocol**: Minimal message validation

For production use, implement the full signaling server with PostgreSQL and Redis as described in the design document.

## Troubleshooting

### Connection Issues

- Ensure the server is running and accessible
- Check firewall settings for the configured port
- Verify WebSocket support in your client

### Room Issues

- Room IDs are case-sensitive
- Rooms are cleaned up after 30 minutes of inactivity
- Only hosts can update sync state

### Performance

- The server is designed for development with small numbers of participants
- For load testing, consider connection limits and message frequency

## License

MIT License - see the main project for details.