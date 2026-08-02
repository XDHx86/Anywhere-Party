/**
 * Collaboration Panel UI Component
 * Provides interface for polls, quizzes, bookmarks, highlights, and whiteboard
 * Implements requirements 9.1, 9.2, 9.3
 */

import { CollaborationManager } from '../../@core/collaboration';
import {
  Poll,
  Quiz,
  Bookmark,
  Highlight,
  WhiteboardSession,
} from '../../@core/collaboration/types';

export interface CollaborationPanelOptions {
  collaborationManager: CollaborationManager;
  currentUserId: string;
  currentUserName: string;
  roomId: string;
  videoElement?: HTMLVideoElement;
  onPollCreated?: (poll: Poll) => void;
  onQuizCreated?: (quiz: Quiz) => void;
  onBookmarkCreated?: (bookmark: Bookmark) => void;
  onHighlightCreated?: (highlight: Highlight) => void;
  onWhiteboardSessionCreated?: (session: WhiteboardSession) => void;
}

export class CollaborationPanel {
  private container: HTMLElement;
  private options: CollaborationPanelOptions;
  private activeTab: 'polls' | 'bookmarks' | 'whiteboard' | 'export' = 'polls';
  private currentVideoTimestamp = 0;

  constructor(container: HTMLElement, options: CollaborationPanelOptions) {
    this.container = container;
    this.options = options;

    this.render();
    this.attachEventListeners();
    this.setupVideoTimeTracking();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="collaboration-panel">
        <div class="collaboration-tabs">
          <button class="tab-btn active" data-tab="polls">📊 Polls & Quizzes</button>
          <button class="tab-btn" data-tab="bookmarks">🔖 Bookmarks</button>
          <button class="tab-btn" data-tab="whiteboard">🎨 Whiteboard</button>
          <button class="tab-btn" data-tab="export">📤 Export</button>
        </div>

        <div class="collaboration-content">
          <!-- Polls & Quizzes Tab -->
          <div class="tab-content active" data-tab="polls">
            <div class="section">
              <h3>Create Poll</h3>
              <div class="poll-form">
                <input type="text" id="poll-title" placeholder="Poll title" maxlength="100">
                <textarea id="poll-question" placeholder="Poll question" maxlength="500" rows="2"></textarea>
                <div class="poll-options">
                  <input type="text" class="poll-option" placeholder="Option 1" maxlength="100">
                  <input type="text" class="poll-option" placeholder="Option 2" maxlength="100">
                  <button id="add-poll-option" class="btn-secondary">+ Add Option</button>
                </div>
                <div class="poll-settings">
                  <label><input type="checkbox" id="poll-multiple"> Allow multiple choices</label>
                  <label><input type="checkbox" id="poll-anonymous"> Anonymous voting</label>
                  <label>Duration: <input type="number" id="poll-duration" value="60" min="10" max="600"> seconds</label>
                </div>
                <button id="create-poll" class="btn-primary">Create Poll</button>
              </div>
            </div>

            <div class="section">
              <h3>Create Quiz</h3>
              <div class="quiz-form">
                <input type="text" id="quiz-title" placeholder="Quiz title" maxlength="100">
                <div class="quiz-questions" id="quiz-questions">
                  <div class="quiz-question">
                    <input type="text" class="question-text" placeholder="Question 1" maxlength="200">
                    <select class="question-type">
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="text">Text Answer</option>
                    </select>
                    <div class="question-options">
                      <input type="text" class="option-text" placeholder="Option A" maxlength="100">
                      <input type="text" class="option-text" placeholder="Option B" maxlength="100">
                    </div>
                    <input type="number" class="question-points" value="1" min="1" max="10" placeholder="Points">
                  </div>
                </div>
                <button id="add-quiz-question" class="btn-secondary">+ Add Question</button>
                <div class="quiz-settings">
                  <label><input type="checkbox" id="quiz-anonymous"> Anonymous responses</label>
                  <label>Duration: <input type="number" id="quiz-duration" value="300" min="60" max="1800"> seconds</label>
                </div>
                <button id="create-quiz" class="btn-primary">Create Quiz</button>
              </div>
            </div>

            <div class="section">
              <h3>Active Polls & Quizzes</h3>
              <div id="active-polls-quizzes" class="active-items"></div>
            </div>
          </div>

          <!-- Bookmarks Tab -->
          <div class="tab-content" data-tab="bookmarks">
            <div class="section">
              <h3>Create Bookmark</h3>
              <div class="bookmark-form">
                <input type="text" id="bookmark-title" placeholder="Bookmark title" maxlength="100">
                <textarea id="bookmark-description" placeholder="Description (optional)" maxlength="500" rows="2"></textarea>
                <input type="text" id="bookmark-tags" placeholder="Tags (comma-separated)">
                <label><input type="checkbox" id="bookmark-public" checked> Make public</label>
                <button id="create-bookmark" class="btn-primary">📌 Bookmark Current Time</button>
              </div>
            </div>

            <div class="section">
              <h3>Create Highlight</h3>
              <div class="highlight-form">
                <input type="text" id="highlight-title" placeholder="Highlight title" maxlength="100">
                <textarea id="highlight-description" placeholder="Description (optional)" maxlength="500" rows="2"></textarea>
                <div class="time-range">
                  <label>Start: <input type="number" id="highlight-start" step="0.1" min="0"> seconds</label>
                  <label>End: <input type="number" id="highlight-end" step="0.1" min="0"> seconds</label>
                  <button id="set-current-time" class="btn-secondary">Use Current Time</button>
                </div>
                <input type="text" id="highlight-tags" placeholder="Tags (comma-separated)">
                <label><input type="checkbox" id="highlight-public" checked> Make public</label>
                <button id="create-highlight" class="btn-primary">✨ Create Highlight</button>
              </div>
            </div>

            <div class="section">
              <h3>Room Bookmarks & Highlights</h3>
              <div class="search-bar">
                <input type="text" id="bookmark-search" placeholder="Search bookmarks and highlights...">
                <button id="search-bookmarks" class="btn-secondary">🔍</button>
              </div>
              <div id="bookmarks-highlights" class="bookmarks-list"></div>
            </div>
          </div>

          <!-- Whiteboard Tab -->
          <div class="tab-content" data-tab="whiteboard">
            <div class="section">
              <h3>Whiteboard Sessions</h3>
              <button id="create-whiteboard" class="btn-primary">🎨 Start Whiteboard Session</button>
              <div id="whiteboard-sessions" class="whiteboard-list"></div>
            </div>

            <div class="section">
              <h3>Whiteboard Tools</h3>
              <div id="whiteboard-tools" class="tool-grid"></div>
            </div>
          </div>

          <!-- Export Tab -->
          <div class="tab-content" data-tab="export">
            <div class="section">
              <h3>Export Results</h3>
              <div class="export-options">
                <button id="export-polls" class="btn-secondary">📊 Export Poll Results</button>
                <button id="export-quizzes" class="btn-secondary">📝 Export Quiz Results</button>
                <button id="export-bookmarks" class="btn-secondary">🔖 Export Bookmarks</button>
                <button id="export-highlights" class="btn-secondary">✨ Export Highlights</button>
                <button id="export-whiteboard" class="btn-secondary">🎨 Export Whiteboard</button>
              </div>
            </div>

            <div class="section">
              <h3>Create Shareable Moment</h3>
              <div class="moment-form">
                <input type="text" id="moment-title" placeholder="Moment title" maxlength="100">
                <textarea id="moment-description" placeholder="Description" maxlength="500" rows="2"></textarea>
                <div class="time-range">
                  <label>Start: <input type="number" id="moment-start" step="0.1" min="0"> seconds</label>
                  <label>End: <input type="number" id="moment-end" step="0.1" min="0"> seconds</label>
                </div>
                <button id="create-moment" class="btn-primary">🔗 Create Shareable Moment</button>
              </div>
            </div>

            <div class="section">
              <h3>Exported Results</h3>
              <div id="exported-results" class="export-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    this.loadActiveContent();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .collaboration-panel {
        background: #f8f9fa;
        border-radius: 8px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }

