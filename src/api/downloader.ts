/**
 * Aroha — Downloader Orchestration Layer
 * 
 * Interacts with bundled yt-dlp, ffmpeg, and ffprobe binaries via
 * the bolt-uxp hybrid plugin addon exec() and execSync() APIs.
 */

import { BinaryCheckResult, DownloadOptions, DownloadResult, IHybridAddon } from './types';

declare const require: any;
declare const process: any;

// Cached hybrid addon instance
let hybridAddonInstance: IHybridAddon | null = null;

/**
 * Retrieves the bolt-uxp hybrid addon bridge.
 * In a bolt-uxp template, the addon is typically required via bolt-uxp or native addon bindings.
 */
export function getHybridAddon(): IHybridAddon {
  if (hybridAddonInstance) {
    return hybridAddonInstance;
  }

  try {
    if (typeof require === 'function') {
      // 1. Try standard bolt-uxp addon require path
      try {
        const addon = require('../hybrid-addon') || require('./hybrid-addon') || require('bolt-uxp-hybrid');
        if (addon && typeof addon.exec === 'function') {
          hybridAddonInstance = addon;
          return hybridAddonInstance;
        }
      } catch {
        // Fallback check
      }

      // 2. Try window global if injected by bolt-uxp host
      if (typeof window !== 'undefined' && (window as any).hybridAddon) {
        hybridAddonInstance = (window as any).hybridAddon;
        return hybridAddonInstance!;
      }
    }
  } catch (err) {
    console.warn('[Aroha Downloader] Hybrid addon require failed:', err);
  }

  // Mock / Fallback bridge for browser dev mode & preview testing
  return {
    async exec(cmd: string): Promise<string> {
      console.log(`[Aroha Mock exec] Running: ${cmd}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return '[Aroha Mock] Download complete simulated output.';
    },
    execSync(cmd: string): string {
      console.log(`[Aroha Mock execSync] Running: ${cmd}`);
      return '[Aroha Mock] Binary version 2024.08.01';
    },
  };
}

/**
 * Injects a custom hybrid addon instance (useful for testing or custom host injection)
 */
export function setHybridAddon(addon: IHybridAddon): void {
  hybridAddonInstance = addon;
}

/**
 * 1. getPluginBinPath(): string
 * Resolves the absolute path to the `bin/` directory shipped inside the plugin package.
 * Automatically chooses the platform directory ('win-x64' or 'mac').
 */
export function getPluginBinPath(): string {
  // Determine current OS platform
  const isWindows = 
    (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));

  const platformDir = isWindows ? 'win-x64' : 'mac';

  // 1. Resolve plugin root folder using UXP localFileSystem.getPluginFolder()
  let pluginRootPath = '';
  try {
    if (typeof require === 'function') {
      const uxp = require('uxp');
      if (uxp && uxp.storage && uxp.storage.localFileSystem) {
        // In UXP, getPluginFolder() returns a folder object with .nativePath
        const pluginFolder = uxp.storage.localFileSystem.getPluginFolder();
        if (pluginFolder && pluginFolder.nativePath) {
          pluginRootPath = pluginFolder.nativePath;
        }
      }
    }
  } catch {
    // UXP storage not accessible in current context
  }

  // 2. Fallback to Node.js / bolt-uxp __dirname if available
  if (!pluginRootPath) {
    if (typeof __dirname !== 'undefined') {
      pluginRootPath = __dirname;
    } else {
      // Relative fallback
      pluginRootPath = '.';
    }
  }

  // Normalize path separators
  const separator = isWindows ? '\\' : '/';
  const cleanRoot = pluginRootPath.replace(/[/\\]+$/, '');
  
  return `${cleanRoot}${separator}bin${separator}${platformDir}`;
}

/**
 * Helper to get the absolute path to the bundled yt-dlp executable
 */
export function getYtDlpPath(): string {
  const binDir = getPluginBinPath();
  const isWindows = (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));
  const exe = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const sep = isWindows ? '\\' : '/';
  return `${binDir}${sep}${exe}`;
}

/**
 * Helper to get the absolute path to the bundled ffmpeg executable
 */
export function getFfmpegPath(): string {
  const binDir = getPluginBinPath();
  const isWindows = (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));
  const exe = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  const sep = isWindows ? '\\' : '/';
  return `${binDir}${sep}${exe}`;
}

/**
 * Helper to get the absolute path to the bundled ffprobe executable
 */
export function getFfprobePath(): string {
  const binDir = getPluginBinPath();
  const isWindows = (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));
  const exe = isWindows ? 'ffprobe.exe' : 'ffprobe';
  const sep = isWindows ? '\\' : '/';
  return `${binDir}${sep}${exe}`;
}

/**
 * Quotes a string defensively for shell command execution across Windows and POSIX.
 */
function quoteArg(arg: string): string {
  if (!arg) return '""';
  // Wrap with double quotes and escape existing double quotes
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * 2. buildDownloadCommand(url, options): string
 * Constructs the full yt-dlp command line string.
 */
export function buildDownloadCommand(url: string, options: DownloadOptions): string {
  const ytdlpExe = getYtDlpPath();
  const ffmpegExe = getFfmpegPath();
  const binDir = getPluginBinPath();

  const isWindows = (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));
  const sep = isWindows ? '\\' : '/';

  // Output filename template
  const filename = options.outputFilename || '%(title)s.%(ext)s';
  const cleanDir = (options.outputDir || 'Downloads').replace(/[/\\]+$/, '');
  const outputTemplate = `${cleanDir}${sep}${filename}`;

  const cmdParts: string[] = [
    quoteArg(ytdlpExe),
    '--no-playlist',
    '--no-check-certificates',
    '--no-warnings',
    '--newline',
    '--ffmpeg-location', quoteArg(binDir),
  ];

  // Format selection based on mode and quality
  if (options.format === 'audio') {
    const audioFmt = options.audioFormat || 'mp3';
    cmdParts.push('-f', quoteArg('ba/b'));
    cmdParts.push('-x');
    cmdParts.push('--audio-format', quoteArg(audioFmt));
    cmdParts.push('--audio-quality', '0'); // Best quality VBR
  } else {
    // Video mode format mapping
    const q = options.quality ? options.quality.toLowerCase() : 'best available';
    if (q.includes('1080') || q.includes('fhd')) {
      cmdParts.push('-f', quoteArg('bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b'));
    } else if (q.includes('720') || q.includes('hd')) {
      cmdParts.push('-f', quoteArg('bv*[height<=720]+ba/b[height<=720]/bv*+ba/b'));
    } else if (q.includes('audio')) {
      cmdParts.push('-f', quoteArg('ba/b'));
      cmdParts.push('-x');
      cmdParts.push('--audio-format', 'mp3');
    } else {
      // "Best available" default
      cmdParts.push('-f', quoteArg('bv*+ba/b'));
    }
  }

  // Output template
  cmdParts.push('-o', quoteArg(outputTemplate));

  // Target URL
  cmdParts.push(quoteArg(url.trim()));

  return cmdParts.join(' ');
}

/**
 * 3. downloadMedia(url, options): Promise<DownloadResult>
 * Calls buildDownloadCommand(), executes via hybrid addon exec(), and returns result.
 */
export async function downloadMedia(url: string, options: DownloadOptions): Promise<DownloadResult> {
  if (!url || !url.trim()) {
    return {
      success: false,
      error: 'Please provide a valid media URL.',
    };
  }

  const addon = getHybridAddon();
  const command = buildDownloadCommand(url, options);

  const isWindows = (typeof process !== 'undefined' && process.platform === 'win32') ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'));
  const sep = isWindows ? '\\' : '/';
  const cleanDir = (options.outputDir || 'Downloads').replace(/[/\\]+$/, '');
  const expectedFilename = options.outputFilename || '%(title)s.%(ext)s';
  const expectedPath = `${cleanDir}${sep}${expectedFilename}`;

  try {
    const stdout = await addon.exec(command);

    // Check if output contains error patterns emitted by yt-dlp
    if (stdout && (stdout.includes('ERROR:') || stdout.includes('Traceback (most recent call last):'))) {
      // Extract the actual error message lines from stdout
      const lines = stdout.split('\n');
      const errorLines = lines.filter(l => l.includes('ERROR:') || l.includes('Error:'));
      const errorMsg = errorLines.length > 0 ? errorLines.join('; ') : stdout.slice(0, 300);

      return {
        success: false,
        error: errorMsg,
        stdout,
        command,
      };
    }

    return {
      success: true,
      filePath: expectedPath,
      stdout,
      command,
    };
  } catch (err: any) {
    // Surface the actual error message from yt-dlp / process failure
    const errorDetails = err?.message || String(err);
    console.error('[Aroha Downloader] Download execution failed:', errorDetails);

    return {
      success: false,
      error: errorDetails,
      command,
    };
  }
}

/**
 * 4. checkBinariesExist(): Promise<BinaryCheckResult>
 * Startup sanity check using execSync() to verify bundled binaries.
 */
export async function checkBinariesExist(): Promise<BinaryCheckResult> {
  const addon = getHybridAddon();
  const ytdlpExe = getYtDlpPath();
  const ffmpegExe = getFfmpegPath();
  const ffprobeExe = getFfprobePath();

  const result: BinaryCheckResult = {
    ytdlp: false,
    ffmpeg: false,
    ffprobe: false,
    details: {
      errors: [],
    },
  };

  // 1. Check yt-dlp
  try {
    const ytdlpOut = addon.execSync(`${quoteArg(ytdlpExe)} --version`);
    if (ytdlpOut && !ytdlpOut.toLowerCase().includes('not found') && !ytdlpOut.toLowerCase().includes('cannot find')) {
      result.ytdlp = true;
      result.details!.ytdlpVersion = ytdlpOut.trim();
    }
  } catch (err: any) {
    result.details!.errors!.push(`yt-dlp check failed: ${err?.message || err}`);
  }

  // 2. Check ffmpeg
  try {
    const ffmpegOut = addon.execSync(`${quoteArg(ffmpegExe)} -version`);
    if (ffmpegOut && (ffmpegOut.includes('ffmpeg version') || ffmpegOut.includes('Copyright (c)'))) {
      result.ffmpeg = true;
      result.details!.ffmpegVersion = ffmpegOut.split('\n')[0].trim();
    }
  } catch (err: any) {
    result.details!.errors!.push(`ffmpeg check failed: ${err?.message || err}`);
  }

  // 3. Check ffprobe
  try {
    const ffprobeOut = addon.execSync(`${quoteArg(ffprobeExe)} -version`);
    if (ffprobeOut && (ffprobeOut.includes('ffprobe version') || ffprobeOut.includes('Copyright (c)'))) {
      result.ffprobe = true;
      result.details!.ffprobeVersion = ffprobeOut.split('\n')[0].trim();
    }
  } catch (err: any) {
    result.details!.errors!.push(`ffprobe check failed: ${err?.message || err}`);
  }

  return result;
}
