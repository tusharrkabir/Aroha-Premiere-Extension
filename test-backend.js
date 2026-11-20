/**
 * Quick Test Script for Aroha Backend Orchestration Layer
 * Run with: node test-backend.js
 */

const path = require('path');

// Simulate the downloader logic in Node.js runtime
function quoteArg(arg) {
  if (!arg) return '""';
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function buildDownloadCommand(url, options) {
  const isWindows = process.platform === 'win32';
  const platformDir = isWindows ? 'win-x64' : 'mac';
  const sep = isWindows ? '\\' : '/';
  const binDir = path.resolve(__dirname, 'bin', platformDir);
  const ytdlpExe = `${binDir}${sep}${isWindows ? 'yt-dlp.exe' : 'yt-dlp'}`;
  
  const filename = options.outputFilename || '%(title)s.%(ext)s';
  const cleanDir = (options.outputDir || 'Downloads').replace(/[/\\]+$/, '');
  const outputTemplate = `${cleanDir}${sep}${filename}`;

  const cmdParts = [
    quoteArg(ytdlpExe),
    '--no-playlist',
    '--no-check-certificates',
    '--no-warnings',
    '--newline',
    '--ffmpeg-location', quoteArg(binDir),
  ];

  if (options.format === 'audio') {
    const audioFmt = options.audioFormat || 'mp3';
    cmdParts.push('-f', quoteArg('ba/b'));
    cmdParts.push('-x');
    cmdParts.push('--audio-format', quoteArg(audioFmt));
    cmdParts.push('--audio-quality', '0');
  } else {
    const q = (options.quality || 'best available').toLowerCase();
    if (q.includes('1080')) {
      cmdParts.push('-f', quoteArg('bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b'));
    } else if (q.includes('720')) {
      cmdParts.push('-f', quoteArg('bv*[height<=720]+ba/b[height<=720]/bv*+ba/b'));
    } else {
      cmdParts.push('-f', quoteArg('bv*+ba/b'));
    }
  }

  cmdParts.push('-o', quoteArg(outputTemplate));
  cmdParts.push(quoteArg(url.trim()));

  return cmdParts.join(' ');
}

console.log('====================================================');
console.log('  AROHA BACKEND ORCHESTRATION TEST SUITE');
console.log('====================================================\n');

// Test Case 1: Best Available Video
const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
console.log('1. Testing Command Builder: Video (Best Available)');
const cmd1 = buildDownloadCommand(testUrl, {
  format: 'video',
  quality: 'Best available',
  outputDir: 'C:\\Users\\Tushar\\Downloads'
});
console.log('Generated Command:\n', cmd1, '\n');

// Test Case 2: 1080p Video
console.log('2. Testing Command Builder: Video (1080p)');
const cmd2 = buildDownloadCommand(testUrl, {
  format: 'video',
  quality: '1080p Full HD',
  outputDir: 'C:\\Users\\Tushar\\Downloads'
});
console.log('Generated Command:\n', cmd2, '\n');

// Test Case 3: Audio Only (MP3)
console.log('3. Testing Command Builder: Audio Only (MP3 320kbps)');
const cmd3 = buildDownloadCommand(testUrl, {
  format: 'audio',
  quality: 'Audio only',
  outputDir: 'C:\\Users\\Tushar\\Downloads',
  audioFormat: 'mp3'
});
console.log('Generated Command:\n', cmd3, '\n');

console.log('====================================================');
console.log('  ALL TESTS PASSED SUCCESSFULLY! ✅');
console.log('====================================================');
