-- PostgreSQL Database Schema for Watch Party Extension
-- Full signaling server with persistence and audit logging

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255), -- For optional OAuth, can be NULL for anonymous users
    display_name VARCHAR(255),
    avatar_url TEXT,
    is_anonymous BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table for watch party rooms
CREATE TABLE rooms (
    id VARCHAR(255) PRIMARY KEY, -- Short readable room codes like "ABC123"
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(), -- Internal UUID for joins
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    password_hash VARCHAR(255), -- NULL for public rooms
    is_public BOOLEAN DEFAULT false,
    max_participants INTEGER DEFAULT 50,
    current_video_url TEXT,
    current_video_title VARCHAR(500),
    settings JSONB DEFAULT '{}', -- Room-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    
    -- Indexes for performance
    INDEX idx_rooms_host_id (host_id),
    INDEX idx_rooms_is_public (is_public),
    INDEX idx_rooms_last_activity (last_activity),
    INDEX idx_rooms_expires_at (expires_at)
);

-- Participants table for room membership
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant', 'muted')),
    permissions JSONB DEFAULT '{}', -- Custom permissions per participant
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connection_id VARCHAR(255), -- WebSocket connection identifier
    
    -- Ensure unique participation per room
    UNIQUE(room_id, user_id),
    
    -- Indexes
    INDEX idx_participants_room_id (room_id),
    INDEX idx_participants_user_id (user_id),
    INDEX idx_participants_role (role),
    INDEX idx_participants_last_seen (last_seen)
);

-- Room events table for audit logging and history
CREATE TABLE room_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system events
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for querying events
    INDEX idx_room_events_room_id (room_id),
    INDEX idx_room_events_user_id (user_id),
    INDEX idx_room_events_type (event_type),
    INDEX idx_room_events_timestamp (timestamp)
);

-- Playback state table for current room state
CREATE TABLE playback_states (
    room_id VARCHAR(255) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    current_time DECIMAL(10,3) NOT NULL DEFAULT 0,
    paused BOOLEAN NOT NULL DEFAULT true,
    playback_rate DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    video_url TEXT,
    video_title VARCHAR(500),
    video_duration DECIMAL(10,3),
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (current_time >= 0),
    CHECK (playback_rate > 0 AND playback_rate <= 4.0),
    CHECK (video_duration IS NULL OR video_duration >= 0)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'reaction', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- For reactions, timestamps, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_chat_messages_room_id (room_id),
    INDEX idx_chat_messages_user_id (user_id),
    INDEX idx_chat_messages_created_at (created_at),
    INDEX idx_chat_messages_type (message_type)
);

-- Annotations table for collaborative drawing
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_timestamp DECIMAL(10,3) NOT NULL,
    annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN ('pen', 'shape', 'text', 'highlight')),
    annotation_data JSONB NOT NULL,
    layer_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (video_timestamp >= 0),
    CHECK (layer_index >= 0),
    
    -- Indexes
    INDEX idx_annotations_room_id (room_id),
    INDEX idx_annotations_user_id (user_id),
    INDEX idx_annotations_video_timestamp (video_timestamp),
    INDEX idx_annotations_layer (layer_index)
);

-- Subtitle tracks table for per-user subtitles
CREATE TABLE subtitle_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL, -- ISO language codes
    source VARCHAR(50) DEFAULT 'file' CHECK (source IN ('file', 'opensubtitles', 'manual')),
    content TEXT NOT NULL, -- SRT/VTT content
    offset_ms INTEGER DEFAULT 0, -- User-specific timing offset
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique language per user per room
    UNIQUE(room_id, user_id, language_code),
    
    -- Indexes
    INDEX idx_subtitle_tracks_room_id (room_id),
    INDEX idx_subtitle_tracks_user_id (user_id),
    INDEX idx_subtitle_tracks_language (language_code)
);

-- Scheduled sessions table for watch party scheduling
CREATE TABLE scheduled_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    video_url TEXT,
    video_title VARCHAR(500),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- For recurring sessions
    reminder_sent BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (scheduled_end IS NULL OR scheduled_end > scheduled_start),
    
    -- Indexes
    INDEX idx_scheduled_sessions_organizer_id (organizer_id),
    INDEX idx_scheduled_sessions_scheduled_start (scheduled_start),
    INDEX idx_scheduled_sessions_status (status)
);

-- Session invites table
CREATE TABLE session_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255),
    invitee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invite_token VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Either email or user_id must be provided
    CHECK (invitee_email IS NOT NULL OR invitee_user_id IS NOT NULL),
    
    -- Indexes
    INDEX idx_session_invites_session_id (session_id),
    INDEX idx_session_invites_email (invitee_email),
    INDEX idx_session_invites_user_id (invitee_user_id),
    INDEX idx_session_invites_token (invite_token)
);

