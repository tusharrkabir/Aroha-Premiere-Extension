# Aroha — Backend Prompt Plan for Antigravity AI

Read this before pasting anything — the backend has one hard constraint the UI didn't, and it changes what you should ask Antigravity to build.

---

## The hard constraint

Adobe's actual Hybrid Plugin addon (the officially supported way to run subprocesses from UXP, confirmed from Adobe's own `bolt-uxp` reference implementation) exposes exactly **two functions**: `execSync()` and `exec()`. Both work like Node's `child_process.exec` — you send a command string, you get the full output back **once the process finishes**. There is no built-in stdout-streaming/progress-event API.

This means: **a live "47% downloaded" progress bar is not a free feature** — yt-dlp prints progress to stdout as it runs, but the hybrid addon only hands you output after the whole command exits. Real options, ranked:

1. **MVP (do this first):** indeterminate progress ("Downloading...", spinner) until `exec()` resolves, then flip to the two-button screen. Zero extra engineering.
2. **Real percentage, v2:** have yt-dlp write progress to a file (`--newline` flag redirected to a temp `.log` file alongside the download), and poll that file every ~500ms from the UXP JS side using the filesystem API, parsing the last written line for `%`. This works but adds a polling loop and file-parsing logic you have to maintain.
3. **True streaming:** extend the C++ addon yourself to add an event-emitting exec variant. Real engineering work in C++, not a JS-side task — skip this unless you actually need it.

Tell Antigravity to build option 1 now and structure the code so option 2 is a clean drop-in later (i.e., isolate progress-reporting behind one function you can swap out).

## Second constraint: don't rely on the user's system tools

