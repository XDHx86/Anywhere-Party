-- Seed data for Watch Party Extension database
-- This file contains sample data for development and testing

-- Insert sample feature flags
INSERT INTO feature_flags (name, enabled, rollout_percentage, conditions, description, created_at, updated_at) VALUES
('voice_chat', true, 100, '{}', 'Enable WebRTC voice communication', NOW(), NOW()),
('annotations', true, 100, '{}', 'Enable collaborative annotations', NOW(), NOW()),
('subtitles', true, 100, '{}', 'Enable subtitle support', NOW(), NOW()),
('polls', true, 75, '{"min_participants": 3}', 'Enable polls and quizzes', NOW(), NOW()),
('whiteboard', false, 25, '{"beta_users": true}', 'Enable whiteboard collaboration', NOW(), NOW()),
('scheduling', false, 10, '{"premium_users": true}', 'Enable watch party scheduling', NOW(), NOW()),
('e2e_encryption', false, 5, '{"security_tier": "high"}', 'Enable end-to-end encryption', NOW(), NOW()),
('performance_monitoring', true, 100, '{}', 'Enable performance monitoring', NOW(), NOW()),
('telemetry', true, 100, '{"opt_out_allowed": true}', 'Enable telemetry collection', NOW(), NOW()),
('accessibility_features', true, 100, '{}', 'Enable accessibility enhancements', NOW(), NOW());

-- Insert sample rooms for development
INSERT INTO rooms (id, host_id, name, password_hash, is_public, max_participants, settings, created_at, updated_at) VALUES
('demo-room-1', 'user-demo-host', 'Demo Public Room', NULL, true, 50, 
 '{"allowVoiceChat": true, "allowAnnotations": true, "allowSubtitles": true, "syncTolerance": 300, "heartbeatInterval": 2000}', 
 NOW(), NOW()),
('demo-room-2', 'user-demo-host', 'Private Test Room', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', false, 10,
 '{"allowVoiceChat": false, "allowAnnotations": true, "allowSubtitles": true, "syncTolerance": 200, "heartbeatInterval": 1000}',
 NOW(), NOW()),
('demo-room-3', 'user-demo-host-2', 'Movie Night Room', NULL, true, 25,
 '{"allowVoiceChat": true, "allowAnnotations": false, "allowSubtitles": true, "syncTolerance": 500, "heartbeatInterval": 3000}',
 NOW(), NOW());

