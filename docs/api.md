# API Documentation

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Watch Party Extension API
  description: Backend API for the Watch Party Extension signaling server
  version: 1.0.0
  contact:
    name: Watch Party Extension
    url: https://github.com/your-repo/watch-party-extension
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3001
    description: Local development server
  - url: https://api.watchparty.example.com
    description: Production server

paths:
  /health:
    get:
      summary: Health check endpoint
      description: Returns server health status and version information
      responses:
        '200':
          description: Server is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  version:
                    type: string
                    example: "1.0.0"
                  uptime:
                    type: number
                    example: 3600
                  timestamp:
                    type: string
                    format: date-time

  /rooms:
    post:
      summary: Create a new room
      description: Creates a new watch party room with specified configuration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateRoomRequest'
      responses:
        '201':
          description: Room created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Room'
        '400':
          description: Invalid request parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    get:
      summary: List public rooms
      description: Returns a list of public rooms available for joining
      parameters:
        - name: limit
          in: query
          description: Maximum number of rooms to return
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          description: Number of rooms to skip for pagination
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        '200':
          description: List of public rooms
          content:
            application/json:
              schema:
                type: object
                properties:
                  rooms:
                    type: array
                    items:
                      $ref: '#/components/schemas/PublicRoom'
                  total:
                    type: integer
                  limit:
                    type: integer
                  offset:
                    type: integer

  /rooms/{roomId}:
    get:
      summary: Get room information
      description: Returns detailed information about a specific room
      parameters:
        - name: roomId
          in: path
          required: true
          description: Unique room identifier
          schema:
            type: string
      responses:
        '200':
          description: Room information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Room'
        '404':
          description: Room not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    patch:
      summary: Update room settings
      description: Updates room configuration (host only)
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateRoomRequest'
      responses:
        '200':
          description: Room updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Room'
        '403':
          description: Insufficient permissions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Room not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    delete:
      summary: Delete room
      description: Permanently deletes a room (host only)
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Room deleted successfully
        '403':
          description: Insufficient permissions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Room not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /rooms/{roomId}/join:
    post:
      summary: Join a room
      description: Adds a participant to an existing room
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/JoinRoomRequest'
      responses:
        '200':
          description: Successfully joined room
          content:
            application/json:
              schema:
                type: object
                properties:
                  room:
                    $ref: '#/components/schemas/Room'
                  participant:
                    $ref: '#/components/schemas/Participant'
                  wsToken:
                    type: string
                    description: WebSocket authentication token
        '400':
          description: Invalid request or room full
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          description: Invalid password for private room
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: Room not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /rooms/{roomId}/participants:
    get:
      summary: List room participants
      description: Returns list of current room participants
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: List of participants
          content:
            application/json:
              schema:
                type: object
                properties:
                  participants:
                    type: array
                    items:
                      $ref: '#/components/schemas/Participant'

  /rooms/{roomId}/participants/{userId}:
    patch:
      summary: Update participant role
      description: Updates participant permissions (host/co-host only)
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                role:
                  type: string
                  enum: [participant, co-host, host]
                permissions:
                  $ref: '#/components/schemas/ParticipantPermissions'
      responses:
        '200':
          description: Participant updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Participant'
        '403':
          description: Insufficient permissions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    delete:
      summary: Remove participant
      description: Removes a participant from the room (kick)
      parameters:
        - name: roomId
          in: path
          required: true
          schema:
            type: string
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Participant removed successfully
        '403':
          description: Insufficient permissions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /feature-flags:
    get:
      summary: Get feature flags
      description: Returns current feature flag configuration for the client
      parameters:
        - name: userId
          in: query
          description: User ID for personalized flags
          schema:
            type: string
      responses:
        '200':
          description: Feature flags configuration
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FeatureFlags'

  /feature-flags/{flagName}:
    patch:
      summary: Update feature flag
      description: Updates a specific feature flag configuration (admin only)
      parameters:
        - name: flagName
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/FeatureFlagConfig'
      responses:
        '200':
          description: Feature flag updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FeatureFlagConfig'
        '403':
          description: Admin access required
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /subtitles/search:
    get:
      summary: Search subtitles
      description: Search for subtitles using OpenSubtitles API
      parameters:
        - name: query
          in: query
          required: true
          description: Movie/TV show title to search for
          schema:
            type: string
        - name: language
          in: query
          description: Preferred subtitle language (ISO 639-1 code)
          schema:
            type: string
            default: "en"
        - name: imdbId
          in: query
          description: IMDB ID for more accurate matching
          schema:
            type: string
      responses:
        '200':
          description: Subtitle search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/SubtitleResult'
        '400':
          description: Invalid search parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    CreateRoomRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          maxLength: 100
          description: Room display name
        isPublic:
          type: boolean
          default: false
          description: Whether room appears in public listings
        password:
          type: string
          minLength: 4
          maxLength: 50
          description: Password for private rooms
        maxParticipants:
          type: integer
          minimum: 2
          maximum: 100
          default: 50
          description: Maximum number of participants
        settings:
          $ref: '#/components/schemas/RoomSettings'

    UpdateRoomRequest:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        isPublic:
          type: boolean
        maxParticipants:
          type: integer
          minimum: 2
          maximum: 100
        settings:
          $ref: '#/components/schemas/RoomSettings'

    JoinRoomRequest:
      type: object
      required:
        - userId
        - userName
      properties:
        userId:
          type: string
          description: Unique user identifier
        userName:
          type: string
          maxLength: 50
          description: Display name for the user
        password:
          type: string
          description: Password for private rooms

    Room:
      type: object
      properties:
        id:
          type: string
          description: Unique room identifier
        name:
          type: string
          description: Room display name
        hostId:
          type: string
          description: User ID of the room host
        isPublic:
          type: boolean
          description: Whether room is publicly listed
        participantCount:
          type: integer
          description: Current number of participants
        maxParticipants:
          type: integer
          description: Maximum allowed participants
        currentState:
          $ref: '#/components/schemas/PlaybackState'
        settings:
          $ref: '#/components/schemas/RoomSettings'
        createdAt:
          type: string
          format: date-time
        lastActivity:
          type: string
          format: date-time

    PublicRoom:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        participantCount:
          type: integer
        maxParticipants:
          type: integer
        currentVideo:
          type: string
          description: Currently playing video title
        createdAt:
          type: string
          format: date-time

    Participant:
      type: object
      properties:
        id:
          type: string
          description: Unique participant identifier
        userId:
          type: string
          description: User identifier
        userName:
          type: string
          description: Display name
        role:
          type: string
          enum: [host, co-host, participant]
          description: Participant role and permissions
        isConnected:
          type: boolean
          description: Current connection status
        joinedAt:
          type: string
          format: date-time
        lastSeen:
          type: string
          format: date-time
        permissions:
          $ref: '#/components/schemas/ParticipantPermissions'

    ParticipantPermissions:
      type: object
      properties:
        canControlPlayback:
          type: boolean
          default: false
        canManageParticipants:
          type: boolean
          default: false
        canModerateChat:
          type: boolean
          default: false
        canCreatePolls:
          type: boolean
          default: true
        canAnnotate:
          type: boolean
          default: true

    PlaybackState:
      type: object
      properties:
        currentTime:
          type: number
          description: Current playback position in seconds
        paused:
          type: boolean
          description: Whether video is currently paused
        playbackRate:
          type: number
          default: 1.0
          description: Playback speed multiplier
        timestamp:
          type: number
          description: Unix timestamp when state was recorded
        videoUrl:
          type: string
          description: URL of currently playing video
        duration:
          type: number
          description: Total video duration in seconds

    RoomSettings:
      type: object
      properties:
        allowVoiceChat:
          type: boolean
          default: true
        allowAnnotations:
          type: boolean
          default: true
        allowSubtitles:
          type: boolean
          default: true
        allowPolls:
          type: boolean
          default: true
        syncTolerance:
          type: number
          default: 300
          description: Sync tolerance in milliseconds
        heartbeatInterval:
          type: number
          default: 2000
          description: Sync heartbeat interval in milliseconds
        requireApproval:
          type: boolean
          default: false
          description: Whether new participants need host approval

    FeatureFlags:
      type: object
      properties:
        voiceChat:
          type: boolean
        annotations:
          type: boolean
        subtitles:
          type: boolean
        polls:
          type: boolean
        whiteboard:
          type: boolean
        scheduling:
          type: boolean
        e2eEncryption:
          type: boolean

    FeatureFlagConfig:
      type: object
      properties:
        enabled:
          type: boolean
        rolloutPercentage:
          type: number
          minimum: 0
          maximum: 100
        conditions:
          type: object
          description: Additional conditions for flag evaluation
        description:
          type: string
          description: Human-readable description of the flag

    SubtitleResult:
      type: object
      properties:
        id:
          type: string
          description: Subtitle file identifier
        language:
          type: string
          description: Language code (ISO 639-1)
        title:
          type: string
          description: Movie/show title
        year:
          type: integer
          description: Release year
        downloadUrl:
          type: string
          description: URL to download subtitle file
        format:
          type: string
          enum: [srt, vtt]
          description: Subtitle file format
        rating:
          type: number
          description: Community rating (0-10)

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          description: Error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error context

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token for authenticated requests

