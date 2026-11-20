/**
 * Aroha — Backend Orchestration Layer Type Definitions
 */

export type MediaFormat = 'video' | 'audio';

export interface DownloadOptions {
  format: MediaFormat;
  quality: string;
  outputDir: string;
  outputFilename?: string;
  audioFormat?: 'mp3' | 'wav' | 'aac' | 'm4a';
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  stdout?: string;
  command?: string;
}

export interface BinaryCheckResult {
  ytdlp: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  details?: {
    ytdlpVersion?: string;
    ffmpegVersion?: string;
    ffprobeVersion?: string;
    errors?: string[];
  };
}

export type ProgressReportingStrategy = 'indeterminate' | 'polling' | 'streaming';

export interface FolderPickerResult {
  path: string;
  token: any;
  folderName: string;
}

/**
 * Interface for the hybrid addon C++ bridge
 * Exposed by bolt-uxp hybrid template
 */
export interface IHybridAddon {
  execSync(cmd: string): string;
  exec(cmd: string): Promise<string>;
}