-- Insert sample participants
INSERT INTO participants (id, room_id, user_id, user_name, role, joined_at, last_seen) VALUES
('part-1', 'demo-room-1', 'user-demo-host', 'Demo Host', 'host', NOW() - INTERVAL '1 hour', NOW()),
('part-2', 'demo-room-1', 'user-demo-1', 'Alice', 'participant', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '5 minutes'),
('part-3', 'demo-room-1', 'user-demo-2', 'Bob', 'co-host', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 minutes'),
('part-4', 'demo-room-2', 'user-demo-host', 'Demo Host', 'host', NOW() - INTERVAL '2 hours', NOW()),
('part-5', 'demo-room-3', 'user-demo-host-2', 'Movie Host', 'host', NOW() - INTERVAL '3 hours', NOW());

-- Insert sample room events for analytics
INSERT INTO room_events (room_id, user_id, event_type, event_data, timestamp) VALUES
('demo-room-1', 'user-demo-host', 'room_created', '{"name": "Demo Public Room", "isPublic": true}', NOW() - INTERVAL '1 hour'),
('demo-room-1', 'user-demo-1', 'participant_joined', '{"userName": "Alice", "role": "participant"}', NOW() - INTERVAL '45 minutes'),
('demo-room-1', 'user-demo-2', 'participant_joined', '{"userName": "Bob", "role": "participant"}', NOW() - INTERVAL '30 minutes'),
('demo-room-1', 'user-demo-host', 'role_changed', '{"targetUserId": "user-demo-2", "newRole": "co-host"}', NOW() - INTERVAL '25 minutes'),
('demo-room-1', 'user-demo-host', 'sync_event', '{"action": "play", "currentTime": 120.5, "playbackRate": 1.0}', NOW() - INTERVAL '20 minutes'),
('demo-room-1', 'user-demo-host', 'sync_event', '{"action": "pause", "currentTime": 245.2, "playbackRate": 1.0}', NOW() - INTERVAL '15 minutes'),
('demo-room-1', 'user-demo-2', 'chat_message', '{"message": "Great movie so far!", "timestamp": 245200}', NOW() - INTERVAL '14 minutes'),
('demo-room-1', 'user-demo-1', 'reaction', '{"type": "thumbs_up", "timestamp": 245500}', NOW() - INTERVAL '13 minutes'),
('demo-room-1', 'user-demo-host', 'sync_event', '{"action": "seek", "currentTime": 300.0, "playbackRate": 1.0}', NOW() - INTERVAL '10 minutes'),
('demo-room-1', 'user-demo-host', 'sync_event', '{"action": "play", "currentTime": 300.0, "playbackRate": 1.0}', NOW() - INTERVAL '10 minutes');

-- Insert sample annotations
INSERT INTO annotations (id, room_id, user_id, video_timestamp, annotation_type, annotation_data, layer_index, created_at) VALUES
('anno-1', 'demo-room-1', 'user-demo-2', 120.5, 'pen', 
 '{"path": [{"x": 100, "y": 150}, {"x": 120, "y": 170}, {"x": 140, "y": 160}], "color": "#ff0000", "width": 3}', 
 0, NOW() - INTERVAL '20 minutes'),
('anno-2', 'demo-room-1', 'user-demo-1', 245.2, 'text', 
 '{"text": "Important scene!", "x": 200, "y": 100, "fontSize": 16, "color": "#00ff00"}', 
 1, NOW() - INTERVAL '14 minutes'),
('anno-3', 'demo-room-1', 'user-demo-host', 300.0, 'shape', 
 '{"type": "circle", "x": 300, "y": 200, "radius": 50, "color": "#0000ff", "filled": false}', 
 0, NOW() - INTERVAL '10 minutes');

-- Insert sample chat messages
INSERT INTO chat_messages (id, room_id, user_id, user_name, message, video_timestamp, created_at) VALUES
('msg-1', 'demo-room-1', 'user-demo-1', 'Alice', 'Hello everyone!', 60.0, NOW() - INTERVAL '50 minutes'),
('msg-2', 'demo-room-1', 'user-demo-2', 'Bob', 'Hey Alice! Ready for the movie?', 65.5, NOW() - INTERVAL '49 minutes'),
('msg-3', 'demo-room-1', 'user-demo-host', 'Demo Host', 'Starting in 3... 2... 1...', 90.0, NOW() - INTERVAL '45 minutes'),
('msg-4', 'demo-room-1', 'user-demo-1', 'Alice', 'This opening scene is amazing!', 180.2, NOW() - INTERVAL '25 minutes'),
('msg-5', 'demo-room-1', 'user-demo-2', 'Bob', 'Great movie so far!', 245.2, NOW() - INTERVAL '14 minutes'),
('msg-6', 'demo-room-1', 'user-demo-host', 'Demo Host', 'Glad you''re enjoying it!', 250.0, NOW() - INTERVAL '13 minutes');

-- Insert sample polls
INSERT INTO polls (id, room_id, creator_id, question, options, video_timestamp, expires_at, created_at) VALUES
('poll-1', 'demo-room-1', 'user-demo-host', 'What do you think will happen next?', 
 '["The hero will escape", "The villain will win", "Plot twist incoming", "Not sure"]', 
 200.0, NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '18 minutes');

-- Insert sample poll votes
INSERT INTO poll_votes (poll_id, user_id, option_index, created_at) VALUES
('poll-1', 'user-demo-1', 0, NOW() - INTERVAL '17 minutes'),
('poll-1', 'user-demo-2', 2, NOW() - INTERVAL '16 minutes');

-- Insert sample bookmarks
INSERT INTO bookmarks (id, room_id, user_id, title, description, video_timestamp, thumbnail_url, created_at) VALUES
('bookmark-1', 'demo-room-1', 'user-demo-host', 'Opening Credits', 'Beautiful cinematography in the opening', 30.0, NULL, NOW() - INTERVAL '40 minutes'),
('bookmark-2', 'demo-room-1', 'user-demo-2', 'Character Introduction', 'Main character first appearance', 120.5, NULL, NOW() - INTERVAL '20 minutes'),
('bookmark-3', 'demo-room-1', 'user-demo-1', 'Plot Twist', 'Unexpected revelation', 245.2, NULL, NOW() - INTERVAL '14 minutes');

-- Insert sample subtitle tracks
INSERT INTO subtitle_tracks (id, room_id, user_id, language, source, content_hash, offset_ms, enabled, created_at) VALUES
('sub-1', 'demo-room-1', 'user-demo-1', 'en', 'file', 'abc123def456', 0, true, NOW() - INTERVAL '45 minutes'),
('sub-2', 'demo-room-1', 'user-demo-2', 'es', 'opensubtitles', 'def456ghi789', -500, true, NOW() - INTERVAL '30 minutes'),
('sub-3', 'demo-room-2', 'user-demo-host', 'fr', 'file', 'ghi789jkl012', 200, false, NOW() - INTERVAL '2 hours');

-- Create indexes for better performance on sample data
CREATE INDEX IF NOT EXISTS idx_room_events_room_timestamp ON room_events(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_timestamp ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_room_timestamp ON annotations(room_id, video_timestamp);
CREATE INDEX IF NOT EXISTS idx_participants_room_active ON participants(room_id) WHERE last_seen > NOW() - INTERVAL '1 hour';
CREATE INDEX IF NOT EXISTS idx_polls_room_active ON polls(room_id) WHERE expires_at > NOW();

-- Update statistics for query planner
ANALYZE rooms;
ANALYZE participants;
ANALYZE room_events;
ANALYZE chat_messages;
ANALYZE annotations;
ANALYZE polls;
ANALYZE bookmarks;
ANALYZE subtitle_tracks;

-- Insert configuration settings
INSERT INTO system_config (key, value, description, updated_at) VALUES
('max_room_duration', '86400000', 'Maximum room duration in milliseconds (24 hours)', NOW()),
('default_sync_tolerance', '300', 'Default sync tolerance in milliseconds', NOW()),
('max_participants_per_room', '50', 'Maximum participants allowed per room', NOW()),
('cleanup_interval', '300000', 'Room cleanup interval in milliseconds (5 minutes)', NOW()),
('feature_flag_cache_ttl', '300', 'Feature flag cache TTL in seconds', NOW()),
('rate_limit_window', '900000', 'Rate limit window in milliseconds (15 minutes)', NOW()),
('rate_limit_max_requests', '100', 'Maximum requests per rate limit window', NOW()),
('websocket_heartbeat_interval', '30000', 'WebSocket heartbeat interval in milliseconds', NOW()),
('max_chat_message_length', '500', 'Maximum chat message length in characters', NOW()),
('max_annotation_size', '524288', 'Maximum annotation data size in bytes', NOW());

COMMIT;