Your users will not have yt-dlp/ffmpeg/ffprobe installed. **Bundle the actual binaries inside the plugin's own folder** (win-x64 + mac builds of each) and always call them by their absolute path relative to the plugin install directory — never assume they're on PATH. This also means your C++/JS code needs to resolve "where am I installed" reliably (UXP gives you this via the plugin's own storage/entry point, not a hardcoded path).

## Third constraint: UXP file access is sandboxed

UXP plugins can't freely read/write arbitrary paths. They get unrestricted access to the plugin's own private data folder, and to any folder the *user* has explicitly picked through a folder picker (which then grants a persistent access token). Practically: the "Download Location" field in your UI (Downloads folder, or user-browsed folder) has to go through that picker flow to get write access — you can't just take a typed path string and write to it.

---

## Recommended base: don't build the C++ addon from scratch

`hyperbrew/bolt-uxp` (MIT-licensed, open source) already ships a working Hybrid Plugin template with `exec()`/`execSync()` implemented, project scaffolding for both the UXP JS side and the C++ side, hot-reload dev tooling, and packaging scripts. Building your own native addon from zero to get the same two functions is wasted effort — start from this template and write your orchestration logic on top of it. Tell Antigravity this explicitly so it doesn't try to hand-roll a C++ addon.

---

## THE PROMPT (paste below into Antigravity)

```
I'm building the backend/orchestration layer for a UXP plugin (Adobe
Premiere) called Aroha, which downloads video/audio via yt-dlp and
ffmpeg. The project is scaffolded from the hyperbrew/bolt-uxp Hybrid
Plugin template (TypeScript UXP side + pre-existing C++ addon exposing
two functions: execSync(cmd: string) and exec(cmd: string): Promise<string>,
which behave like Node's child_process exec — full output returned only
after the process exits, no streaming).

Do NOT write new C++ code or modify the hybrid addon. Only write the
TypeScript/JS orchestration layer that calls the existing exec()/execSync()
functions.

## File to create: src/api/downloader.ts

Implement and export these functions:

1. `getPluginBinPath(): string`
   Resolve the absolute path to a `bin/` folder shipped inside the plugin
   package (this is where yt-dlp.exe / yt-dlp, ffmpeg.exe / ffmpeg, and
   ffprobe.exe / ffprobe binaries live, one set for win-x64 and one for
   mac, chosen based on the current platform). Use whatever bolt-uxp
   exposes for resolving the plugin's own install/data directory — do not
   hardcode an absolute path. If you can't find a clean way to resolve
   this at all, stub it with a TODO comment and a clear explanation of
   what's missing rather than guessing a path that will break.

2. `buildDownloadCommand(url: string, options: { format: 'video' | 'audio',
   quality: string, outputDir: string, outputFilename: string }): string`
   Constructs the full yt-dlp command line as a single string, using the
   bundled binary paths from getPluginBinPath(), the --ffmpeg-location
   flag pointed at the bundled ffmpeg, an -f format selector derived from
   the `format`/`quality` options (map "Best available" to `bv*+ba/b`,
   support at least 1080p/720p/audio-only as alternate mappings), and an
   -o output template combining outputDir + outputFilename. Quote all
   paths and the URL defensively for both Windows and POSIX shells.

3. `downloadMedia(url: string, options: {...same as above}): Promise<{
   success: boolean, filePath?: string, error?: string }>`
   Calls buildDownloadCommand(), runs it through the addon's exec()
   function, awaits the result. On success, resolve with the final
   output file path (compute this from outputDir + outputFilename,
   don't try to parse it out of yt-dlp's stdout). On failure (non-zero
   exit indicated in the resolved output, or a thrown/rejected promise),
   resolve with success: false and a real error message extracted from
   the command output — do not swallow the failure into a generic
   "download failed" string, surface what yt-dlp actually said.

4. `checkBinariesExist(): Promise<{ ytdlp: boolean, ffmpeg: boolean,
   ffprobe: boolean }>`
   A startup sanity check using execSync() (e.g. run each binary with
   --version) so the plugin can show a clear "setup broken" state instead
   of a confusing failure mid-download if a binary is missing or the
   platform-specific build wasn't bundled correctly.

## File to create: src/api/progress.ts (stub for now)

Export a single function `getProgressReportingStrategy(): 'indeterminate'`
that currently always returns 'indeterminate', with a comment explaining
that a future version can swap this to a 'polling' strategy that tails a
yt-dlp progress log file written via the --newline flag — do not implement
polling yet, just leave the seam so it can be added later without
touching downloader.ts's public API.

## File to create: src/api/filesystem.ts

Implement a function `pickDownloadFolder(): Promise<{ path: string, token:
any } | null>` using UXP's folder picker / persistent token flow (via
whatever bolt-uxp's existing filesystem helpers expose, or the base UXP
storage API if none exist yet) so the "Download Location" UI field is
backed by a real, permitted, writable folder rather than a raw typed
path. If bolt-uxp doesn't already have a helper for this, implement it
directly against the UXP `uxp.storage.localFileSystem` APIs and note in
a comment that this grants access only to folders the user has actively
selected, not arbitrary paths.

## What NOT to do
- Don't invent a progress-percentage UI here — that's the frontend's job,
  and real streaming progress isn't available from exec()/execSync()
  without changes to the C++ layer (out of scope for this task).
- Don't assume yt-dlp/ffmpeg are on the system PATH.
- Don't write to arbitrary file paths without going through the folder
  picker / token flow.
- Don't touch the C++ hybrid addon source.
```

---

## After Antigravity builds this

Two things you'll do by hand that no AI tool can do for you:

1. **Sourcing the actual binaries.** You need real yt-dlp/ffmpeg/ffprobe builds for win-x64 and mac (arm64 + x64) dropped into the `bin/` folder Antigravity's code expects. Grab these from the official yt-dlp releases and an ffmpeg static-build source — don't let an AI "generate" or fabricate a binary, obviously.
2. **Compiling and signing the hybrid addon.** The C++ side isn't something Antigravity builds for you — per bolt-uxp's own instructions, you compile it yourself with Visual Studio 2019 (Windows) or Xcode (Mac), and if you ever modify the C++ source, you'll need your own signing/notarization certs to ship it. This is a one-time setup cost, not a per-feature one.