      .collaboration-tabs {
        display: flex;
        background: #e9ecef;
        border-bottom: 1px solid #dee2e6;
      }

      .tab-btn {
        flex: 1;
        padding: 12px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .tab-btn:hover {
        background: #dee2e6;
      }

      .tab-btn.active {
        background: #007bff;
        color: white;
      }

      .collaboration-content {
        max-height: 500px;
        overflow-y: auto;
      }

      .tab-content {
        display: none;
        padding: 16px;
      }

      .tab-content.active {
        display: block;
      }

      .section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e9ecef;
      }

      .section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #495057;
      }

      .poll-form, .quiz-form, .bookmark-form, .highlight-form, .moment-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .poll-form input, .poll-form textarea,
      .quiz-form input, .quiz-form textarea, .quiz-form select,
      .bookmark-form input, .bookmark-form textarea,
      .highlight-form input, .highlight-form textarea,
      .moment-form input, .moment-form textarea {
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
      }

      .poll-options {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .poll-option {
        padding: 6px 10px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 13px;
      }

      .poll-settings, .quiz-settings {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
      }

      .poll-settings label, .quiz-settings label {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .quiz-question {
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 8px;
        background: white;
      }

      .question-options {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 8px 0;
      }

      .time-range {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .time-range label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
      }

      .time-range input {
        width: 80px;
      }

      .search-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .search-bar input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
      }

      .btn-primary {
        padding: 10px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }

      .btn-primary:hover {
        background: #0056b3;
      }

      .btn-secondary {
        padding: 8px 12px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }

      .btn-secondary:hover {
        background: #545b62;
      }

      .active-items, .bookmarks-list, .whiteboard-list, .export-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .item-card {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 12px;
      }

      .item-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .item-meta {
        font-size: 12px;
        color: #6c757d;
        margin-bottom: 8px;
      }

      .item-actions {
        display: flex;
        gap: 8px;
      }

      .item-actions button {
        padding: 4px 8px;
        font-size: 11px;
        border: 1px solid #ced4da;
        background: white;
        border-radius: 3px;
        cursor: pointer;
      }

      .item-actions button:hover {
        background: #f8f9fa;
      }

      .export-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
      }

      .tool-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 8px;
      }

      .tool-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tool-item:hover {
        background: #f8f9fa;
        border-color: #007bff;
      }

      .tool-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }

      .tool-name {
        font-size: 11px;
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  }

  private attachEventListeners(): void {
    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.dataset.tab as any;
        this.switchTab(tabName);
      });
    });

    // Poll creation
    this.container.querySelector('#create-poll')?.addEventListener('click', () => {
      this.createPoll();
    });

    this.container.querySelector('#add-poll-option')?.addEventListener('click', () => {
      this.addPollOption();
    });

    // Quiz creation
    this.container.querySelector('#create-quiz')?.addEventListener('click', () => {
      this.createQuiz();
    });

    this.container.querySelector('#add-quiz-question')?.addEventListener('click', () => {
      this.addQuizQuestion();
    });

    // Bookmark creation
    this.container.querySelector('#create-bookmark')?.addEventListener('click', () => {
      this.createBookmark();
    });

    // Highlight creation
    this.container.querySelector('#create-highlight')?.addEventListener('click', () => {
      this.createHighlight();
    });

    this.container.querySelector('#set-current-time')?.addEventListener('click', () => {
      this.setCurrentTimeForHighlight();
    });

    // Search
    this.container.querySelector('#search-bookmarks')?.addEventListener('click', () => {
      this.searchBookmarks();
    });

    // Whiteboard
    this.container.querySelector('#create-whiteboard')?.addEventListener('click', () => {
      this.createWhiteboardSession();
    });

    // Export
    this.container.querySelector('#export-polls')?.addEventListener('click', () => {
      this.exportPolls();
    });

    this.container.querySelector('#create-moment')?.addEventListener('click', () => {
      this.createShareableMoment();
    });
  }

  private setupVideoTimeTracking(): void {
    if (this.options.videoElement) {
      const updateTime = () => {
        this.currentVideoTimestamp = this.options.videoElement?.currentTime || 0;
      };

      this.options.videoElement.addEventListener('timeupdate', updateTime);
      updateTime(); // Initial update
    }
  }

  private switchTab(tabName: 'polls' | 'bookmarks' | 'whiteboard' | 'export'): void {
    this.activeTab = tabName;

    // Update tab buttons
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
    });

    // Update tab content
    this.container.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.toggle('active', (content as HTMLElement).dataset.tab === tabName);
    });

    this.loadActiveContent();
  }

  private loadActiveContent(): void {
    switch (this.activeTab) {
      case 'polls':
        this.loadActivePollsAndQuizzes();
        break;
      case 'bookmarks':
        this.loadBookmarksAndHighlights();
        break;
      case 'whiteboard':
        this.loadWhiteboardSessions();
        this.loadWhiteboardTools();
        break;
      case 'export':
        this.loadExportedResults();
        break;
    }
  }

  private createPoll(): void {
    const titleInput = this.container.querySelector('#poll-title') as HTMLInputElement;
    const questionInput = this.container.querySelector('#poll-question') as HTMLTextAreaElement;
    const optionInputs = this.container.querySelectorAll(
      '.poll-option'
    ) as NodeListOf<HTMLInputElement>;
    const multipleCheckbox = this.container.querySelector('#poll-multiple') as HTMLInputElement;
    const anonymousCheckbox = this.container.querySelector('#poll-anonymous') as HTMLInputElement;
    const durationInput = this.container.querySelector('#poll-duration') as HTMLInputElement;

    const title = titleInput.value.trim();
    const question = questionInput.value.trim();
    const options = Array.from(optionInputs)
      .map((input) => input.value.trim())
      .filter((option) => option.length > 0);

    if (!title || !question || options.length < 2) {
      alert('Please fill in all required fields and provide at least 2 options');
      return;
    }

    try {
      const poll = this.options.collaborationManager.createPoll(
        this.options.currentUserId,
        this.options.currentUserName,
        this.options.roomId,
        title,
        question,
        options,
        this.currentVideoTimestamp,
        parseInt(durationInput.value),
        multipleCheckbox.checked,
        anonymousCheckbox.checked
      );

      // Clear form
      titleInput.value = '';
      questionInput.value = '';
      optionInputs.forEach((input) => (input.value = ''));
      multipleCheckbox.checked = false;
      anonymousCheckbox.checked = false;
      durationInput.value = '60';

      this.options.onPollCreated?.(poll);
      this.loadActivePollsAndQuizzes();

      console.log('Poll created successfully:', poll.id);
    } catch (error) {
      alert('Failed to create poll: ' + (error as Error).message);
    }
  }

  private addPollOption(): void {
    const optionsContainer = this.container.querySelector('.poll-options');
    const optionCount = optionsContainer?.querySelectorAll('.poll-option').length || 0;

    if (optionCount >= 10) {
      alert('Maximum 10 options allowed');
      return;
    }

    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'poll-option';
    newOption.placeholder = `Option ${optionCount + 1}`;
    newOption.maxLength = 100;

    const addButton = optionsContainer?.querySelector('#add-poll-option');
    addButton?.parentNode?.insertBefore(newOption, addButton);
  }

  private createQuiz(): void {
    // Implementation for quiz creation
    console.log('Quiz creation not fully implemented in this demo');
  }

  private addQuizQuestion(): void {
    // Implementation for adding quiz questions
    console.log('Quiz question addition not fully implemented in this demo');
  }

  private async createBookmark(): Promise<void> {
    const titleInput = this.container.querySelector('#bookmark-title') as HTMLInputElement;
    const descriptionInput = this.container.querySelector(
      '#bookmark-description'
    ) as HTMLTextAreaElement;
    const tagsInput = this.container.querySelector('#bookmark-tags') as HTMLInputElement;
    const publicCheckbox = this.container.querySelector('#bookmark-public') as HTMLInputElement;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (!title) {
      alert('Please enter a bookmark title');
      return;
    }

    try {
      const bookmark = await this.options.collaborationManager.createBookmark(
        this.options.currentUserId,
        this.options.currentUserName,
        this.options.roomId,
        title,
        this.currentVideoTimestamp,
        this.options.videoElement,
        description || undefined,
        tags,
        publicCheckbox.checked
      );

      // Clear form
      titleInput.value = '';
      descriptionInput.value = '';
      tagsInput.value = '';
      publicCheckbox.checked = true;

      this.options.onBookmarkCreated?.(bookmark);
      this.loadBookmarksAndHighlights();

      console.log('Bookmark created successfully:', bookmark.id);
    } catch (error) {
      alert('Failed to create bookmark: ' + (error as Error).message);
    }
  }

  private async createHighlight(): Promise<void> {
    const titleInput = this.container.querySelector('#highlight-title') as HTMLInputElement;
    const descriptionInput = this.container.querySelector(
      '#highlight-description'
    ) as HTMLTextAreaElement;
    const startInput = this.container.querySelector('#highlight-start') as HTMLInputElement;
    const endInput = this.container.querySelector('#highlight-end') as HTMLInputElement;
    const tagsInput = this.container.querySelector('#highlight-tags') as HTMLInputElement;
    const publicCheckbox = this.container.querySelector('#highlight-public') as HTMLInputElement;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const startTime = parseFloat(startInput.value);
    const endTime = parseFloat(endInput.value);
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (!title || isNaN(startTime) || isNaN(endTime)) {
      alert('Please fill in all required fields');
      return;
    }

    if (startTime >= endTime) {
      alert('End time must be after start time');
      return;
    }

    try {
      const highlight = await this.options.collaborationManager.createHighlight(
        this.options.currentUserId,
        this.options.currentUserName,
        this.options.roomId,
        title,
        startTime,
        endTime,
        this.options.videoElement,
        description || undefined,
        tags,
        publicCheckbox.checked
      );

      // Clear form
      titleInput.value = '';
      descriptionInput.value = '';
      startInput.value = '';
      endInput.value = '';
      tagsInput.value = '';
      publicCheckbox.checked = true;

      this.options.onHighlightCreated?.(highlight);
      this.loadBookmarksAndHighlights();

      console.log('Highlight created successfully:', highlight.id);
    } catch (error) {
      alert('Failed to create highlight: ' + (error as Error).message);
    }
  }

  private setCurrentTimeForHighlight(): void {
    const startInput = this.container.querySelector('#highlight-start') as HTMLInputElement;
    const endInput = this.container.querySelector('#highlight-end') as HTMLInputElement;

    const currentTime = this.currentVideoTimestamp;
    startInput.value = currentTime.toFixed(1);
    endInput.value = (currentTime + 30).toFixed(1); // Default 30-second highlight
  }

  private searchBookmarks(): void {
    const searchInput = this.container.querySelector('#bookmark-search') as HTMLInputElement;
    const query = searchInput.value.trim();

    if (!query) {
      this.loadBookmarksAndHighlights();
      return;
    }

    const results = this.options.collaborationManager.searchBookmarksAndHighlights(
      query,
      this.options.roomId
    );
    this.displayBookmarksAndHighlights(results.bookmarks, results.highlights);
  }

  private createWhiteboardSession(): void {
    try {
      const session = this.options.collaborationManager.createWhiteboardSession(
        this.options.roomId,
        this.currentVideoTimestamp,
        this.options.currentUserId
      );

      this.options.onWhiteboardSessionCreated?.(session);
      this.loadWhiteboardSessions();

      console.log('Whiteboard session created:', session.id);
    } catch (error) {
      alert('Failed to create whiteboard session: ' + (error as Error).message);
    }
  }

  private exportPolls(): void {
    const polls = this.options.collaborationManager.getActivePollsByRoom(this.options.roomId);

    polls.forEach((poll) => {
      const results = this.options.collaborationManager.getPollResults(poll.id);
      if (results) {
        this.options.collaborationManager.exportPollResults(
          results.poll,
          results.votes,
          this.options.currentUserId,
          this.options.currentUserName
        );
      }
    });

    this.loadExportedResults();
    console.log('Polls exported');
  }

  private createShareableMoment(): void {
    const titleInput = this.container.querySelector('#moment-title') as HTMLInputElement;
    const descriptionInput = this.container.querySelector(
      '#moment-description'
    ) as HTMLTextAreaElement;
    const startInput = this.container.querySelector('#moment-start') as HTMLInputElement;
    const endInput = this.container.querySelector('#moment-end') as HTMLInputElement;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const startTime = parseFloat(startInput.value);
    const endTime = parseFloat(endInput.value);

    if (!title || isNaN(startTime) || isNaN(endTime)) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Get relevant data for the time range
      const bookmarks = this.options.collaborationManager.getBookmarksInTimeRange(
        this.options.roomId,
        startTime,
        endTime
      );
      const highlights = this.options.collaborationManager.getHighlightsInTimeRange(
        this.options.roomId,
        startTime,
        endTime
      );

      const moment = this.options.collaborationManager.createShareableMoment(
        title,
        this.options.roomId,
        startTime,
        endTime,
        this.options.currentUserId,
        this.options.currentUserName,
        description || undefined,
        undefined, // videoUrl
        undefined, // thumbnail
        [], // annotations
        [], // polls
        bookmarks,
        highlights
      );

      // Clear form
      titleInput.value = '';
      descriptionInput.value = '';
      startInput.value = '';
      endInput.value = '';

      console.log('Shareable moment created:', moment.id);
    } catch (error) {
      alert('Failed to create shareable moment: ' + (error as Error).message);
    }
  }

  private loadActivePollsAndQuizzes(): void {
    const container = this.container.querySelector('#active-polls-quizzes');
    if (!container) return;

    const polls = this.options.collaborationManager.getActivePollsByRoom(this.options.roomId);
    const quizzes = this.options.collaborationManager.getActiveQuizzesByRoom(this.options.roomId);

    container.innerHTML = '';

    [...polls, ...quizzes].forEach((item) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item-card';
      itemElement.innerHTML = `
        <div class="item-title">${item.title}</div>
        <div class="item-meta">
          ${'question' in item ? 'Poll' : 'Quiz'} • 
          Created by ${item.userName || 'Anonymous'} • 
          ${Math.round((item.expiresAt - Date.now()) / 1000)}s remaining
        </div>
        <div class="item-actions">
          <button onclick="this.closest('.collaboration-panel').dispatchEvent(new CustomEvent('vote-poll', {detail: '${item.id}'}))">
            ${'question' in item ? 'Vote' : 'Take Quiz'}
          </button>
        </div>
      `;
      container.appendChild(itemElement);
    });

    if (polls.length === 0 && quizzes.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: #6c757d; padding: 20px;">No active polls or quizzes</div>';
    }
  }

  private loadBookmarksAndHighlights(): void {
    const bookmarks = this.options.collaborationManager.getBookmarksByRoom(this.options.roomId);
    const highlights = this.options.collaborationManager.getHighlightsByRoom(this.options.roomId);

    this.displayBookmarksAndHighlights(bookmarks, highlights);
  }

  private displayBookmarksAndHighlights(bookmarks: Bookmark[], highlights: Highlight[]): void {
    const container = this.container.querySelector('#bookmarks-highlights');
    if (!container) return;

    container.innerHTML = '';

    // Combine and sort by timestamp
    const allItems = [
      ...bookmarks.map((b) => ({ ...b, type: 'bookmark' as const })),
      ...highlights.map((h) => ({ ...h, type: 'highlight' as const })),
    ].sort((a, b) => {
      const aTime = 'videoTimestamp' in a ? a.videoTimestamp : a.startTimestamp;
      const bTime = 'videoTimestamp' in b ? b.videoTimestamp : b.startTimestamp;
      return aTime - bTime;
    });

    allItems.forEach((item) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item-card';

      const timestamp =
        'videoTimestamp' in item
          ? `${Math.floor(item.videoTimestamp / 60)}:${Math.floor(item.videoTimestamp % 60)
              .toString()
              .padStart(2, '0')}`
          : `${Math.floor(item.startTimestamp / 60)}:${Math.floor(item.startTimestamp % 60)
              .toString()
              .padStart(2, '0')} - ${Math.floor(item.endTimestamp / 60)}:${Math.floor(
              item.endTimestamp % 60
            )
              .toString()
              .padStart(2, '0')}`;

      itemElement.innerHTML = `
        <div class="item-title">${item.type === 'bookmark' ? '🔖' : '✨'} ${item.title}</div>
        <div class="item-meta">
          ${item.type === 'bookmark' ? 'Bookmark' : 'Highlight'} • 
          ${timestamp} • 
          By ${item.userName || 'Anonymous'}
        </div>
        ${item.description ? `<div style="font-size: 12px; color: #6c757d; margin: 4px 0;">${item.description}</div>` : ''}
        ${item.tags.length > 0 ? `<div style="font-size: 11px; color: #007bff;">${item.tags.map((tag) => `#${tag}`).join(' ')}</div>` : ''}
        <div class="item-actions">
          <button onclick="this.closest('.collaboration-panel').dispatchEvent(new CustomEvent('seek-to', {detail: ${item.type === 'bookmark' ? item.videoTimestamp : item.startTimestamp}}))">
            Go to Time
          </button>
        </div>
      `;
      container.appendChild(itemElement);
    });

    if (allItems.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: #6c757d; padding: 20px;">No bookmarks or highlights yet</div>';
    }
  }

  private loadWhiteboardSessions(): void {
    const container = this.container.querySelector('#whiteboard-sessions');
    if (!container) return;

    const sessions = this.options.collaborationManager.getWhiteboardSessionsByRoom(
      this.options.roomId
    );

    container.innerHTML = '';

    sessions.forEach((session) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item-card';
      itemElement.innerHTML = `
        <div class="item-title">🎨 Whiteboard Session</div>
        <div class="item-meta">
          ${session.participants.length} participants • 
          ${session.layers.length} layers • 
          Created ${new Date(session.createdAt).toLocaleString()}
        </div>
        <div class="item-actions">
          <button onclick="this.closest('.collaboration-panel').dispatchEvent(new CustomEvent('join-whiteboard', {detail: '${session.id}'}))">
            Join Session
          </button>
        </div>
      `;
      container.appendChild(itemElement);
    });

    if (sessions.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: #6c757d; padding: 20px;">No whiteboard sessions</div>';
    }
  }

  private loadWhiteboardTools(): void {
    const container = this.container.querySelector('#whiteboard-tools');
    if (!container) return;

    const tools = this.options.collaborationManager.getWhiteboardTools();

    container.innerHTML = '';

    tools.forEach((tool) => {
      const toolElement = document.createElement('div');
      toolElement.className = 'tool-item';
      toolElement.innerHTML = `
        <div class="tool-icon">${tool.icon}</div>
        <div class="tool-name">${tool.name}</div>
      `;
      container.appendChild(toolElement);
    });
  }

  private loadExportedResults(): void {
    const container = this.container.querySelector('#exported-results');
    if (!container) return;

    const results = this.options.collaborationManager.getUserActivity(
      this.options.currentUserId
    ).exportedResults;

    container.innerHTML = '';

    results.forEach((result: any) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'item-card';
      itemElement.innerHTML = `
        <div class="item-title">${result.title}</div>
        <div class="item-meta">
          ${result.type} • 
          Exported ${new Date(result.exportedAt).toLocaleString()}
        </div>
        <div class="item-actions">
          <button onclick="this.closest('.collaboration-panel').dispatchEvent(new CustomEvent('download-export', {detail: {id: '${result.id}', format: 'json'}}))">
            Download JSON
          </button>
          ${
            result.type === 'poll' || result.type === 'quiz'
              ? `
            <button onclick="this.closest('.collaboration-panel').dispatchEvent(new CustomEvent('download-export', {detail: {id: '${result.id}', format: 'csv'}}))">
              Download CSV
            </button>
          `
              : ''
          }
        </div>
      `;
      container.appendChild(itemElement);
    });

    if (results.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: #6c757d; padding: 20px;">No exported results</div>';
    }
  }

  // Public methods for external integration
  public refreshContent(): void {
    this.loadActiveContent();
  }

  public switchToTab(tabName: 'polls' | 'bookmarks' | 'whiteboard' | 'export'): void {
    this.switchTab(tabName);
  }

  public updateVideoTimestamp(timestamp: number): void {
    this.currentVideoTimestamp = timestamp;
  }
}