security:
  - BearerAuth: []
```

## WebSocket Events

The signaling server uses WebSocket connections for real-time communication. All messages follow this format:

```typescript
interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  roomId?: string;
}
```

### Client to Server Events

#### Room Management
- `join_room` - Join an existing room
- `leave_room` - Leave current room
- `create_room` - Create a new room (HTTP preferred)

#### Synchronization
- `sync_event` - Video playback state change
- `heartbeat` - Regular sync heartbeat
- `seek_request` - Request to seek to specific time

#### Communication
- `chat_message` - Send text message
- `reaction` - Send emoji reaction
- `voice_state` - Mute/unmute status

#### Collaboration
- `annotation` - Drawing/annotation data
- `poll_vote` - Vote on a poll
- `bookmark` - Create timestamped bookmark

### Server to Client Events

#### Room Updates
- `room_state` - Current room state
- `participant_joined` - New participant notification
- `participant_left` - Participant departure
- `host_changed` - Host transfer notification

#### Synchronization
- `sync_update` - Playback state update
- `force_sync` - Mandatory resynchronization

#### Communication
- `chat_message` - Incoming chat message
- `reaction_overlay` - Reaction to display
- `voice_update` - Voice chat state change

#### Collaboration
- `annotation_update` - New annotation data
- `poll_created` - New poll available
- `poll_results` - Poll voting results

### Error Handling

WebSocket errors are sent with the `error` event type:

```typescript
{
  type: 'error',
  data: {
    code: 'ROOM_NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_MESSAGE',
    message: 'Human readable error message',
    details?: any
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Room Creation**: 5 rooms per hour per IP
- **Join Requests**: 20 joins per minute per IP
- **Chat Messages**: 60 messages per minute per user
- **WebSocket Messages**: 100 messages per minute per connection

Rate limit headers are included in HTTP responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Authentication

### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  userName: string;
  role: 'user' | 'admin';
  permissions: string[];
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}
```

### OAuth Integration

The server supports OAuth authentication with the following providers:
- Google OAuth 2.0
- GitHub OAuth
- Discord OAuth

OAuth flow:
1. Client redirects to `/auth/{provider}`
2. User completes OAuth flow
3. Server returns JWT token
4. Client uses token for API requests

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ROOM_NOT_FOUND` | 404 | Requested room does not exist |
| `ROOM_FULL` | 400 | Room has reached maximum capacity |
| `INVALID_PASSWORD` | 401 | Incorrect room password |
| `PERMISSION_DENIED` | 403 | Insufficient permissions for action |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_REQUEST` | 400 | Malformed request data |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |

## Development

### Testing the API

Use the provided Postman collection or curl commands:

```bash
# Create a room
curl -X POST http://localhost:3001/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room", "isPublic": true}'

# Join a room
curl -X POST http://localhost:3001/rooms/{roomId}/join \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "userName": "Test User"}'

# Get feature flags
curl http://localhost:3001/feature-flags?userId=user123
```

### WebSocket Testing

Use a WebSocket client to test real-time functionality:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  // Join room
  ws.send(JSON.stringify({
    type: 'join_room',
    data: { roomId: 'room123', userId: 'user123' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```