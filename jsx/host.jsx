/**
 * Aroha — Premiere Pro ExtendScript Host Script
 * Handles project import and timeline insertion at the current playhead.
 */

if (typeof $ === 'undefined') {
    $ = {};
}

$._AROHA_ = {
    /**
     * Helper to find existing project item by media path or name
     */
    findProjectItem: function(cleanPath, targetName) {
        if (!app.project || !app.project.rootItem) return null;

        function searchBin(bin) {
            if (!bin || !bin.children) return null;
            var num = bin.children.numItems;
            for (var i = num - 1; i >= 0; i--) {
                var item = bin.children[i];
                if (!item) continue;
                try {
                    var mPath = item.getMediaPath ? item.getMediaPath() : '';
                    if (mPath && (mPath.replace(/\\/g, '/') === cleanPath || mPath === cleanPath)) {
                        return item;
                    }
                    if (item.name === targetName) {
                        return item;
                    }
                } catch(e) {}
                if (item.type === ProjectItemType.BIN) {
                    var found = searchBin(item);
                    if (found) return found;
                }
            }
            return null;
        }

        return searchBin(app.project.rootItem);
    },

    /**
     * Import a media file into the active project bin.
     * @param {string} filePath - Absolute path to the media file.
     * @returns {string} JSON string with success/error status and itemName.
     */
    importFileToProject: function(filePath) {
        try {
            if (!app.project) {
                return JSON.stringify({ success: false, error: 'No active project found in Premiere Pro. Please open or create a project.' });
            }

            var cleanPath = String(filePath).replace(/\\/g, '/');
            var fileObj = new File(cleanPath);
            if (!fileObj.exists) {
                return JSON.stringify({ success: false, error: 'File does not exist on disk: ' + cleanPath });
            }

            // Check if already imported
            var existingItem = this.findProjectItem(cleanPath, fileObj.name);
            if (existingItem) {
                return JSON.stringify({
                    success: true,
                    message: 'Item already in Project Bin: ' + existingItem.name,
                    itemName: existingItem.name
                });
            }

            var fileArray = [cleanPath];
            var targetBin = app.project.getInsertionBin ? app.project.getInsertionBin() : app.project.rootItem;
            if (!targetBin) {
                targetBin = app.project.rootItem;
            }

            app.project.importFiles(fileArray, true, targetBin, false);

            var importedItem = this.findProjectItem(cleanPath, fileObj.name);

            return JSON.stringify({
                success: true,
                message: 'Imported to Project Bin: ' + (importedItem ? importedItem.name : fileObj.name),
                mediaPath: cleanPath,
                itemName: importedItem ? importedItem.name : fileObj.name
            });
        } catch (e) {
            return JSON.stringify({ success: false, error: 'ExtendScript Import Error: ' + e.toString() });
        }
    },

    /**
     * Import a media file and insert it into the active timeline sequence at the playhead position.
     * @param {string} filePath - Absolute path to the media file.
     * @returns {string} JSON string with status.
     */
    insertToActiveTimeline: function(filePath) {
        try {
            if (!app.project) {
                return JSON.stringify({ success: false, error: 'No active project found in Premiere Pro. Please open a project.' });
            }

            var cleanPath = String(filePath).replace(/\\/g, '/');
            var fileObj = new File(cleanPath);
            if (!fileObj.exists) {
                return JSON.stringify({ success: false, error: 'File does not exist on disk: ' + cleanPath });
            }

            // 1. Ensure file is imported in project bin
            var importedItem = this.findProjectItem(cleanPath, fileObj.name);
            if (!importedItem) {
                var fileArray = [cleanPath];
                var targetBin = app.project.rootItem;
                app.project.importFiles(fileArray, true, targetBin, false);
                importedItem = this.findProjectItem(cleanPath, fileObj.name);
            }

            if (!importedItem) {
                return JSON.stringify({ success: false, error: 'Could not resolve imported project item for timeline.' });
            }

            // 2. Resolve active sequence
            var seq = app.project.activeSequence;
            if (!seq) {
                if (app.project.sequences && app.project.sequences.numSequences > 0) {
                    seq = app.project.sequences[0];
                    app.project.openSequence(seq.sequenceID);
                } else if (app.project.createNewSequenceFromClips) {
                    // Automatically create a new sequence from the clip if no sequence exists
                    seq = app.project.createNewSequenceFromClips(fileObj.name, [importedItem], app.project.rootItem);
                    if (seq) {
                        return JSON.stringify({
                            success: true,
                            message: 'Created new sequence and added clip: ' + importedItem.name,
                            itemName: importedItem.name
                        });
                    }
                }
            }

            if (!seq) {
                return JSON.stringify({
                    success: true,
                    warning: 'Imported to Project Bin (Open a Timeline Sequence to insert at playhead).',
                    itemName: importedItem.name
                });
            }

            // 3. Get current playhead position
            var playhead = seq.getPlayerPosition();
            var inserted = false;
            var isAudioOnly = cleanPath.match(/\.(mp3|wav|aac|flac|m4a|ogg)$/i);

            // 4. Try Video Track Insertion
            if (!isAudioOnly && seq.videoTracks && seq.videoTracks.numTracks > 0) {
                for (var v = 0; v < seq.videoTracks.numTracks; v++) {
                    var vTrack = seq.videoTracks[v];
                    if (!vTrack || vTrack.isLocked && vTrack.isLocked()) continue;

                    try {
                        if (typeof vTrack.insertClip === 'function') {
                            vTrack.insertClip(importedItem, playhead);
                            inserted = true;
                            break;
                        }
                    } catch(e1) {
                        try {
                            if (typeof vTrack.overwriteClip === 'function') {
                                vTrack.overwriteClip(importedItem, playhead);
                                inserted = true;
                                break;
                            }
                        } catch(e2) {}
                    }
                }
            }

            // 5. Try Audio Track Insertion (for audio files or if video track wasn't available)
            if ((!inserted || isAudioOnly) && seq.audioTracks && seq.audioTracks.numTracks > 0) {
                for (var a = 0; a < seq.audioTracks.numTracks; a++) {
                    var aTrack = seq.audioTracks[a];
                    if (!aTrack || (aTrack.isLocked && aTrack.isLocked())) continue;

                    try {
                        if (typeof aTrack.insertClip === 'function') {
                            aTrack.insertClip(importedItem, playhead);
                            inserted = true;
                            break;
                        }
                    } catch(e3) {
                        try {
                            if (typeof aTrack.overwriteClip === 'function') {
                                aTrack.overwriteClip(importedItem, playhead);
                                inserted = true;
                                break;
                            }
                        } catch(e4) {}
                    }
                }
            }

            return JSON.stringify({
                success: true,
                message: inserted ? 'Added to Timeline at playhead!' : 'Imported to Project Bin (Timeline tracks were occupied/locked)',
                itemName: importedItem.name
            });
        } catch (e) {
            return JSON.stringify({ success: false, error: 'Timeline Insertion Error: ' + e.toString() });
        }
    },

    /**
     * Get active sequence name and current playhead position.
     */
    getActiveSequenceInfo: function() {
        try {
            if (!app.project || !app.project.activeSequence) {
                return JSON.stringify({ hasActiveSequence: false });
            }
            var seq = app.project.activeSequence;
            return JSON.stringify({
                hasActiveSequence: true,
                sequenceName: seq.name,
                playheadSeconds: seq.getPlayerPosition() ? seq.getPlayerPosition().seconds : 0
            });
        } catch (e) {
            return JSON.stringify({ hasActiveSequence: false, error: e.toString() });
        }
    },

    /**
     * Open native OS folder selector dialog
     */
    chooseDownloadFolder: function() {
        try {
            var folderObj = Folder.selectDialog("Select Aroha Download Folder");
            if (folderObj && folderObj.fsName) {
                return JSON.stringify({ success: true, folderPath: folderObj.fsName });
            }
            return JSON.stringify({ success: false, cancelled: true });
        } catch(e) {
            return JSON.stringify({ success: false, error: e.toString() });
        }
    }
};

