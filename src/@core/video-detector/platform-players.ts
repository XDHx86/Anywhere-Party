/**
 * Platform-specific player integrations
 */

import { PlatformPlayer, VideoElement } from './types';

export class YouTubePlayer implements PlatformPlayer {
  name = 'YouTube';
  domains = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
  selectors = ['video.html5-main-video', '.html5-video-player video', '#movie_player video'];

  getVideo(): VideoElement | null {
    // Try YouTube-specific selectors first
    for (const selector of this.selectors) {
      const video = document.querySelector(selector) as VideoElement;
      if (video && video.tagName === 'VIDEO') {
        return video;
      }
    }
    return null;
  }

  canControl(): boolean {
    const video = this.getVideo();
    return video !== null;
  }

  async play(): Promise<void> {
    const video = this.getVideo();
    if (video && video.paused) {
      await video.play();
    }
  }

  async pause(): Promise<void> {
    const video = this.getVideo();
    if (video && !video.paused) {
      video.pause();
    }
  }

  async seek(time: number): Promise<void> {
    const video = this.getVideo();
    if (video) {
      video.currentTime = time;
    }
  }

  getCurrentTime(): number {
    const video = this.getVideo();
    return video?.currentTime || 0;
  }

  getDuration(): number {
    const video = this.getVideo();
    return video?.duration || 0;
  }
}

export class NetflixPlayer implements PlatformPlayer {
  name = 'Netflix';
  domains = ['netflix.com', 'www.netflix.com'];
  selectors = ['video[data-uia="video-player"]', '.VideoContainer video', '.watch-video video'];

  getVideo(): VideoElement | null {
    for (const selector of this.selectors) {
      const video = document.querySelector(selector) as VideoElement;
      if (video && video.tagName === 'VIDEO') {
        return video;
      }
    }
    return null;
  }

  canControl(): boolean {
    const video = this.getVideo();
    return video !== null;
  }

  async play(): Promise<void> {
    const video = this.getVideo();
    if (video && video.paused) {
      await video.play();
    }
  }

  async pause(): Promise<void> {
    const video = this.getVideo();
    if (video && !video.paused) {
      video.pause();
    }
  }

  async seek(time: number): Promise<void> {
    const video = this.getVideo();
    if (video) {
      video.currentTime = time;
    }
  }

  getCurrentTime(): number {
    const video = this.getVideo();
    return video?.currentTime || 0;
  }

  getDuration(): number {
    const video = this.getVideo();
    return video?.duration || 0;
  }
}

export class TwitchPlayer implements PlatformPlayer {
  name = 'Twitch';
  domains = ['twitch.tv', 'www.twitch.tv'];
  selectors = ['video[data-a-target="video-player"]', '.video-player video', '.player-video video'];

  getVideo(): VideoElement | null {
    for (const selector of this.selectors) {
      const video = document.querySelector(selector) as VideoElement;
      if (video && video.tagName === 'VIDEO') {
        return video;
      }
    }
    return null;
  }

  canControl(): boolean {
    const video = this.getVideo();
    return video !== null;
  }

  async play(): Promise<void> {
    const video = this.getVideo();
    if (video && video.paused) {
      await video.play();
    }
  }

  async pause(): Promise<void> {
    const video = this.getVideo();
    if (video && !video.paused) {
      video.pause();
    }
  }

  async seek(time: number): Promise<void> {
    const video = this.getVideo();
    if (video) {
      video.currentTime = time;
    }
  }

  getCurrentTime(): number {
    const video = this.getVideo();
    return video?.currentTime || 0;
  }

  getDuration(): number {
    const video = this.getVideo();
    return video?.duration || 0;
  }
}

export class GenericPlayer implements PlatformPlayer {
  name = 'Generic';
  domains = ['*'];
  selectors = ['video'];

  getVideo(): VideoElement | null {
    const videos = document.querySelectorAll('video') as NodeListOf<VideoElement>;
    if (videos.length === 0) return null;

    // Return the first video element found
    return videos[0] ?? null;
  }

  canControl(): boolean {
    const video = this.getVideo();
    return video !== null;
  }

  async play(): Promise<void> {
    const video = this.getVideo();
    if (video && video.paused) {
      await video.play();
    }
  }

  async pause(): Promise<void> {
    const video = this.getVideo();
    if (video && !video.paused) {
      video.pause();
    }
  }

  async seek(time: number): Promise<void> {
    const video = this.getVideo();
    if (video) {
      video.currentTime = time;
    }
  }

  getCurrentTime(): number {
    const video = this.getVideo();
    return video?.currentTime || 0;
  }

  getDuration(): number {
    const video = this.getVideo();
    return video?.duration || 0;
  }
}

export const PLATFORM_PLAYERS: PlatformPlayer[] = [
  new YouTubePlayer(),
  new NetflixPlayer(),
  new TwitchPlayer(),
  new GenericPlayer(), // Always last as fallback
];

export function getPlatformPlayer(hostname: string): PlatformPlayer {
  for (const player of PLATFORM_PLAYERS) {
    if (
      player.domains.includes('*') ||
      player.domains.some((domain) => hostname.includes(domain))
    ) {
      return player;
    }
  }
  // Generic fallback (always last; construct a fresh one as a safety net)
  return PLATFORM_PLAYERS[PLATFORM_PLAYERS.length - 1] ?? new GenericPlayer();
}