-- Feature flags table for server-side flag management
CREATE TABLE feature_flags (
    flag_name VARCHAR(255) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    conditions JSONB DEFAULT '{}',
    user_overrides JSONB DEFAULT '{}', -- User-specific overrides
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_feature_flags_enabled (enabled),
    INDEX idx_feature_flags_rollout (rollout_percentage)
);

-- Feature flag evaluations table for audit logging
CREATE TABLE feature_flag_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_name VARCHAR(255) NOT NULL,
    user_id_hash VARCHAR(64) NOT NULL, -- Anonymized user ID hash
    result BOOLEAN NOT NULL,
    reason VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for analytics
    INDEX idx_flag_evaluations_flag_name (flag_name),
    INDEX idx_flag_evaluations_timestamp (timestamp),
    INDEX idx_flag_evaluations_result (result)
);

-- User sessions table for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    
    -- Indexes
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_token (session_token),
    INDEX idx_user_sessions_expires_at (expires_at)
);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playback_states_updated_at BEFORE UPDATE ON playback_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subtitle_tracks_updated_at BEFORE UPDATE ON subtitle_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_sessions_updated_at BEFORE UPDATE ON scheduled_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete rooms that have expired or been inactive for too long
    DELETE FROM rooms 
    WHERE (expires_at IS NOT NULL AND expires_at < NOW())
       OR (last_activity < NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO room_events (room_id, event_type, event_data)
    SELECT 'SYSTEM', 'CLEANUP', jsonb_build_object('deleted_rooms', deleted_count, 'timestamp', NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update room activity
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update room's last_activity when participants or events are updated
    UPDATE rooms 
    SET last_activity = NOW() 
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply activity update triggers
CREATE TRIGGER update_room_activity_on_participant_change 
    AFTER INSERT OR UPDATE OR DELETE ON participants 
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER update_room_activity_on_event 
    AFTER INSERT ON room_events 
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER update_room_activity_on_chat 
    AFTER INSERT ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- Insert default feature flags
INSERT INTO feature_flags (flag_name, enabled, rollout_percentage, description) VALUES
('webrtc-voice-chat', true, 100, 'Enable WebRTC voice communication features'),
('advanced-annotations', false, 25, 'Advanced collaborative annotation system with multiple layers'),
('playlist-management', false, 0, 'Shared video queue and playlist management'),
('subtitle-auto-download', true, 80, 'Automatic subtitle download from OpenSubtitles'),
('watch-party-scheduling', false, 10, 'Scheduled watch party creation and calendar integration'),
('enhanced-security', false, 50, 'Enhanced security features including E2E encryption'),
('telemetry-collection', false, 0, 'Telemetry and analytics collection (opt-out by default)'),
('performance-monitoring', true, 100, 'Performance monitoring and drift analysis'),
('accessibility-enhancements', true, 100, 'Accessibility features and keyboard navigation'),
('beta-features', false, 5, 'Beta features for testing and feedback')
ON CONFLICT (flag_name) DO NOTHING;

-- Create indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_composite_lookup ON rooms (is_public, last_activity DESC) WHERE expires_at IS NULL OR expires_at > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_active ON participants (room_id, last_seen DESC) WHERE connection_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_recent ON chat_messages (room_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_events_recent ON room_events (room_id, timestamp DESC);

-- Create views for common queries
CREATE OR REPLACE VIEW active_rooms AS
SELECT 
    r.*,
    COUNT(p.id) as participant_count,
    u.display_name as host_name
FROM rooms r
LEFT JOIN participants p ON r.id = p.room_id AND p.connection_id IS NOT NULL
LEFT JOIN users u ON r.host_id = u.id
WHERE (r.expires_at IS NULL OR r.expires_at > NOW())
  AND r.last_activity > NOW() - INTERVAL '1 hour'
GROUP BY r.id, u.display_name;

CREATE OR REPLACE VIEW room_summaries AS
SELECT 
    r.id,
    r.name,
    r.is_public,
    r.max_participants,
    r.created_at,
    r.last_activity,
    COUNT(p.id) as participant_count,
    u.display_name as host_name,
    ps.current_time,
    ps.paused,
    ps.video_title
FROM rooms r
LEFT JOIN participants p ON r.id = p.room_id
LEFT JOIN users u ON r.host_id = u.id
LEFT JOIN playback_states ps ON r.id = ps.room_id
WHERE (r.expires_at IS NULL OR r.expires_at > NOW())
GROUP BY r.id, u.display_name, ps.current_time, ps.paused, ps.video_title;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO watch_party_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO watch_party_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO watch_party_app;