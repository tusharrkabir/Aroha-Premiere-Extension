/**
 * Aroha — Progress Reporting Seam
 * 
 * In Adobe UXP's hybrid addon, exec() / execSync() only return the complete process
 * output after the process exits (no stdout streaming events).
 * 
 * STRATEGY ROADMAP:
 * 1. 'indeterminate' (Current MVP):
 *    Shows an indeterminate spinner/progress state in the UI while exec() awaits completion.
 * 
 * 2. 'polling' (Future v2):
 *    Can be enabled by having yt-dlp write output with `--newline` redirected to a temporary
 *    log file alongside the download (e.g. `download.log`), and having UXP poll that log
 *    file every ~500ms using the filesystem API, parsing the last line for download %
 *    and transfer speed.
 * 
 * 3. 'streaming' (Future v3):
 *    Requires extending the C++ hybrid addon with an event-emitting stdout stream.
 */

import { ProgressReportingStrategy } from './types';

/**
 * Returns the active progress reporting strategy for downloads.
 * Currently returns 'indeterminate' for the MVP.
 */
export function getProgressReportingStrategy(): ProgressReportingStrategy {
  return 'indeterminate';
}
