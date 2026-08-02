/**
 * Subtitle file parsing utilities for SRT and VTT formats
 */

import { SubtitleCue, SubtitleValidationResult } from './types';

export class SubtitleParser {
  private static readonly MAX_CUE_TEXT_LENGTH = 1000;
  private static readonly MAX_CUES_PER_FILE = 10000;

  /**
   * Parse SRT format subtitle content
   */
  static parseSRT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      // Skip sequence number (first line)
      const timeLine = lines[1];
      const textLines = lines.slice(2);

      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
      );
      if (!timeMatch) continue;

      const startTime = this.parseTimeToSeconds(
        parseInt(timeMatch[1]), // hours
        parseInt(timeMatch[2]), // minutes
        parseInt(timeMatch[3]), // seconds
        parseInt(timeMatch[4]) // milliseconds
      );

      const endTime = this.parseTimeToSeconds(
        parseInt(timeMatch[5]), // hours
        parseInt(timeMatch[6]), // minutes
        parseInt(timeMatch[7]), // seconds
        parseInt(timeMatch[8]) // milliseconds
      );

      const text = textLines.join('\n').trim();
      if (text) {
        cues.push({
          startTime,
          endTime,
          text: this.sanitizeText(text),
          id: `srt-${cues.length}`,
        });
      }

      // Prevent memory exhaustion
      if (cues.length >= this.MAX_CUES_PER_FILE) {
        break;
      }
    }

    return cues;
  }

  /**
   * Parse VTT format subtitle content
   */
  static parseVTT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    let inCue = false;
    let currentCue: Partial<SubtitleCue> = {};
    let textLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and NOTE blocks
      if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
        continue;
      }

      // Empty line indicates end of cue or separator
      if (!line) {
        if (inCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
          const text = textLines.join('\n').trim();
          if (text) {
            cues.push({
              startTime: currentCue.startTime,
              endTime: currentCue.endTime,
              text: this.sanitizeText(text),
              id: currentCue.id || `vtt-${cues.length}`,
            });
          }
        }
        inCue = false;
        currentCue = {};
        textLines = [];
        continue;
      }

      // Check for time line
      const timeMatch = line.match(
        /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
      );
      if (timeMatch) {
        const startTime = this.parseTimeToSeconds(
          parseInt(timeMatch[1]), // hours
          parseInt(timeMatch[2]), // minutes
          parseInt(timeMatch[3]), // seconds
          parseInt(timeMatch[4]) // milliseconds
        );

        const endTime = this.parseTimeToSeconds(
          parseInt(timeMatch[5]), // hours
          parseInt(timeMatch[6]), // minutes
          parseInt(timeMatch[7]), // seconds
          parseInt(timeMatch[8]) // milliseconds
        );

        currentCue.startTime = startTime;
        currentCue.endTime = endTime;
        inCue = true;
        continue;
      }

      // If we're in a cue and this isn't a time line, it's text
      if (inCue) {
        textLines.push(line);
      } else if (!timeMatch && line && !line.includes('-->')) {
        // This might be a cue identifier
        currentCue.id = line;
      }

      // Prevent memory exhaustion
      if (cues.length >= this.MAX_CUES_PER_FILE) {
        break;
      }
    }

    // Handle last cue if file doesn't end with empty line
    if (inCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
      const text = textLines.join('\n').trim();
      if (text) {
        cues.push({
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          text: this.sanitizeText(text),
          id: currentCue.id || `vtt-${cues.length}`,
        });
      }
    }

    return cues;
  }

  /**
   * Validate subtitle content and format
   */
  static validateSubtitleContent(content: string): SubtitleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Subtitle content is empty');
      return { isValid: false, errors, warnings };
    }

    // Check for potential format
    const isVTT = content.includes('WEBVTT') || (content.includes('-->') && content.includes('.'));
    const isSRT = content.includes('-->') && content.includes(',');

    if (!isVTT && !isSRT) {
      errors.push('Unrecognized subtitle format. Expected SRT or VTT format.');
      return { isValid: false, errors, warnings };
    }

    const format: 'srt' | 'vtt' = isVTT ? 'vtt' : 'srt';
    let cues: SubtitleCue[] = [];

    try {
      cues = format === 'vtt' ? this.parseVTT(content) : this.parseSRT(content);
    } catch (error) {
      errors.push(
        `Failed to parse ${format.toUpperCase()} content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { isValid: false, errors, warnings };
    }

    if (cues.length === 0) {
      errors.push('No valid subtitle cues found');
      return { isValid: false, errors, warnings };
    }

    // Validate cue timing
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];

      if (cue.startTime >= cue.endTime) {
        warnings.push(
          `Cue ${i + 1}: Start time (${cue.startTime}s) is not before end time (${cue.endTime}s)`
        );
      }

      if (cue.startTime < 0) {
        warnings.push(`Cue ${i + 1}: Negative start time (${cue.startTime}s)`);
      }

      if (cue.text.length > this.MAX_CUE_TEXT_LENGTH) {
        warnings.push(
          `Cue ${i + 1}: Text exceeds maximum length (${cue.text.length} > ${this.MAX_CUE_TEXT_LENGTH})`
        );
      }
    }

    // Check for overlapping cues
    for (let i = 0; i < cues.length - 1; i++) {
      if (cues[i].endTime > cues[i + 1].startTime) {
        warnings.push(`Cues ${i + 1} and ${i + 2}: Overlapping timing detected`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cueCount: cues.length,
      format,
    };
  }

  /**
   * Convert time components to seconds
   */
  private static parseTimeToSeconds(
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
  ): number {
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Sanitize subtitle text to prevent XSS and clean up formatting
   */
  private static sanitizeText(text: string): string {
    let sanitized = text;

    // Remove script tags and their content completely
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove dangerous attributes from tags (but keep the tags)
    // Match: <tag attribute="value"> and remove only the dangerous attributes
    sanitized = sanitized.replace(/(<[^>]*?)\s+(on\w+|javascript:)[^>]*?>/gi, (match, tagStart) => {
      // Remove dangerous attributes but keep the tag
      const cleanTag = tagStart.replace(/\s+(on\w+|javascript:)[^>\s]*/gi, '');
      return cleanTag + '>';
    });

    // Remove all HTML tags except basic formatting ones
    sanitized = sanitized.replace(/<(?!\/?(?:b|i|u|font)\b)[^>]*>/gi, '');

    // Clean up excessive whitespace but preserve single newlines
    sanitized = sanitized.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
    sanitized = sanitized.replace(/\n\s+/g, '\n'); // Remove spaces after newlines
    sanitized = sanitized.replace(/\s+\n/g, '\n'); // Remove spaces before newlines
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines to 2
    sanitized = sanitized.trim();

    // Limit text length
    if (sanitized.length > this.MAX_CUE_TEXT_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_CUE_TEXT_LENGTH) + '...';
    }

    return sanitized;
  }
}
