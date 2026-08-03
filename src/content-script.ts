/**
 * Content script for video detection, DOM manipulation, and reaction overlay
 * Injected into all web pages to detect and control video elements
 * Implements requirements 5.2, 5.3
 */

import { VideoDetector, VideoElement } from './@core/video-detector';
import { ReactionOverlay } from './@core/reaction-overlay';
import { ReactionType } from './@core/chat/types';
import { EnhancedSubtitleEngine } from './@core/subtitle-engine/enhanced-subtitle-engine';
import { AnnotationLayer, Annotation, AnnotationMessage } from './@core/annotation-layer';
import { CollaborationManager } from './@core/collaboration';
import { AvatarManager, AvatarMessage, AVATAR_ANIMATIONS } from './@core/avatar-overlay';

console.log('Watch Party Extension content script loaded');

class ContentScript {
  private videoDetector: VideoDetector;
  private reactionOverlay: ReactionOverlay;
  private subtitleEngine: EnhancedSubtitleEngine;
  private annotationLayer: AnnotationLayer;
  private collaborationManager: CollaborationManager;
  private avatarManager: AvatarManager | null = null;
  private selectedVideo: VideoElement | null = null;
  private overlayInjected = false;
  private annotationOverlayInjected = false;
  private avatarOverlayInjected = false;
  private subtitleContainer: HTMLElement | null = null;
  private subtitleRenderInterval: number | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentRoomId: string | null = null;

  constructor() {
    this.videoDetector = new VideoDetector();
    this.reactionOverlay = new ReactionOverlay({
      displayDuration: 3000,
      maxConcurrentReactions: 8,
      animationDuration: 500,
      reactionSize: 32,
    });

    // Initialize enhanced subtitle engine with error handling
    this.subtitleEngine = new EnhancedSubtitleEngine();

    // Initialize annotation layer with default config (will be updated with real config)
    this.annotationLayer = new AnnotationLayer({
      renderIntervalMs: 33, // ~30fps, will be updated from config
      maxAnnotationsPerLayer: 100,
      maxLayers: 10,
      onAnnotationCreated: (annotation) => this.handleAnnotationCreated(annotation),
      onAnnotationUpdated: (annotation) => this.handleAnnotationUpdated(annotation),
      onAnnotationDeleted: (annotationId) => this.handleAnnotationDeleted(annotationId),
      onLayerVisibilityChanged: (layerId, visible) =>
        this.handleLayerVisibilityChanged(layerId, visible),
    });

    // Initialize collaboration manager
    this.collaborationManager = new CollaborationManager({
      maxPollsPerRoom: 10,
      maxQuizzesPerRoom: 5,
      maxBookmarksPerUser: 50,
      maxHighlightsPerUser: 30,
      maxWhiteboardLayers: 10,
      maxAnnotationsPerLayer: 100,
      thumbnailWidth: 160,
      thumbnailHeight: 90,
      thumbnailQuality: 0.8,
      onPollCreated: (poll) => this.handlePollCreated(poll),
      onQuizCreated: (quiz) => this.handleQuizCreated(quiz),
      onBookmarkCreated: (bookmark) => this.handleBookmarkCreated(bookmark),
      onHighlightCreated: (highlight) => this.handleHighlightCreated(highlight),
      onWhiteboardAnnotationCreated: (annotation) =>
        this.handleWhiteboardAnnotationCreated(annotation),
      onMomentShared: (moment) => this.handleMomentShared(moment),
    });

    this.initialize();
  }

  private initialize() {
    console.log('Content script initialized on:', window.location.hostname);

    // Initialize subtitle engine with proper configuration
    this.initializeSubtitleEngine();

    // DO NOT start video detection automatically - wait for user action
    console.log('Video detection will remain inactive until "Start Room" is clicked');

    // Listen for messages from background script
    this.setupMessageListener();
  }

