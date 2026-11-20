/**
 * Aroha — Premiere Pro Extension Interaction & Orchestration Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const urlInput = document.getElementById('urlInput');
  const urlIcon = document.getElementById('urlIcon');
  const selectedClipBadge = document.getElementById('selectedClipBadge');
  const clipThumbImg = document.getElementById('clipThumbImg');
  const clipTitleText = document.getElementById('clipTitleText');
  const clipMetaText = document.getElementById('clipMetaText');
  const clearClipBtn = document.getElementById('clearClipBtn');
  const trimBtn = document.getElementById('trimBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const searchResultsMenu = document.getElementById('searchResultsMenu');

  const trimDrawer = document.getElementById('trimDrawer');
  const trimEnableCheckbox = document.getElementById('trimEnableCheckbox');
  const trimStartInput = document.getElementById('trimStartInput');
  const trimEndInput = document.getElementById('trimEndInput');
  const presetResetBtn = document.getElementById('presetResetBtn');

  const modeVideoBtn = document.getElementById('modeVideoBtn');
  const modeAudioBtn = document.getElementById('modeAudioBtn');

  const qualityRow = document.getElementById('qualityRow');
  const qualityMenu = document.getElementById('qualityMenu');
  const qualityLabel = document.getElementById('qualityLabel');
  const qualityChevron = document.getElementById('qualityChevron');

  const locationRow = document.getElementById('locationRow');
  const locationLabel = document.getElementById('locationLabel');
  const browseFolderBtn = document.getElementById('browseFolderBtn');
  const folderPickerInput = document.getElementById('folderPickerInput');

  const viewDownload = document.getElementById('viewDownload');
  const downloadBtn = document.getElementById('downloadBtn');
  const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
  const progressFill = document.getElementById('progressFill');
  const btnText = document.getElementById('btnText');

  const dualActions = document.getElementById('dualActions');
  const addToTimelineBtn = document.getElementById('addToTimelineBtn');
  const addToProjectBtn = document.getElementById('addToProjectBtn');

  const gpuBadge = document.getElementById('gpuBadge');
  const gpuBadgeText = document.getElementById('gpuBadgeText');
  const diagModal = document.getElementById('diagModal');
  const diagCloseBtn = document.getElementById('diagCloseBtn');
  const diagDoneBtn = document.getElementById('diagDoneBtn');
  const diagRetestBtn = document.getElementById('diagRetestBtn');
  const diagEncoderSelect = document.getElementById('diagEncoderSelect');
  const diagEncoderTypeBadge = document.getElementById('diagEncoderTypeBadge');
  const diagHwDetails = document.getElementById('diagHwDetails');
  const diagDirValue = document.getElementById('diagDirValue');
  const ytDlpVersionText = document.getElementById('ytDlpVersionText');
  const updateYtDlpBtn = document.getElementById('updateYtDlpBtn');
  const ffmpegVersionText = document.getElementById('ffmpegVersionText');
  const updateFfmpegBtn = document.getElementById('updateFfmpegBtn');

  const settingsBtn = document.getElementById('settingsBtn');
  const closeBtn = document.getElementById('closeBtn');
  const logoTitle = document.getElementById('logoTitle');
  const toast = document.getElementById('toast');

  // Auto-Update Launch Flash Bar
  const updateFlashBar = document.getElementById('updateFlashBar');
  const updateFlashText = document.getElementById('updateFlashText');
  const updateFlashBtn = document.getElementById('updateFlashBtn');
  const updateFlashDismiss = document.getElementById('updateFlashDismiss');

  // State
  let currentMode = 'video';
  let selectedQuality = 'Best available';
  let lastDownloadedFilePath = null;
  let isDownloading = false;
  let toastTimer = null;
  let searchDebounceTimer = null;
  let activeHwEncoder = null;
  let cachedUpdateInfo = null;
  let currentSelectedClip = null;

  // Smooth Progress State
  let currentDisplayPercent = 0;
  let targetProgressPercent = 0;
  let progressRafId = null;

  function setSmoothProgress(percent, labelText) {
    targetProgressPercent = Math.max(targetProgressPercent, percent);
    if (btnText && labelText) {
      btnText.textContent = labelText;
    }
    if (!progressRafId) {
      runProgressAnimation();
    }
  }

  function runProgressAnimation() {
    if (currentDisplayPercent < targetProgressPercent) {
      const diff = targetProgressPercent - currentDisplayPercent;
      const step = Math.max(0.3, diff * 0.15);
      currentDisplayPercent = Math.min(targetProgressPercent, currentDisplayPercent + step);
      if (progressFill) {
        progressFill.style.width = `${currentDisplayPercent.toFixed(1)}%`;
      }
    }
    if (currentDisplayPercent < targetProgressPercent || isDownloading) {
      progressRafId = requestAnimationFrame(runProgressAnimation);
    } else {
      progressRafId = null;
    }
  }

  function resetProgressAnimation() {
    if (progressRafId) {
      cancelAnimationFrame(progressRafId);
      progressRafId = null;
    }
    currentDisplayPercent = 0;
    targetProgressPercent = 0;
    if (progressFill) progressFill.style.width = '0%';
  }

  // ------------------------------------------------------------
  // Encoder Selection & Diagnostics Controller
  // ------------------------------------------------------------
  async function refreshEncoderList() {
    try {
      if (window.ArohaEngine && window.ArohaEngine.detectAllAvailableEncoders) {
        const encoders = await window.ArohaEngine.detectAllAvailableEncoders();
        const active = await window.ArohaEngine.detectHardwareEncoder();
        activeHwEncoder = active;

        if (diagEncoderSelect) {
          diagEncoderSelect.innerHTML = '';
          encoders.forEach(enc => {
            const opt = document.createElement('option');
            opt.value = enc.id;
            opt.textContent = enc.name;
            if (enc.id === active.id) {
              opt.selected = true;
            }
            diagEncoderSelect.appendChild(opt);
          });
        }

        updateEncoderDetailsUI(active);
        return active;
      }
    } catch(e) {
      console.warn('[Aroha] Encoder list detection error:', e);
    }
  }

  function updateEncoderDetailsUI(enc) {
    if (!enc) return;
    if (diagEncoderTypeBadge) {
      diagEncoderTypeBadge.textContent = enc.badge || enc.name;
      diagEncoderTypeBadge.className = `diag-sub-badge ${enc.id !== 'libx264' ? 'highlight' : ''}`;
    }
    if (diagHwDetails) {
      diagHwDetails.textContent = enc.desc || `${enc.name} active`;
    }
  }

  if (diagEncoderSelect) {
    diagEncoderSelect.addEventListener('change', async (e) => {
      const chosenId = e.target.value;
      if (window.ArohaEngine && window.ArohaEngine.setPreferredEncoder) {
        window.ArohaEngine.setPreferredEncoder(chosenId);
        const updated = await window.ArohaEngine.detectHardwareEncoder();
        activeHwEncoder = updated;
        updateEncoderDetailsUI(updated);
        showToast(`Encoder: ${updated.badge || updated.name}`);
      }
    });
  }

  // ------------------------------------------------------------
  // Versions & Background Update Checks
  // ------------------------------------------------------------
  function refreshComponentVersions() {
    if (!window.ArohaEngine) return;
    if (ytDlpVersionText && window.ArohaEngine.getYtDlpVersion) {
      const v = window.ArohaEngine.getYtDlpVersion();
      ytDlpVersionText.textContent = v.startsWith('v') ? v : `v${v}`;
    }
    if (ffmpegVersionText && window.ArohaEngine.getFfmpegVersion) {
      const v = window.ArohaEngine.getFfmpegVersion();
      ffmpegVersionText.textContent = v.startsWith('v') ? v : `v${v}`;
    }
  }

  async function checkComponentUpdates(notifyUser = true) {
    if (!window.ArohaEngine || !window.ArohaEngine.checkAllUpdates) return;
    try {
      const updates = await window.ArohaEngine.checkAllUpdates();
      cachedUpdateInfo = updates;

      const hasYtUpdate = updates.ytDlp && updates.ytDlp.hasUpdate;
      const hasFfUpdate = updates.ffmpeg && updates.ffmpeg.hasUpdate;

      // 1. yt-dlp update state in Diagnostics Modal
      if (updateYtDlpBtn) {
        if (hasYtUpdate) {
          updateYtDlpBtn.disabled = false;
          updateYtDlpBtn.classList.add('available');
          updateYtDlpBtn.title = `Update available: ${updates.ytDlp.latestVersion}`;
        } else {
          updateYtDlpBtn.disabled = true;
          updateYtDlpBtn.classList.remove('available');
          updateYtDlpBtn.title = 'yt-dlp is up to date';
        }
      }

      // 2. FFmpeg update state in Diagnostics Modal
      if (updateFfmpegBtn) {
        if (hasFfUpdate) {
          updateFfmpegBtn.disabled = false;
          updateFfmpegBtn.classList.add('available');
          updateFfmpegBtn.title = `FFmpeg update available: ${updates.ffmpeg.latestVersion}`;
        } else {
          updateFfmpegBtn.disabled = true;
          updateFfmpegBtn.classList.remove('available');
          updateFfmpegBtn.title = 'FFmpeg is up to date';
        }
      }

      // 3. Option 2: Launch Flash Bar Notification & Settings Gear Badge
      if (hasYtUpdate || hasFfUpdate) {
        if (settingsBtn) settingsBtn.classList.add('has-update');

        let isDismissed = false;
        try { isDismissed = sessionStorage.getItem('aroha_update_dismissed') === '1'; } catch(e) {}

        if (updateFlashBar && !isDismissed) {
          let label = 'New update available!';
          if (hasYtUpdate && hasFfUpdate) {
            label = `Updates: yt-dlp ${updates.ytDlp.latestVersion} & FFmpeg ${updates.ffmpeg.latestVersion}`;
          } else if (hasYtUpdate) {
            label = `yt-dlp ${updates.ytDlp.latestVersion} update available!`;
          } else {
            label = `FFmpeg ${updates.ffmpeg.latestVersion} update available!`;
          }
          if (updateFlashText) updateFlashText.textContent = label;
          updateFlashBar.classList.add('show');
        }

        if (notifyUser) {
          showToast(`🔔 Component update available!`, 4000);
        }
      } else {
        if (settingsBtn) settingsBtn.classList.remove('has-update');
        if (updateFlashBar) updateFlashBar.classList.remove('show');
      }

      return updates;
    } catch(e) {
      console.warn('[Aroha] Update check error:', e);
    }
  }

  // 1-Click Flash Update Button
  if (updateFlashBtn) {
    updateFlashBtn.addEventListener('click', async () => {
      if (isDownloading) {
        showToast('Download in progress. Please wait until finished or cancel.', 3500);
        return;
      }
      if (updateFlashBtn.classList.contains('updating')) return;

      updateFlashBtn.classList.add('updating');
      updateFlashBtn.style.setProperty('--progress', '0%');
      updateFlashBtn.textContent = '0%';

      const hasYt = cachedUpdateInfo?.ytDlp?.hasUpdate;
      const hasFf = cachedUpdateInfo?.ffmpeg?.hasUpdate;

      try {
        if (hasYt && window.ArohaEngine?.performYtDlpUpdate) {
          showToast('Updating yt-dlp to latest build...');
          await window.ArohaEngine.performYtDlpUpdate((prog) => {
            const pct = Math.max(0, Math.min(100, Math.round(prog.percent || 0)));
            updateFlashBtn.style.setProperty('--progress', `${pct}%`);
            updateFlashBtn.textContent = `${pct}%`;
          });
          if (hasFf) {
            showToast('✓ yt-dlp updated! (FFmpeg can be updated in Settings modal)', 5000);
          }
        } else if (hasFf && window.ArohaEngine?.performFfmpegUpdate) {
          showToast('Updating FFmpeg release package...');
          await window.ArohaEngine.performFfmpegUpdate((prog) => {
            const pct = Math.max(0, Math.min(100, Math.round(prog.percent || 0)));
            updateFlashBtn.style.setProperty('--progress', `${pct}%`);
            updateFlashBtn.textContent = `${pct}%`;
          });
        } else if (!hasYt && !hasFf) {
          // Simulation fallback for browser preview
          for (let p = 0; p <= 100; p += 5) {
            updateFlashBtn.style.setProperty('--progress', `${p}%`);
            updateFlashBtn.textContent = `${p}%`;
            await new Promise(r => setTimeout(r, 40));
          }
        }

        refreshComponentVersions();
        updateFlashBtn.classList.remove('updating');
        updateFlashBtn.classList.add('updated');
        updateFlashBtn.textContent = '✓ Updated';
        if (settingsBtn) settingsBtn.classList.remove('has-update');
        showToast('✓ Components successfully updated!');

        setTimeout(() => {
          if (updateFlashBar) updateFlashBar.classList.remove('show');
        }, 2200);
      } catch(err) {
        updateFlashBtn.classList.remove('updating');
        updateFlashBtn.style.removeProperty('--progress');
        updateFlashBtn.textContent = 'Update Now';
        showToast(`Update error: ${err.message || err}`, 4500);
      }
    });
  }

  if (updateFlashDismiss) {
    updateFlashDismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      if (updateFlashBar) updateFlashBar.classList.remove('show');
      try { sessionStorage.setItem('aroha_update_dismissed', '1'); } catch(e) {}
    });
  }

  // Handle Update Button Clicks with 4-Corner Rectangle Progress Runner
  if (updateYtDlpBtn) {
    updateYtDlpBtn.addEventListener('click', async () => {
      if (updateYtDlpBtn.classList.contains('updating')) return;
      updateYtDlpBtn.classList.add('updating');
      updateYtDlpBtn.classList.remove('available', 'updated');
      updateYtDlpBtn.style.setProperty('--progress', '0%');
      updateYtDlpBtn.textContent = '0%';
      showToast('Updating yt-dlp to latest nightly build...');

      try {
        if (window.ArohaEngine && window.ArohaEngine.performYtDlpUpdate) {
          const res = await window.ArohaEngine.performYtDlpUpdate((prog) => {
            const pct = Math.max(0, Math.min(100, Math.round(prog.percent || 0)));
            updateYtDlpBtn.style.setProperty('--progress', `${pct}%`);
            updateYtDlpBtn.textContent = `${pct}%`;
          });
          refreshComponentVersions();
          updateYtDlpBtn.disabled = true;
          updateYtDlpBtn.classList.remove('available', 'updating');
          updateYtDlpBtn.classList.add('updated');
          updateYtDlpBtn.textContent = '✓ Updated';
          updateYtDlpBtn.title = 'yt-dlp is up to date';
          showToast(`✓ yt-dlp updated: ${res.newVersion || 'latest'}`);
        } else {
          // Simulation fallback for browser preview
          for (let p = 0; p <= 100; p += 5) {
            updateYtDlpBtn.style.setProperty('--progress', `${p}%`);
            updateYtDlpBtn.textContent = `${p}%`;
            await new Promise(r => setTimeout(r, 45));
          }
          updateYtDlpBtn.disabled = true;
          updateYtDlpBtn.classList.remove('available', 'updating');
          updateYtDlpBtn.classList.add('updated');
          updateYtDlpBtn.textContent = '✓ Updated';
          showToast('✓ yt-dlp updated (simulated)');
        }
      } catch(err) {
        updateYtDlpBtn.classList.remove('updating');
        updateYtDlpBtn.style.removeProperty('--progress');
        updateYtDlpBtn.textContent = 'Update';
        showToast(`Update error: ${err.message || err}`, 4000);
      }
    });
  }

  if (updateFfmpegBtn) {
    updateFfmpegBtn.addEventListener('click', async () => {
      if (updateFfmpegBtn.classList.contains('updating')) return;
      updateFfmpegBtn.classList.add('updating');
      updateFfmpegBtn.classList.remove('available', 'updated');
      updateFfmpegBtn.style.setProperty('--progress', '0%');
      updateFfmpegBtn.textContent = '0%';
      showToast('Updating FFmpeg release package...');

      try {
        if (window.ArohaEngine && window.ArohaEngine.performFfmpegUpdate) {
          const res = await window.ArohaEngine.performFfmpegUpdate((prog) => {
            const pct = Math.max(0, Math.min(100, Math.round(prog.percent || 0)));
            updateFfmpegBtn.style.setProperty('--progress', `${pct}%`);
            updateFfmpegBtn.textContent = `${pct}%`;
          });
          refreshComponentVersions();
          updateFfmpegBtn.disabled = true;
          updateFfmpegBtn.classList.remove('available', 'updating');
          updateFfmpegBtn.classList.add('updated');
          updateFfmpegBtn.textContent = '✓ Updated';
          updateFfmpegBtn.title = 'FFmpeg is up to date';
          showToast(`✓ FFmpeg updated: ${res.newVersion || 'latest'}`);
        } else {
          // Simulation fallback for browser preview
          for (let p = 0; p <= 100; p += 4) {
            updateFfmpegBtn.style.setProperty('--progress', `${p}%`);
            updateFfmpegBtn.textContent = `${p}%`;
            await new Promise(r => setTimeout(r, 40));
          }
          updateFfmpegBtn.disabled = true;
          updateFfmpegBtn.classList.remove('available', 'updating');
          updateFfmpegBtn.classList.add('updated');
          updateFfmpegBtn.textContent = '✓ Updated';
          showToast('✓ FFmpeg updated (simulated)');
        }
      } catch(err) {
        updateFfmpegBtn.classList.remove('updating');
        updateFfmpegBtn.style.removeProperty('--progress');
        updateFfmpegBtn.textContent = 'Update';
        showToast(`Update error: ${err.message || err}`, 4000);
      }
    });
  }

  if (diagRetestBtn) {
    diagRetestBtn.addEventListener('click', async () => {
      diagRetestBtn.textContent = 'Checking...';
      diagRetestBtn.disabled = true;
      showToast('Checking for component updates...');
      await checkComponentUpdates(true);
      diagRetestBtn.textContent = 'Check for Updates';
      diagRetestBtn.disabled = false;
    });
  }

  // Settings Modal Controller
  function openDiagModal() {
    if (!diagModal) return;
    diagModal.classList.add('open');
    refreshEncoderList();
    refreshComponentVersions();
    if (diagDirValue && locationLabel) {
      diagDirValue.textContent = locationLabel.textContent || 'Downloads';
    }
  }

  function closeDiagModal() {
    if (!diagModal) return;
    diagModal.classList.remove('open');
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDiagModal();
    });
  }

  if (diagCloseBtn) diagCloseBtn.addEventListener('click', closeDiagModal);
  if (diagDoneBtn) diagDoneBtn.addEventListener('click', closeDiagModal);
  if (diagRetestBtn) {
    diagRetestBtn.addEventListener('click', async () => {
      showToast('Checking for updates...');
      diagRetestBtn.textContent = 'Checking...';
      const updates = await checkComponentUpdates(false);
      diagRetestBtn.textContent = 'Check for Updates';
      
      const hasAny = (updates?.ytDlp?.hasUpdate) || (updates?.ffmpeg?.hasUpdate);
      if (hasAny) {
        showToast('Update available! Click Update button.', 4000);
      } else {
        showToast('✓ All components are up to date!');
      }
    });
  }

  if (diagModal) {
    diagModal.addEventListener('click', (e) => {
      if (e.target === diagModal) closeDiagModal();
    });
  }

  // Video and Audio Quality Options (including 8K and 2K)
  const videoQualities = [
    { label: 'Best available', badge: 'Auto Max' },
    { label: '4320p (8K)', badge: '7680×4320' },
    { label: '2160p (4K)', badge: '3840×2160' },
    { label: '1440p (2K / QHD)', badge: '2560×1440' },
    { label: '1080p Full HD', badge: '1920×1080' },
    { label: '720p HD', badge: '1280×720' },
    { label: '480p SD', badge: '854×480' },
    { label: '360p', badge: '640×360' }
  ];

  const audioQualities = [
    { label: 'Best available (320kbps)', badge: 'HQ MP3' },
    { label: '320 kbps MP3', badge: 'Max MP3' },
    { label: '256 kbps AAC (M4A)', badge: 'Clean AAC' },
    { label: '192 kbps MP3', badge: 'Standard' },
    { label: '128 kbps MP3', badge: 'Compact' },
    { label: 'WAV (Lossless)', badge: 'Uncompressed' },
    { label: 'FLAC (Lossless)', badge: 'Compressed HQ' }
  ];

  // ------------------------------------------------------------
  // Toast Notification Helper
  // ------------------------------------------------------------
  function showToast(msg, duration = 2400) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // ------------------------------------------------------------
  // Live YouTube Search & Suggestions Dropdown
  // ------------------------------------------------------------
  function closeSearchMenu() {
    if (searchResultsMenu) {
      searchResultsMenu.classList.remove('open');
      searchResultsMenu.innerHTML = '';
    }
  }

  function showSearchLoading() {
    if (!searchResultsMenu) return;
    searchResultsMenu.innerHTML = `
      <div class="search-loading-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>Searching YouTube...</span>
      </div>
    `;
    searchResultsMenu.classList.add('open');
  }

  function renderSearchResults(videos) {
    if (!searchResultsMenu) return;
    if (!videos || videos.length === 0) {
      searchResultsMenu.innerHTML = `
        <div style="padding: 12px 14px; text-align: center; color: var(--text-dim); font-size: 11px;">
          No matching videos found. Try different search terms.
        </div>
      `;
      searchResultsMenu.classList.add('open');
      return;
    }

    searchResultsMenu.innerHTML = '';

    videos.forEach(v => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <div class="thumb-wrap">
          <img src="${v.thumb}" alt="" loading="lazy">
          ${v.duration ? `<span class="dur-pill">${v.duration}</span>` : ''}
        </div>
        <div class="details">
          <div class="title" title="${v.title}">${v.title}</div>
          <div class="channel">${v.channel}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        selectVideoResult(v);
      });

      searchResultsMenu.appendChild(item);
    });

    searchResultsMenu.classList.add('open');
  }

  function extractYouTubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i) ||
                  clean.match(/^([a-zA-Z0-9_-]{11})$/);
    return match ? match[1] : null;
  }

  function setClipSelection(clip) {
    if (!clip) {
      clearClipSelection();
      return;
    }
    currentSelectedClip = clip;

    if (urlInput) {
      urlInput.value = clip.url || '';
      urlInput.classList.add('hidden');
    }
    if (urlIcon) urlIcon.classList.add('hidden');

    if (selectedClipBadge && clipThumbImg && clipTitleText && clipMetaText) {
      clipThumbImg.src = clip.thumb || '';
      clipTitleText.textContent = clip.title || 'Selected Video';
      const meta = [clip.channel, clip.duration].filter(Boolean).join(' • ');
      clipMetaText.textContent = meta || (clip.url || '');
      selectedClipBadge.classList.add('show');
    }

    if (clearClipBtn) clearClipBtn.classList.add('show');
    closeSearchMenu();
  }

  function clearClipSelection() {
    currentSelectedClip = null;
    if (urlInput) {
      urlInput.value = '';
      urlInput.classList.remove('hidden');
      urlInput.focus();
    }
    if (urlIcon) urlIcon.classList.remove('hidden');
    if (selectedClipBadge) selectedClipBadge.classList.remove('show');
    if (clearClipBtn) clearClipBtn.classList.remove('show');
    
    // Restore download button view if dual actions were showing
    if (dualActions) dualActions.classList.remove('show');
    if (viewDownload) viewDownload.style.display = 'block';

    // Also reset trim drawer if opened for that clip
    if (trimDrawer) {
      trimDrawer.classList.remove('open');
      if (trimStartInput) trimStartInput.value = '00:00:00';
      if (trimEndInput) trimEndInput.value = '';
      if (trimEnableCheckbox) trimEnableCheckbox.checked = false;
      updateTrimGlowState();
    }
    closeSearchMenu();
    showToast('Cleared clip selection');
  }

  function restoreClipBadgeIfApplicable() {
    if (!urlInput) return;
    const val = urlInput.value.trim();

    // If completely cleared, stay in cleared input mode
    if (!val) {
      clearClipSelection();
      return;
    }

    // If matches currently selected clip's url, title, or id
    if (currentSelectedClip) {
      const currentId = currentSelectedClip.id || extractYouTubeId(currentSelectedClip.url);
      const inputId = extractYouTubeId(val);

      if (val === currentSelectedClip.url || val === currentSelectedClip.title || (currentId && inputId && currentId === inputId)) {
        setClipSelection(currentSelectedClip);
        return;
      }
    }

    // If user typed or pasted a valid YouTube URL or video ID
    const newId = extractYouTubeId(val);
    if (newId) {
      const fullUrl = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${newId}`;
      const newClip = {
        id: newId,
        url: fullUrl,
        title: (currentSelectedClip && currentSelectedClip.id === newId) ? currentSelectedClip.title : 'YouTube Video',
        channel: (currentSelectedClip && currentSelectedClip.id === newId) ? currentSelectedClip.channel : 'YouTube',
        duration: (currentSelectedClip && currentSelectedClip.id === newId) ? currentSelectedClip.duration : '',
        thumb: `https://i.ytimg.com/vi/${newId}/mqdefault.jpg`
      };
      setClipSelection(newClip);

      if (window.ArohaEngine && window.ArohaEngine.fetchYouTubeOEmbed) {
        window.ArohaEngine.fetchYouTubeOEmbed(fullUrl).then(meta => {
          if (meta && currentSelectedClip && currentSelectedClip.url === fullUrl) {
            currentSelectedClip.title = meta.title || currentSelectedClip.title;
            currentSelectedClip.channel = meta.channel || currentSelectedClip.channel;
            if (clipTitleText) clipTitleText.textContent = currentSelectedClip.title;
            if (clipMetaText) clipMetaText.textContent = [currentSelectedClip.channel, currentSelectedClip.duration].filter(Boolean).join(' • ');
          }
        });
      }
      return;
    }

    // If user edited to search keywords and clicked outside:
    // If the input text is identical to currentSelectedClip's title, restore badge
    if (currentSelectedClip && val === currentSelectedClip.title) {
      setClipSelection(currentSelectedClip);
    }
  }

  function selectVideoResult(video) {
    setClipSelection(video);
    showToast(`Selected: ${video.title.slice(0, 30)}...`);
  }

  // Handle URL input typing with live search debounce
  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();

      if (!val) {
        closeSearchMenu();
        if (clearClipBtn) clearClipBtn.classList.remove('show');
        return;
      }

      if (clearClipBtn) clearClipBtn.classList.add('show');

      // If user pasted or typed a full URL
      if (/^https?:\/\//i.test(val) || /^www\./i.test(val)) {
        closeSearchMenu();
        // Try fetch OEmbed metadata for direct URL
        if (window.ArohaEngine && window.ArohaEngine.fetchYouTubeOEmbed) {
          window.ArohaEngine.fetchYouTubeOEmbed(val).then(meta => {
            if (meta && (urlInput.value.trim() === val || !urlInput.value.trim())) {
              setClipSelection({
                url: val,
                title: meta.title,
                channel: meta.channel,
                thumb: meta.thumb
              });
            }
          });
        }
        return;
      }

      // Query YouTube Video Search with responsive debounce
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      showSearchLoading();

      searchDebounceTimer = setTimeout(async () => {
        if (window.ArohaEngine && window.ArohaEngine.searchYouTubeVideos) {
          try {
            const results = await window.ArohaEngine.searchYouTubeVideos(val);
            if (urlInput.value.trim() === val) {
              renderSearchResults(results);
            }
          } catch(err) {
            console.warn('[Aroha Search Error]:', err);
            if (urlInput.value.trim() === val) {
              renderSearchResults([]);
            }
          }
        }
      }, 260);
    });

    urlInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const firstItem = searchResultsMenu ? searchResultsMenu.querySelector('.search-item') : null;
        if (firstItem && searchResultsMenu.classList.contains('open')) {
          firstItem.click();
        } else {
          const val = urlInput.value.trim();
          if (extractYouTubeId(val)) {
            restoreClipBadgeIfApplicable();
          } else if (val && !/^https?:\/\//i.test(val) && !/^www\./i.test(val)) {
            if (window.ArohaEngine && window.ArohaEngine.searchYouTubeVideos) {
              showSearchLoading();
              try {
                const results = await window.ArohaEngine.searchYouTubeVideos(val);
                if (results && results.length > 0) {
                  renderSearchResults(results);
                  selectVideoResult(results[0]);
                } else {
                  renderSearchResults([]);
                }
              } catch(err) {
                closeSearchMenu();
              }
            }
          } else {
            closeSearchMenu();
            restoreClipBadgeIfApplicable();
          }
        }
      } else if (e.key === 'Escape') {
        closeSearchMenu();
        if (currentSelectedClip) {
          setClipSelection(currentSelectedClip);
        }
      }
    });

    // When focus leaves urlInput, restore thumbnail badge if URL/clip is present
    urlInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== urlInput) {
          restoreClipBadgeIfApplicable();
        }
      }, 160);
    });
  }

  // Central Cancel Controller for Downloads
  function cancelActiveDownload() {
    if (!isDownloading) return;

    if (window.ArohaEngine && window.ArohaEngine.cancelArohaDownload) {
      window.ArohaEngine.cancelArohaDownload();
    }
    isDownloading = false;
    if (viewDownload) viewDownload.classList.remove('downloading');
    if (downloadBtn) downloadBtn.classList.remove('busy');
    resetProgressAnimation();
    if (btnText) btnText.textContent = 'DOWNLOAD NOW';
    showToast('✕ Download cancelled. Cleaned up temporary files.');
    if (clearClipBtn) {
      clearClipBtn.title = 'Clear selected clip';
      if (!selectedClipBadge || !selectedClipBadge.classList.contains('show')) {
        if (!urlInput || !urlInput.value.trim()) {
          clearClipBtn.classList.remove('show');
        }
      }
    }
  }

  // Dedicated Cancel Button in Download Row
  if (cancelDownloadBtn) {
    cancelDownloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelActiveDownload();
    });
  }

  // Clear button inside URL box (Cross icon) — also cancels active download
  if (clearClipBtn) {
    clearClipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isDownloading) {
        cancelActiveDownload();
        return;
      }
      clearClipSelection();
    });
  }

  // Clicking on selected clip badge re-enables input mode to edit URL
  if (selectedClipBadge) {
    selectedClipBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (urlInput) {
        urlInput.classList.remove('hidden');
        if (urlIcon) urlIcon.classList.remove('hidden');
        selectedClipBadge.classList.remove('show');
        urlInput.focus();
        urlInput.select();
      }
    });
  }

  // Outside click handler for closing dropdown and restoring clip badge
  document.addEventListener('click', (e) => {
    // 1. Close search menu if clicked outside
    if (searchResultsMenu && searchResultsMenu.classList.contains('open')) {
      if (!searchResultsMenu.contains(e.target) && e.target !== urlInput) {
        closeSearchMenu();
      }
    }

    // 2. Restore thumbnail badge if user clicked outside the URL box
    const urlFieldBox = document.getElementById('urlFieldBox');
    if (urlFieldBox && !urlFieldBox.contains(e.target)) {
      if (searchResultsMenu && searchResultsMenu.contains(e.target)) return;
      restoreClipBadgeIfApplicable();
    }
  });

  // ------------------------------------------------------------
  // Quality Dropdown Management
  // ------------------------------------------------------------
  function populateQualityMenu(mode) {
    if (!qualityMenu) return;
    qualityMenu.innerHTML = '';
    const list = mode === 'audio' ? audioQualities : videoQualities;

    list.forEach((item, idx) => {
      const opt = document.createElement('div');
      opt.dataset.val = item.label;
      if ((selectedQuality === item.label) || (idx === 0 && !selectedQuality)) {
        opt.classList.add('selected');
        selectedQuality = item.label;
        if (qualityLabel) qualityLabel.textContent = item.label;
      }

      opt.innerHTML = `
        <span>${item.label}</span>
        <span class="badge">${item.badge}</span>
      `;

      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedQuality = item.label;
        if (qualityLabel) qualityLabel.textContent = item.label;
        qualityMenu.querySelectorAll('div').forEach(d => d.classList.remove('selected'));
        opt.classList.add('selected');
        closeQualityMenu();
        showToast(`Quality: ${item.label}`);
      });

      qualityMenu.appendChild(opt);
    });
  }

  function toggleQualityMenu() {
    const isOpen = qualityMenu.classList.contains('open');
    if (isOpen) {
      closeQualityMenu();
    } else {
      qualityMenu.classList.add('open');
      if (qualityChevron) qualityChevron.style.transform = 'rotate(180deg)';
    }
  }

  function closeQualityMenu() {
    if (qualityMenu) qualityMenu.classList.remove('open');
    if (qualityChevron) qualityChevron.style.transform = 'rotate(0deg)';
  }

  if (qualityRow) {
    qualityRow.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleQualityMenu();
    });
  }

  document.addEventListener('click', (e) => {
    if (qualityRow && !qualityRow.contains(e.target) && qualityMenu && !qualityMenu.contains(e.target)) {
      closeQualityMenu();
    }
  });

  // ------------------------------------------------------------
  // Mode Switching (Video vs Audio)
  // ------------------------------------------------------------
  function setMode(mode) {
    currentMode = mode;
    if (mode === 'video') {
      modeVideoBtn.classList.add('active');
      modeAudioBtn.classList.remove('active');
      selectedQuality = 'Best available';
      populateQualityMenu('video');
      showToast('Mode: Video (CFR H.264 / GPU Accelerated)');
    } else {
      modeAudioBtn.classList.add('active');
      modeVideoBtn.classList.remove('active');
      selectedQuality = 'Best available (320kbps)';
      populateQualityMenu('audio');
      showToast('Mode: Audio (HQ 320k MP3 / WAV)');
    }
  }

  if (modeVideoBtn) modeVideoBtn.addEventListener('click', () => setMode('video'));
  if (modeAudioBtn) modeAudioBtn.addEventListener('click', () => setMode('audio'));

  // ------------------------------------------------------------
  // Paste & Trim/Clip Drawer Handlers
  // ------------------------------------------------------------
  if (pasteBtn && urlInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            urlInput.value = text.trim();
            urlInput.dispatchEvent(new Event('input'));
            showToast('Pasted URL from clipboard');
            return;
          }
        }
      } catch(e) {}
      urlInput.focus();
      showToast('Paste URL with Ctrl+V or search keywords');
    });
  }

  // ------------------------------------------------------------
  // Trim & Clip Glow State Synchronization
  // ------------------------------------------------------------
  function updateTrimGlowState() {
    if (!trimBtn) return;
    const isDrawerOpen = trimDrawer ? trimDrawer.classList.contains('open') : false;
    const startVal = trimStartInput ? (trimStartInput.value || '').trim() : '';
    const endVal = trimEndInput ? (trimEndInput.value || '').trim() : '';

    // If time is written, trim is enabled; if empty/cleared, it is not enabled
    const isClipActive = Boolean(endVal || (startVal && startVal !== '00:00:00' && startVal !== '00:00' && startVal !== '0'));

    // Drawer open gives active highlight; having active clip gives glow
    if (isDrawerOpen || isClipActive) {
      trimBtn.classList.add('active');
    } else {
      trimBtn.classList.remove('active');
    }

    if (isClipActive) {
      trimBtn.classList.add('clip-active');
      trimBtn.title = `Clip Active: [${startVal || '00:00:00'} → ${endVal || 'End'}] (Click to edit)`;
    } else {
      trimBtn.classList.remove('clip-active');
      trimBtn.title = isDrawerOpen ? 'Close Trim Drawer' : 'Trim / Clip specific video section';
    }
  }

  if (trimBtn && trimDrawer) {
    trimBtn.addEventListener('click', () => {
      trimDrawer.classList.toggle('open');
      const isOpen = trimDrawer.classList.contains('open');
      updateTrimGlowState();
      if (isOpen) {
        showToast('Video Trimming: Set In/Out timestamps');
      }
    });
  }

  if (trimStartInput) {
    trimStartInput.addEventListener('input', updateTrimGlowState);
  }
  if (trimEndInput) {
    trimEndInput.addEventListener('input', updateTrimGlowState);
  }

  // Preset Chips
  document.querySelectorAll('.preset-chip[data-start]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (trimStartInput) trimStartInput.value = chip.dataset.start || '00:00:00';
      if (trimEndInput) trimEndInput.value = chip.dataset.end || '';
      updateTrimGlowState();
      showToast(`Preset: ${chip.textContent}`);
    });
  });

  if (presetResetBtn) {
    presetResetBtn.addEventListener('click', () => {
      if (trimStartInput) trimStartInput.value = '';
      if (trimEndInput) trimEndInput.value = '';
      updateTrimGlowState();
      showToast('Full video selected (Trimming cleared)');
    });
  }

  // ------------------------------------------------------------
  // Download Location Management
  // ------------------------------------------------------------
  function initDownloadLocation() {
    let savedDir = localStorage.getItem('aroha_download_dir');
    if (!savedDir && window.ArohaEngine && window.ArohaEngine.getDefaultDownloadDir) {
      savedDir = window.ArohaEngine.getDefaultDownloadDir();
    }
    if (locationLabel) {
      locationLabel.textContent = savedDir || 'Downloads';
      locationLabel.title = savedDir || 'Downloads';
    }
  }

  function triggerFolderPicker() {
    // 1. Try modern Chromium Directory Picker
    if (window.showDirectoryPicker) {
      window.showDirectoryPicker().then(async (dirHandle) => {
        if (dirHandle && dirHandle.name) {
          const pickedName = dirHandle.name;
          localStorage.setItem('aroha_download_dir', pickedName);
          if (locationLabel) {
            locationLabel.textContent = pickedName;
            locationLabel.title = pickedName;
          }
          if (diagDirValue) diagDirValue.textContent = pickedName;
          showToast(`Location: ${pickedName}`);
        }
      }).catch((err) => {
        if (err && err.name !== 'AbortError' && folderPickerInput) {
          folderPickerInput.click();
        }
      });
      return;
    }

    // 2. Direct HTML5 / Chromium Folder Picker
    if (folderPickerInput) {
      folderPickerInput.click();
      return;
    }

    // 3. Fallback to ExtendScript native folder dialog
    if (window.ArohaEngine && window.ArohaEngine.openFolderSelectionDialog) {
      window.ArohaEngine.openFolderSelectionDialog((selectedPath) => {
        if (selectedPath) {
          localStorage.setItem('aroha_download_dir', selectedPath);
          if (locationLabel) {
            locationLabel.textContent = selectedPath;
            locationLabel.title = selectedPath;
          }
          if (diagDirValue) diagDirValue.textContent = selectedPath;
          showToast(`Location: ${selectedPath}`);
        }
      });
    }
  }

  if (folderPickerInput) {
    folderPickerInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        let folderPath = file.name;
        if (file.path) {
          try {
            const p = require('path');
            folderPath = p.dirname(file.path) || file.path;
          } catch(err) {
            folderPath = file.path;
          }
        }
        localStorage.setItem('aroha_download_dir', folderPath);
        if (locationLabel) {
          locationLabel.textContent = folderPath;
          locationLabel.title = folderPath;
        }
        if (diagDirValue) diagDirValue.textContent = folderPath;
        showToast(`Location: ${folderPath}`);
      }
    });
  }

  if (locationRow) {
    locationRow.addEventListener('click', triggerFolderPicker);
  }
  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerFolderPicker();
    });
  }

  // ------------------------------------------------------------
  // 3-Phase Download & Transcode Action
  // ------------------------------------------------------------
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (isDownloading) return;

      const rawInput = urlInput ? urlInput.value.trim() : '';
      if (!rawInput) {
        showToast('Please paste a video URL or enter search keywords');
        if (urlInput) urlInput.focus();
        return;
      }

      isDownloading = true;
      if (viewDownload) viewDownload.classList.add('downloading');
      downloadBtn.classList.add('busy');
      if (clearClipBtn) {
        clearClipBtn.classList.add('show');
        clearClipBtn.title = 'Cancel active download';
      }
      resetProgressAnimation();
      setSmoothProgress(5, 'Downloading...');
      closeSearchMenu();

      const trimStart = trimStartInput ? trimStartInput.value.trim() : '';
      const trimEnd = trimEndInput ? trimEndInput.value.trim() : '';
      const isTrimActive = Boolean(trimEnd || (trimStart && trimStart !== '00:00:00' && trimStart !== '00:00' && trimStart !== '0'));

      const trimOptions = {
        enabled: isTrimActive,
        start: trimStart,
        end: trimEnd
      };

      const outDirectory = locationLabel ? locationLabel.textContent : 'Downloads';

      try {
        if (window.ArohaEngine && window.ArohaEngine.runArohaDownload) {
          const result = await window.ArohaEngine.runArohaDownload({
            urlOrQuery: rawInput,
            mode: currentMode,
            quality: selectedQuality,
            outputDir: outDirectory,
            trim: trimOptions
          }, (progress) => {
            // Silky Smooth Progress Interpolation
            setSmoothProgress(progress.overallPercent, progress.text);
          });

          if (result && result.success) {
            lastDownloadedFilePath = result.filePath;
            setSmoothProgress(100, '✓ READY FOR PREMIERE PRO');
            showToast(`Ready: ${result.title || 'Media Clip'}`);

            setTimeout(() => {
              downloadBtn.classList.remove('busy');
              if (viewDownload) viewDownload.classList.remove('downloading');
              resetProgressAnimation();
              if (btnText) btnText.textContent = 'DOWNLOAD NOW';
              isDownloading = false;

              // Restore clear button title
              if (clearClipBtn) clearClipBtn.title = 'Clear selected clip';

              // Transition to Screen 2 (Dual Actions)
              if (viewDownload) viewDownload.style.display = 'none';
              if (dualActions) dualActions.classList.add('show');
            }, 1100);
          } else {
            throw new Error(result ? result.error : 'Download failed');
          }
        } else {
          // Resilient UI Fallback Simulation
          console.warn('[Aroha] Standalone mode: Running simulation flow');
          let pct = 0;
          while (pct < 100) {
            if (!isDownloading) break;
            pct += Math.floor(Math.random() * 18) + 10;
            if (pct > 100) pct = 100;
            const simText = pct < 85 ? `Downloading • 14.2 MB/s • ${(pct * 0.42).toFixed(1)} MB / 42.0 MB • ETA ${Math.max(1, Math.ceil((100 - pct) / 25))}s` : 'Optimizing...';
            setSmoothProgress(pct, simText);
            await new Promise(r => setTimeout(r, 220));
          }
          if (!isDownloading) return;
          setSmoothProgress(100, '✓ READY FOR PREMIERE PRO');
          showToast(`Saved to ${outDirectory}`);
          setTimeout(() => {
            downloadBtn.classList.remove('busy');
            if (viewDownload) viewDownload.classList.remove('downloading');
            resetProgressAnimation();
            if (btnText) btnText.textContent = 'DOWNLOAD NOW';
            isDownloading = false;
            if (viewDownload) viewDownload.style.display = 'none';
            if (dualActions) dualActions.classList.add('show');
          }, 1000);
        }
      } catch(err) {
        console.error('[Aroha Download Error]:', err);
        const errMsg = err?.message || String(err);
        if (!errMsg.includes('cancelled by user')) {
          showToast(`Notice: ${errMsg.slice(0, 70)}`, 4000);
        }
        if (viewDownload) viewDownload.classList.remove('downloading');
        downloadBtn.classList.remove('busy');
        resetProgressAnimation();
        if (btnText) btnText.textContent = 'DOWNLOAD NOW';
        isDownloading = false;
        if (clearClipBtn) {
          clearClipBtn.title = 'Clear selected clip';
          if (!selectedClipBadge || !selectedClipBadge.classList.contains('show')) {
            if (!urlInput || !urlInput.value.trim()) {
              clearClipBtn.classList.remove('show');
            }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------
  // Post-Download Action 1: ADD TO TIMELINE
  // ------------------------------------------------------------
  if (addToTimelineBtn) {
    addToTimelineBtn.addEventListener('click', () => {
      if (!lastDownloadedFilePath) {
        showToast('No active downloaded file found');
        return;
      }

      showToast('Inserting into Premiere sequence at playhead...');
      if (window.ArohaEngine && window.ArohaEngine.addToPremiereTimeline) {
        window.ArohaEngine.addToPremiereTimeline(lastDownloadedFilePath, (res) => {
          if (res && res.success) {
            showToast(res.message || 'Added to Timeline at playhead!');
          } else {
            showToast(`Premiere: ${res.error || res.warning || 'Check active sequence'}`);
          }
        });
      } else {
        showToast('Added media to Timeline at Playhead position');
      }
    });
  }

  // ------------------------------------------------------------
  // Post-Download Action 2: ADD TO PROJECT
  // ------------------------------------------------------------
  if (addToProjectBtn) {
    addToProjectBtn.addEventListener('click', () => {
      if (!lastDownloadedFilePath) {
        showToast('No active downloaded file found');
        return;
      }

      showToast('Importing into Project Bin...');
      if (window.ArohaEngine && window.ArohaEngine.addToPremiereProject) {
        window.ArohaEngine.addToPremiereProject(lastDownloadedFilePath, (res) => {
          if (res && res.success) {
            showToast(res.message || 'Imported to Project Bin!');
          } else {
            showToast(`Premiere: ${res.error || 'Import error'}`);
          }
        });
      } else {
        showToast('Imported media to Project Bin');
      }
    });
  }

  // ------------------------------------------------------------
  // Header Buttons
  // ------------------------------------------------------------

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.CSInterface) {
        try {
          const cs = new window.CSInterface();
          cs.closeExtension();
        } catch(e) {}
      }
      showToast('Aroha panel ready');
    });
  }

  if (logoTitle) {
    logoTitle.addEventListener('click', () => {
      showToast('Aroha — YouTube to Premiere Pro Downloader');
    });
  }

  // Instant UI Initialization (0ms Blocking)
  setMode('video');
  initDownloadLocation();
  refreshComponentVersions();
  updateTrimGlowState();

  // Lazy / Deferred Hardware Probe (800ms after UI is fully painted and responsive)
  setTimeout(() => {
    refreshEncoderList();
  }, 800);

  // Option 2: Automatic Background Update Check on Launch (Non-blocking, 1500ms after UI is painted)
  setTimeout(() => {
    checkComponentUpdates(false);
  }, 1500);

  // When user opens diagnostics settings, ensure fresh encoders are loaded
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      refreshEncoderList();
      refreshComponentVersions();
    });
  }
});
