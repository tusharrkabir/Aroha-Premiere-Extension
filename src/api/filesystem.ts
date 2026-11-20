/**
 * Aroha — Filesystem & Folder Security Token Manager
 * 
 * Adobe UXP runs in a sandboxed security model. UXP plugins CANNOT freely write
 * to arbitrary filesystem paths typed by users. To gain write access outside the
 * plugin's private storage, the user MUST pick the folder via the UXP folder picker.
 * 
 * Once selected, UXP returns a folder entry object from which a persistent access token
 * or session token is generated and stored for subsequent download writes.
 */

import { FolderPickerResult } from './types';

// Declare UXP global storage types if not globally imported
declare const require: any;

let cachedFolderEntry: any = null;
let cachedPersistentToken: string | null = null;

/**
 * Opens a native folder picker dialog allowing the user to choose their download directory.
 * Generates a persistent security token to retain access across sessions.
 * 
 * @returns {Promise<FolderPickerResult | null>} Folder details and security token, or null if cancelled.
 */
export async function pickDownloadFolder(): Promise<FolderPickerResult | null> {
  try {
    // 1. Check if running inside Adobe UXP environment
    let uxpStorage: any = null;
    try {
      if (typeof require === 'function') {
        const uxp = require('uxp');
        if (uxp && uxp.storage && uxp.storage.localFileSystem) {
          uxpStorage = uxp.storage.localFileSystem;
        }
      }
    } catch {
      // Not in standard UXP require context
    }

    if (uxpStorage) {
      // Prompt user to select a folder
      const folder = await uxpStorage.getFolder();
      if (!folder) {
        return null; // User cancelled
      }

      cachedFolderEntry = folder;

      // Create a persistent token to store and reuse write permissions
      let persistentToken: string | null = null;
      try {
        if (typeof uxpStorage.createPersistentToken === 'function') {
          persistentToken = await uxpStorage.createPersistentToken(folder);
          cachedPersistentToken = persistentToken;
        } else if (typeof uxpStorage.createSessionToken === 'function') {
          persistentToken = await uxpStorage.createSessionToken(folder);
        }
      } catch (tokenErr) {
        console.warn('[Aroha FS] Failed to create persistent token:', tokenErr);
      }

      // Native path in UXP is accessible on the folder entry (folder.nativePath)
      const resolvedPath = folder.nativePath || folder.name || 'Downloads';

      return {
        path: resolvedPath,
        token: persistentToken || folder,
        folderName: folder.name || 'Downloads',
      };
    }

    // 2. Fallback for standard Web / Browser dev preview mode
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      const dirHandle = await (window as any).showDirectoryPicker();
      if (dirHandle && dirHandle.name) {
        return {
          path: dirHandle.name,
          token: dirHandle,
          folderName: dirHandle.name,
        };
      }
    }

    // 3. Default fallback
    return {
      path: 'Downloads',
      token: 'default-downloads-token',
      folderName: 'Downloads',
    };
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      // User cancelled picker dialog
      return null;
    }
    console.error('[Aroha FS] Error picking download folder:', err);
    throw err;
  }
}

/**
 * Retrieves the currently cached folder entry or token
 */
export function getCachedFolder(): { entry: any; token: string | null } {
  return {
    entry: cachedFolderEntry,
    token: cachedPersistentToken,
  };
}