  private async initializeSubtitleEngine() {
    try {
      // Get configuration from background script
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success && response.config) {
        const config = response.config;

        // Update subtitle engine configuration
        this.subtitleEngine.updateConfig({
          maxFileSizeBytes: 5 * 1024 * 1024, // 5MB limit
          allowedFormats: ['.srt', '.vtt'],
          sanitizeHtml: true,
          openSubtitlesApiKey: config.OPENSUBTITLES_KEY,
          defaultLanguages: config.DEFAULT_SUBTITLE_LANGS || ['en'],
          maxTracksPerUser: config.MAX_SUBTITLE_TRACKS_PER_USER || 5,
          enableMultipleLanguages: config.ENABLE_MULTIPLE_SUBTITLE_LANGUAGES !== false,
          defaultStyle: {
            fontSize: config.SUBTITLE_FONT_SIZE || 16,
            fontFamily: config.SUBTITLE_FONT_FAMILY || 'Arial, sans-serif',
            color: config.SUBTITLE_COLOR || '#ffffff',
            backgroundColor: config.SUBTITLE_BACKGROUND_COLOR || 'rgba(0, 0, 0, 0.8)',
            outlineColor: config.SUBTITLE_OUTLINE_COLOR || '#000000',
            outlineWidth: config.SUBTITLE_OUTLINE_WIDTH || 1,
            position: config.SUBTITLE_POSITION || 'bottom',
            alignment: config.SUBTITLE_ALIGNMENT || 'center',
            opacity: config.SUBTITLE_OPACITY || 1,
            lineHeight: config.SUBTITLE_LINE_HEIGHT || 1.4,
            maxWidth: config.SUBTITLE_MAX_WIDTH || 80,
            marginBottom: config.SUBTITLE_MARGIN_BOTTOM || 20,
            borderRadius: config.SUBTITLE_BORDER_RADIUS || 4,
            padding: config.SUBTITLE_PADDING || 8,
            shadowBlur: config.SUBTITLE_SHADOW_BLUR || 2,
            shadowColor: config.SUBTITLE_SHADOW_COLOR || 'rgba(0, 0, 0, 0.5)',
          },
        });

        // Update annotation layer render interval from config
        // Note: This is separate from sync heartbeat interval
        if (config.ANNOTATION_RENDER_INTERVAL_MS) {
          this.annotationLayer = new AnnotationLayer({
            renderIntervalMs: config.ANNOTATION_RENDER_INTERVAL_MS,
            maxAnnotationsPerLayer: 100,
            maxLayers: 10,
            onAnnotationCreated: (annotation) => this.handleAnnotationCreated(annotation),
            onAnnotationUpdated: (annotation) => this.handleAnnotationUpdated(annotation),
            onAnnotationDeleted: (annotationId) => this.handleAnnotationDeleted(annotationId),
            onLayerVisibilityChanged: (layerId, visible) =>
              this.handleLayerVisibilityChanged(layerId, visible),
          });
        }

        console.log('Subtitle engine and annotation layer initialized with configuration');
      }
    } catch (error) {
      console.warn('Failed to get configuration for subtitle engine:', error);
      // Continue with default configuration
    }
  }

  private async startVideoDetection(): Promise<void> {
    console.log('Starting on-demand video detection...');

    try {
      // Start the video detector and wait for result
      const result = await this.videoDetector.startDetection();

      if (result.success && result.video) {
        this.selectedVideo = result.video;
        console.log('Video detected successfully:', this.selectedVideo);
        this.setupVideoIntegration();
        this.notifyBackgroundScript('VIDEO_SELECTED', {
          videoId: this.selectedVideo._watchPartyId,
          src: this.selectedVideo.src || this.selectedVideo.currentSrc,
          duration: this.selectedVideo.duration,
          currentTime: this.selectedVideo.currentTime,
          method: result.method,
        });
      } else {
        console.warn('Video detection failed:', result.error);
        this.notifyBackgroundScript('VIDEO_DETECTION_FAILED', {
          error: result.error,
          fallbackAvailable: result.fallbackAvailable,
          method: result.method,
        });

        if (result.fallbackAvailable) {
          // Listen for successful right-click detection
          document.addEventListener(
            'watchPartyVideoDetected',
            (event: Event) => {
              const customEvent = event as CustomEvent;
              const { video, method } = customEvent.detail;
              this.selectedVideo = video;
              console.log('Video detected via fallback method:', method);
              this.setupVideoIntegration();
              this.notifyBackgroundScript('VIDEO_SELECTED', {
                videoId: video._watchPartyId,
                src: video.src || video.currentSrc,
                duration: video.duration,
                currentTime: video.currentTime,
                method,
              });
            },
            { once: true }
          );
        }
      }
    } catch (error) {
      console.error('Error starting video detection:', error);
      this.notifyBackgroundScript('VIDEO_DETECTION_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private setupVideoIntegration() {
    if (!this.selectedVideo) return;

    // Try to inject reaction overlay
    try {
      this.overlayInjected = this.reactionOverlay.injectOverlay(this.selectedVideo);
      if (this.overlayInjected) {
        console.log('Reaction overlay injected successfully');
      } else {
        console.warn(
          'Failed to inject reaction overlay - cross-origin restrictions or other issues'
        );
        this.showFallbackMessage();
      }
    } catch (error) {
      console.error('Error injecting reaction overlay:', error);
      this.showFallbackMessage();
    }

    // Try to inject annotation overlay (separate from reaction overlay)
    try {
      this.annotationOverlayInjected = this.annotationLayer.injectOverlay(this.selectedVideo);
      if (this.annotationOverlayInjected) {
        console.log('Annotation overlay injected successfully');
      } else {
        console.warn(
          'Failed to inject annotation overlay - cross-origin restrictions or other issues'
        );
        // Annotation layer handles its own fallback message
      }
    } catch (error) {
      console.error('Error injecting annotation overlay:', error);
      // Annotation layer handles its own fallback message
    }

    // Setup subtitle container
    this.setupSubtitleContainer();

    // Start subtitle rendering loop
    this.startSubtitleRendering();
  }

  private showFallbackMessage() {
    // Show a subtle notification that reactions are not available
    console.log('Reaction overlay not available on this page due to cross-origin restrictions');
    // In a full implementation, we might show a small notification to the user
  }

  private setupMessageListener() {
    // Listen for messages from background script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sendResponse);
        return true; // Keep message channel open for async response
      });
    }
  }

  private handleMessage(message: any, sendResponse: (response: any) => void) {
    try {
      switch (message.type) {
        case 'GET_VIDEO_TIMESTAMP':
          const timestamp = this.getCurrentVideoTimestamp();
          sendResponse({ success: true, timestamp });
          break;

        case 'SHOW_REACTION':
          this.showReaction(message.reactionType, message.videoTimestamp, message.userId);
          sendResponse({ success: true });
          break;

        case 'START_SYNC_ENGINE':
          // Start video detection when sync engine is requested
          console.log('Start sync engine requested, isHost:', message.isHost);
          this.startVideoDetection()
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              console.error('Failed to start video detection:', error);
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Video detection failed',
              });
            });
          return true; // Keep message channel open for async response

        case 'DRIFT_DETECTED':
          // Handle drift correction
          console.log('Drift detected:', message.drift);
          sendResponse({ success: true });
          break;

        case 'SERVER_MESSAGE':
          // Handle server messages that affect content script
          this.handleServerMessage(message.message);
          sendResponse({ success: true });
          break;

        case 'CONNECTION_STATE_CHANGED':
          // Handle connection state changes
          console.log('Connection state changed:', message.state);
          sendResponse({ success: true });
          break;

        case 'LOAD_SUBTITLE_FILE':
          this.handleSubtitleFileLoad(message.file, message.userId);
          sendResponse({ success: true });
          break;

        case 'UPDATE_SUBTITLE_OFFSET':
          this.subtitleEngine.updateTrackOffset(message.trackId, message.offsetMs);
          sendResponse({ success: true });
          break;

        case 'TOGGLE_SUBTITLE_TRACK':
          this.subtitleEngine.toggleTrack(message.trackId, message.enabled);
          sendResponse({ success: true });
          break;

        case 'REMOVE_SUBTITLE_TRACK':
          this.subtitleEngine.removeTrack(message.trackId);
          sendResponse({ success: true });
          break;

        case 'SEARCH_OPENSUBTITLES':
          this.handleOpenSubtitlesSearch(
            { query: message.query, language: message.language },
            sendResponse
          );
          return true; // Keep channel open for async response

        case 'DOWNLOAD_OPENSUBTITLES':
          this.handleOpenSubtitlesDownload(message.result, message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'GET_SUBTITLE_TRACKS':
          this.handleGetSubtitleTracks(message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'UPDATE_SUBTITLE_PRIORITY':
          this.subtitleEngine.updateTrackPriority(message.trackId, message.priority);
          sendResponse({ success: true });
          break;

        case 'UPDATE_SUBTITLE_STYLE':
          this.subtitleEngine.updateTrackStyle(message.trackId, message.style);
          sendResponse({ success: true });
          break;

        case 'SET_LANGUAGE_PREFERENCE':
          this.subtitleEngine.setLanguagePreference(message.userId, message.languages);
          sendResponse({ success: true });
          break;

        case 'TOGGLE_LANGUAGE':
          this.subtitleEngine.toggleLanguage(message.userId, message.language, message.enabled);
          sendResponse({ success: true });
          break;

        case 'UPDATE_USER_PREFERENCES':
          this.subtitleEngine.updateUserPreferences(message.userId, message.preferences);
          sendResponse({ success: true });
          break;

        case 'SAVE_USER_PREFERENCES':
          this.handleSaveUserPreferences(message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'LOAD_USER_PREFERENCES':
          this.handleLoadUserPreferences(message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'GET_USER_PREFERENCES':
          this.handleGetUserPreferences(message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'GET_AVAILABLE_LANGUAGES':
          this.handleGetAvailableLanguages(message.userId, sendResponse);
          return true; // Keep channel open for async response

        case 'AUTO_DOWNLOAD_SUBTITLES':
          this.handleAutoDownloadSubtitles(message.userId, message.videoInfo, sendResponse);
          return true; // Keep channel open for async response

        case 'CREATE_ANNOTATION_LAYER':
          this.handleCreateAnnotationLayer(message.layerId, message.layerName);
          sendResponse({ success: true });
          break;

        case 'DELETE_ANNOTATION_LAYER':
          this.handleDeleteAnnotationLayer(message.layerId);
          sendResponse({ success: true });
          break;

        case 'SET_ANNOTATION_LAYER_VISIBILITY':
          this.annotationLayer.setLayerVisibility(message.layerId, message.visible);
          sendResponse({ success: true });
          break;

        case 'SET_ANNOTATION_TOOL':
          this.annotationLayer.setTool(message.tool);
          sendResponse({ success: true });
          break;

        case 'SET_CURRENT_ANNOTATION_LAYER':
          const success = this.annotationLayer.setCurrentLayer(message.layerId);
          sendResponse({ success });
          break;

        case 'ADD_ANNOTATION':
          this.annotationLayer.addAnnotation(message.annotation);
          sendResponse({ success: true });
          break;

        case 'UPDATE_ANNOTATION':
          this.annotationLayer.updateAnnotation(message.annotationId, message.updates);
          sendResponse({ success: true });
          break;

        case 'DELETE_ANNOTATION':
          this.annotationLayer.deleteAnnotation(message.annotationId);
          sendResponse({ success: true });
          break;

        case 'UNDO_ANNOTATION':
          const undoSuccess = this.annotationLayer.undo();
          sendResponse({ success: undoSuccess });
          break;

        case 'REDO_ANNOTATION':
          const redoSuccess = this.annotationLayer.redo();
          sendResponse({ success: redoSuccess });
          break;

        case 'CLEAR_ALL_ANNOTATIONS':
          this.annotationLayer.clearAllAnnotations();
          sendResponse({ success: true });
          break;

        case 'GET_ALL_ANNOTATIONS':
          const annotations = this.annotationLayer.getAllAnnotations();
          sendResponse({ success: true, annotations });
          break;

        // Collaboration message handlers
        case 'SET_USER_INFO':
          this.currentUserId = message.userId;
          this.currentUserName = message.userName;
          this.currentRoomId = message.roomId;
          sendResponse({ success: true });
          break;

        case 'CREATE_POLL':
          try {
            const poll = this.collaborationManager.createPoll(
              message.userId,
              message.userName,
              message.roomId,
              message.title,
              message.question,
              message.options,
              this.getCurrentVideoTimestamp(),
              message.duration,
              message.allowMultipleChoices,
              message.isAnonymous
            );
            sendResponse({ success: true, poll });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        case 'VOTE_POLL':
          try {
            const vote = this.collaborationManager.votePoll(
              message.pollId,
              message.userId,
              message.userName,
              message.optionIds
            );
            sendResponse({ success: true, vote });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        case 'CREATE_BOOKMARK':
          try {
            this.collaborationManager
              .createBookmark(
                message.userId,
                message.userName,
                message.roomId,
                message.title,
                this.getCurrentVideoTimestamp(),
                this.selectedVideo || undefined,
                message.description,
                message.tags,
                message.isPublic
              )
              .then((bookmark) => {
                sendResponse({ success: true, bookmark });
              })
              .catch((error) => {
                sendResponse({ success: false, error: error.message });
              });
            return true; // Keep channel open for async response
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        case 'CREATE_HIGHLIGHT':
          try {
            this.collaborationManager
              .createHighlight(
                message.userId,
                message.userName,
                message.roomId,
                message.title,
                message.startTimestamp,
                message.endTimestamp,
                this.selectedVideo || undefined,
                message.description,
                message.tags,
                message.isPublic
              )
              .then((highlight) => {
                sendResponse({ success: true, highlight });
              })
              .catch((error) => {
                sendResponse({ success: false, error: error.message });
              });
            return true; // Keep channel open for async response
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        case 'GET_COLLABORATION_DATA':
          try {
            const data = {
              polls: this.collaborationManager.getActivePollsByRoom(message.roomId),
              quizzes: this.collaborationManager.getActiveQuizzesByRoom(message.roomId),
              bookmarks: this.collaborationManager.getBookmarksByRoom(message.roomId),
              highlights: this.collaborationManager.getHighlightsByRoom(message.roomId),
              whiteboardSessions: this.collaborationManager.getWhiteboardSessionsByRoom(
                message.roomId
              ),
            };
            sendResponse({ success: true, data });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        // Avatar overlay message handlers
        case 'INJECT_AVATAR_OVERLAY':
          this.injectAvatarOverlay();
          sendResponse({ success: true });
          break;

        case 'REMOVE_AVATAR_OVERLAY':
          this.removeAvatarOverlay();
          sendResponse({ success: true });
          break;

        case 'AVATAR_MESSAGE':
          if (this.avatarManager) {
            this.avatarManager.handleMessage(message.avatarMessage);
          }
          sendResponse({ success: true });
          break;

        case 'TRIGGER_AVATAR_ANIMATION':
          if (this.avatarManager) {
            this.avatarManager.triggerAnimation(message.animationKey, message.durationMs);
          }
          sendResponse({ success: true });
          break;

        case 'SHOW_AVATAR_CHAT_BUBBLE':
          if (this.avatarManager) {
            this.avatarManager.showChatBubble(message.message, message.durationMs);
          }
          sendResponse({ success: true });
          break;

        case 'UPDATE_AVATAR_CONFIG':
          if (this.avatarManager) {
            this.avatarManager.updateConfig(message.config);
          }
          sendResponse({ success: true });
          break;

        case 'SET_AVATAR_VISIBILITY':
          if (this.avatarManager) {
            this.avatarManager.setVisibility(message.visible);
          }
          sendResponse({ success: true });
          break;

        case 'SET_AVATAR_VOICE_ACTIVITY':
          if (this.avatarManager) {
            this.avatarManager.setVoiceActivity(message.speaking, message.muted);
          }
          sendResponse({ success: true });
          break;

        case 'GET_AVATAR_DATA':
          try {
            const avatarData = {
              avatars: this.avatarManager?.getAvatars() || [],
              localAvatar: this.avatarManager?.getLocalAvatar() || null,
              overlayActive: this.avatarManager?.isOverlayActive() || false,
            };
            sendResponse({ success: true, data: avatarData });
          } catch (error) {
            sendResponse({ success: false, error: (error as Error).message });
          }
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getCurrentVideoTimestamp(): number {
    if (!this.selectedVideo) {
      return 0;
    }

    try {
      return this.selectedVideo.currentTime || 0;
    } catch (error) {
      console.warn('Failed to get video timestamp:', error);
      return 0;
    }
  }

  private showReaction(reactionType: ReactionType, videoTimestamp: number, userId: string) {
    if (!this.overlayInjected) {
      console.warn('Cannot show reaction - overlay not injected');
      return;
    }

    try {
      const reactionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.reactionOverlay.showReaction(reactionId, reactionType, videoTimestamp);
      console.log('Reaction displayed:', reactionType, 'at', videoTimestamp);
    } catch (error) {
      console.error('Error showing reaction:', error);
    }
  }

  private handleServerMessage(message: any) {
    switch (message.type) {
      case 'REACTION':
        // Show reaction from other participants
        this.showReaction(message.reactionType, message.videoTimestamp, message.userId);
        break;

      case 'ROOM_JOINED':
      case 'ROOM_CREATED':
        // Clear any existing reactions when joining/creating room
        if (this.overlayInjected) {
          this.reactionOverlay.clearReactions();
        }
        // Clear annotations when joining/creating room
        if (this.annotationOverlayInjected) {
          this.annotationLayer.clearAllAnnotations();
        }
        break;

      case 'ANNOTATION_CREATED':
        // Add annotation from other participants
        if (this.annotationOverlayInjected && message.annotation) {
          this.annotationLayer.addAnnotation(message.annotation);
        }
        break;

      case 'ANNOTATION_UPDATED':
        // Update annotation from other participants
        if (this.annotationOverlayInjected && message.annotationId && message.updates) {
          this.annotationLayer.updateAnnotation(message.annotationId, message.updates);
        }
        break;

      case 'ANNOTATION_DELETED':
        // Delete annotation from other participants
        if (this.annotationOverlayInjected && message.annotationId) {
          this.annotationLayer.deleteAnnotation(message.annotationId);
        }
        break;

      case 'LAYER_VISIBILITY_CHANGED':
        // Update layer visibility from other participants
        if (
          this.annotationOverlayInjected &&
          message.layerId !== undefined &&
          message.visible !== undefined
        ) {
          this.annotationLayer.setLayerVisibility(message.layerId, message.visible);
        }
        break;

      case 'PLAYLIST_ADVANCE':
        // Swap video source for playlist auto-advance
        if (this.selectedVideo && message.url) {
          console.log('🎬 Playlist advancing to:', message.url);
          this.selectedVideo.src = message.url;
          this.selectedVideo.load();
          this.selectedVideo.play().catch(() => {});
        }
        break;

      default:
        // Ignore other server messages in content script
        break;
    }
  }

  private notifyBackgroundScript(type: string, data: any) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime
        .sendMessage({
          type,
          ...data,
        })
        .catch((error) => {
          console.warn('Failed to notify background script:', error);
        });
    }
  }

  private setupSubtitleContainer() {
    if (!this.selectedVideo) return;

    try {
      // Create subtitle container
      this.subtitleContainer = document.createElement('div');
      this.subtitleContainer.id = 'watch-party-subtitles';
      this.subtitleContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;

      // Try to append to video parent or create wrapper
      const videoParent = this.selectedVideo.parentElement;
      if (videoParent && videoParent.style.position !== 'static') {
        videoParent.appendChild(this.subtitleContainer);
      } else {
        // Create wrapper if parent doesn't have positioning
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; display: inline-block;';
        this.selectedVideo.parentNode?.insertBefore(wrapper, this.selectedVideo);
        wrapper.appendChild(this.selectedVideo);
        wrapper.appendChild(this.subtitleContainer);
      }

      console.log('Subtitle container created successfully');
    } catch (error) {
      console.error('Failed to create subtitle container:', error);
      this.subtitleContainer = null;
    }
  }

  private startSubtitleRendering() {
    if (this.subtitleRenderInterval) {
      clearInterval(this.subtitleRenderInterval);
    }

    // Render subtitles at 30fps
    this.subtitleRenderInterval = window.setInterval(() => {
      this.renderCurrentSubtitles();
    }, 33);
  }

  private renderCurrentSubtitles() {
    if (!this.selectedVideo || !this.subtitleContainer) return;

    try {
      const currentTime = this.selectedVideo.currentTime;
      const userId = 'current-user'; // This would come from the background script

      const currentCues = this.subtitleEngine.getCurrentCues(currentTime, userId);
      this.subtitleEngine.renderSubtitles(currentCues, this.subtitleContainer, userId);
    } catch (error) {
      console.warn('Error rendering subtitles:', error);
    }
  }

  private async handleSubtitleFileLoad(fileData: any, userId: string) {
    try {
      // Convert file data back to File object
      const file = new File([fileData.content], fileData.name, { type: fileData.type });

      const track = await this.subtitleEngine.loadSubtitleFile(file, userId);

      console.log('Subtitle file loaded:', track.fileName);

      // Notify background script
      this.notifyBackgroundScript('SUBTITLE_TRACK_LOADED', {
        trackId: track.id,
        fileName: track.fileName,
        language: track.language,
      });
    } catch (error) {
      console.error('Failed to load subtitle file:', error);
      this.notifyBackgroundScript('SUBTITLE_LOAD_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleOpenSubtitlesSearch(
    searchOptions: any,
    sendResponse: (response: any) => void
  ) {
    try {
      const results = await this.subtitleEngine.searchOpenSubtitles(searchOptions);
      sendResponse({ success: true, results });
    } catch (error) {
      console.error('OpenSubtitles search failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }

  private async handleOpenSubtitlesDownload(
    result: any,
    userId: string,
    sendResponse: (response: any) => void
  ) {
    try {
      const track = await this.subtitleEngine.downloadFromOpenSubtitles(result, userId);

      sendResponse({
        success: true,
        track: {
          id: track.id,
          fileName: track.fileName,
          language: track.language,
        },
      });

      console.log('Subtitle downloaded from OpenSubtitles:', track.fileName);
    } catch (error) {
      console.error('OpenSubtitles download failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  }

  private handleGetSubtitleTracks(userId: string, sendResponse: (response: any) => void) {
    try {
      const tracks = this.subtitleEngine.getUserTracks(userId);
      const trackData = tracks.map((track) => ({
        id: track.id,
        fileName: track.fileName,
        language: track.language,
        source: track.source,
        enabled: track.enabled,
        offset: track.offset,
      }));

      sendResponse({ success: true, tracks: trackData });
    } catch (error) {
      console.error('Failed to get subtitle tracks:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tracks',
      });
    }
  }

  private handleAnnotationCreated(annotation: Annotation): void {
    // Notify background script about new annotation for synchronization
    this.notifyBackgroundScript('ANNOTATION_CREATED', {
      annotation,
    });
  }

  private handleAnnotationUpdated(annotation: Annotation): void {
    // Notify background script about annotation update for synchronization
    this.notifyBackgroundScript('ANNOTATION_UPDATED', {
      annotationId: annotation.id,
      updates: annotation,
    });
  }

  private handleAnnotationDeleted(annotationId: string): void {
    // Notify background script about annotation deletion for synchronization
    this.notifyBackgroundScript('ANNOTATION_DELETED', {
      annotationId,
    });
  }

  private handleLayerVisibilityChanged(layerId: string, visible: boolean): void {
    // Notify background script about layer visibility change for synchronization
    this.notifyBackgroundScript('LAYER_VISIBILITY_CHANGED', {
      layerId,
      visible,
    });
  }

  // Collaboration event handlers
  private handlePollCreated(poll: any): void {
    console.log('Poll created:', poll.id, poll.title);
    this.notifyBackgroundScript('POLL_CREATED', { poll });
  }

  private handleQuizCreated(quiz: any): void {
    console.log('Quiz created:', quiz.id, quiz.title);
    this.notifyBackgroundScript('QUIZ_CREATED', { quiz });
  }

  private handleBookmarkCreated(bookmark: any): void {
    console.log('Bookmark created:', bookmark.id, bookmark.title);
    this.notifyBackgroundScript('BOOKMARK_CREATED', { bookmark });
  }

  private handleHighlightCreated(highlight: any): void {
    console.log('Highlight created:', highlight.id, highlight.title);
    this.notifyBackgroundScript('HIGHLIGHT_CREATED', { highlight });
  }

  private handleWhiteboardAnnotationCreated(annotation: any): void {
    console.log('Whiteboard annotation created:', annotation.id, annotation.type);
    this.notifyBackgroundScript('WHITEBOARD_ANNOTATION_CREATED', { annotation });
  }

  private handleMomentShared(moment: any): void {
    console.log('Moment shared:', moment.id, moment.title);
    this.notifyBackgroundScript('MOMENT_SHARED', { moment });
  }

  // Avatar overlay handlers
  private handleAvatarUpdate(avatar: any): void {
    console.log('Avatar updated:', avatar.id, avatar.displayName);
    this.notifyBackgroundScript('AVATAR_UPDATED', { avatar });
  }

  private handleAvatarMove(avatar: any): void {
    console.log('Avatar moved:', avatar.id, `(${avatar.x.toFixed(2)}, ${avatar.y.toFixed(2)})`);
    this.notifyBackgroundScript('AVATAR_MOVED', { avatar });
  }

  private handleAvatarAnimate(avatar: any, animationKey: string): void {
    console.log('Avatar animated:', avatar.id, animationKey);
    this.notifyBackgroundScript('AVATAR_ANIMATED', { avatar, animationKey });
  }

  private handleAvatarChatBubble(avatar: any, message: string): void {
    console.log('Avatar chat bubble:', avatar.id, message);
    this.notifyBackgroundScript('AVATAR_CHAT_BUBBLE', { avatar, message });
  }

  private handleAvatarVoiceActivity(avatar: any, speaking: boolean): void {
    console.log('Avatar voice activity:', avatar.id, speaking);
    this.notifyBackgroundScript('AVATAR_VOICE_ACTIVITY', { avatar, speaking });
  }

  private handleCollaborationExport(message: any): any {
    switch (message.exportType) {
      case 'poll':
        const pollResults = this.collaborationManager.getPollResults(message.pollId);
        if (pollResults) {
          return this.collaborationManager.exportPollResults(
            pollResults.poll,
            pollResults.votes,
            message.userId,
            message.userName
          );
        }
        throw new Error('Poll not found');

      case 'quiz':
        const quizResults = this.collaborationManager.getQuizResults(message.quizId);
        if (quizResults) {
          return this.collaborationManager.exportQuizResults(
            quizResults.quiz,
            quizResults.responses,
            message.userId,
            message.userName
          );
        }
        throw new Error('Quiz not found');

      case 'bookmarks':
        const bookmarks = this.collaborationManager.getBookmarksByRoom(message.roomId);
        return this.collaborationManager.exportBookmarks(
          bookmarks,
          message.userId,
          message.userName,
          message.title || 'Room Bookmarks',
          message.roomId
        );

      case 'highlights':
        const highlights = this.collaborationManager.getHighlightsByRoom(message.roomId);
        return this.collaborationManager.exportHighlights(
          highlights,
          message.userId,
          message.userName,
          message.title || 'Room Highlights',
          message.roomId
        );

      case 'whiteboard':
        const session = this.collaborationManager.getWhiteboardSession(message.sessionId);
        if (session) {
          return this.collaborationManager.exportWhiteboardSession(
            session,
            message.userId,
            message.userName
          );
        }
        throw new Error('Whiteboard session not found');

      default:
        throw new Error('Unknown export type: ' + message.exportType);
    }
  }

  /**
   * Inject avatar overlay on selected video
   */
  private injectAvatarOverlay(): void {
    if (
      !this.selectedVideo ||
      this.avatarOverlayInjected ||
      !this.currentUserId ||
      !this.currentRoomId
    ) {
      console.warn('Cannot inject avatar overlay: missing requirements');
      return;
    }

    try {
      // Initialize avatar manager if not already done
      if (!this.avatarManager) {
        this.avatarManager = new AvatarManager({
          roomId: this.currentRoomId,
          userId: this.currentUserId,
          userName: this.currentUserName || 'Unknown User',
          signalingSend: (message) => this.notifyBackgroundScript('AVATAR_SIGNALING', message),
          onAvatarUpdate: (avatar) => this.handleAvatarUpdate(avatar),
          onAvatarMove: (avatar) => this.handleAvatarMove(avatar),
          onAvatarAnimate: (avatar, animationKey) => this.handleAvatarAnimate(avatar, animationKey),
          onChatBubble: (avatar, message) => this.handleAvatarChatBubble(avatar, message),
          onVoiceActivity: (avatar, speaking) => this.handleAvatarVoiceActivity(avatar, speaking),
          overlayOptions: {
            updateRate: 30,
            avatarSize: 48,
            chatBubbleDuration: 4000,
            animationDuration: 2000,
            collisionAvoidance: true,
            voiceActivityGlow: true,
          },
        });
      }

      // Inject overlay on video element
      const success = this.avatarManager.injectOverlay(this.selectedVideo);

      if (success) {
        this.avatarOverlayInjected = true;
        console.log('Avatar overlay injected successfully');

        // Set up keyboard event listeners for avatar movement
        this.setupAvatarKeyboardListeners();
      } else {
        console.error('Failed to inject avatar overlay');
      }
    } catch (error) {
      console.error('Error injecting avatar overlay:', error);
    }
  }

  /**
   * Remove avatar overlay
   */
  private removeAvatarOverlay(): void {
    if (this.avatarManager) {
      this.avatarManager.removeOverlay();
      this.removeAvatarKeyboardListeners();
    }

    this.avatarOverlayInjected = false;
    console.log('Avatar overlay removed');
  }

  /**
   * Set up keyboard listeners for avatar movement
   */
  private setupAvatarKeyboardListeners(): void {
    if (!this.avatarManager) return;

    document.addEventListener('keydown', this.handleAvatarKeyDown);
    document.addEventListener('keyup', this.handleAvatarKeyUp);
  }

  /**
   * Remove keyboard listeners for avatar movement
   */
  private removeAvatarKeyboardListeners(): void {
    document.removeEventListener('keydown', this.handleAvatarKeyDown);
    document.removeEventListener('keyup', this.handleAvatarKeyUp);
  }

  /**
   * Handle avatar keyboard input
   */
  private handleAvatarKeyDown = (event: KeyboardEvent): void => {
    if (this.avatarManager && this.avatarOverlayInjected) {
      this.avatarManager.handleKeyDown(event);
    }
  };

  /**
   * Handle avatar keyboard release
   */
  private handleAvatarKeyUp = (event: KeyboardEvent): void => {
    if (this.avatarManager && this.avatarOverlayInjected) {
      this.avatarManager.handleKeyUp(event);
    }
  };

  private handleCreateAnnotationLayer(layerId: string, layerName: string): void {
    const success = this.annotationLayer.createLayer(layerId, layerName);
    if (success) {
      console.log('Annotation layer created:', layerId, layerName);
    } else {
      console.warn('Failed to create annotation layer:', layerId);
    }
  }

  private handleDeleteAnnotationLayer(layerId: string): void {
    const success = this.annotationLayer.deleteLayer(layerId);
    if (success) {
      console.log('Annotation layer deleted:', layerId);
    } else {
      console.warn('Failed to delete annotation layer:', layerId);
    }
  }

  private cleanup() {
    this.videoDetector.stopDetection();
    this.reactionOverlay.removeOverlay();

    // Clean up annotation overlay
    if (this.annotationOverlayInjected) {
      this.annotationLayer.removeOverlay();
      this.annotationOverlayInjected = false;
    }

    // Clean up subtitle rendering
    if (this.subtitleRenderInterval) {
      clearInterval(this.subtitleRenderInterval);
      this.subtitleRenderInterval = null;
    }

    // Remove subtitle container
    if (this.subtitleContainer) {
      this.subtitleContainer.remove();
      this.subtitleContainer = null;
    }

    // Clear subtitle engine
    this.subtitleEngine.clearAllTracks();
  }

  private async handleSaveUserPreferences(userId: string, sendResponse: (response: any) => void) {
    try {
      await this.subtitleEngine.saveUserPreferences(userId);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Save failed',
      });
    }
  }

  private async handleLoadUserPreferences(userId: string, sendResponse: (response: any) => void) {
    try {
      await this.subtitleEngine.loadUserPreferences(userId);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Load failed',
      });
    }
  }

  private handleGetUserPreferences(userId: string, sendResponse: (response: any) => void) {
    try {
      const preferences = this.subtitleEngine.getUserPreferences(userId);
      sendResponse({ success: true, preferences });
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Get preferences failed',
      });
    }
  }

  private handleGetAvailableLanguages(userId: string, sendResponse: (response: any) => void) {
    try {
      const languages = this.subtitleEngine.getAvailableLanguages(userId);
      sendResponse({ success: true, languages });
    } catch (error) {
      console.error('Failed to get available languages:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Get languages failed',
      });
    }
  }

  private async handleAutoDownloadSubtitles(
    userId: string,
    videoInfo: any,
    sendResponse: (response: any) => void
  ) {
    try {
      const tracks = await this.subtitleEngine.autoDownloadSubtitles(userId, videoInfo);
      sendResponse({
        success: true,
        tracks: tracks.map((track) => ({
          id: track.id,
          fileName: track.fileName,
          language: track.language,
        })),
      });

      if (tracks.length > 0) {
        console.log(`Auto-downloaded ${tracks.length} subtitle tracks`);
      }
    } catch (error) {
      console.error('Failed to auto-download subtitles:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Auto-download failed',
      });
    }
  }
}

// Initialize content script
const contentScript = new ContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  contentScript['cleanup']();
});
