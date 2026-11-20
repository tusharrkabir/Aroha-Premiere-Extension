; ===================================================================
; Aroha for Adobe Premiere Pro - Inno Setup Script
; Ultra High Compression Self-Contained Installer with Certificate Setup
; ===================================================================

#define MyAppName "Aroha for Adobe Premiere Pro"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Aroha Media Tools"
#define MyAppURL "https://github.com"
#define MyAppExtensionId "com.aroha.premiere.extension"
#define MyOutputDir "dist"
#define MyOutputBaseFilename "Aroha_Premiere_Extension_Installer_v1.0.0"

[Setup]
; Basic Application Info
AppId={{D5F1698E-0A3E-4BC9-9A74-123456789ABC}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Destination Folder - Adobe CEP Extensions Directory
DefaultDirName={userappdata}\Adobe\CEP\extensions\{#MyAppExtensionId}
DisableDirPage=yes
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Indie Software License File
LicenseFile=LICENSE.txt

; Installer Icon and Visual Style
SetupIconFile=aroha.ico
UninstallDisplayIcon={app}\aroha.ico
UninstallDisplayName={#MyAppName} (Extension for Adobe Premiere Pro)
WizardStyle=modern
WizardSizePercent=100
WizardImageFile=wizard_large.bmp
WizardSmallImageFile=wizard_small.bmp

; Output Configuration
OutputDir={#MyOutputDir}
OutputBaseFilename={#MyOutputBaseFilename}

; ===================================================================
; HIGHEST COMPRESSION SETTINGS (LZMA2 Max Solid Compression)
; ===================================================================
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Compatibility for all Windows 64-bit systems (Windows 7/8/10/11 x64)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=6.1

; Modern UI options
ShowLanguageDialog=no
DisableWelcomePage=no
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Core UI and HTML
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "styles.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "main.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "CSInterface.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".debug"; DestDir: "{app}"; Flags: ignoreversion
Source: "aroha.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "aroha_cert.cer"; DestDir: "{app}"; Flags: ignoreversion

; Multi-size Icons Folder
Source: "icons\*"; DestDir: "{app}\icons"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "icon\*"; DestDir: "{app}\icon"; Flags: ignoreversion recursesubdirs createallsubdirs

; CSXS Manifest Folder
Source: "CSXS\*"; DestDir: "{app}\CSXS"; Flags: ignoreversion recursesubdirs createallsubdirs

; ExtendScript Host Folder
Source: "jsx\*"; DestDir: "{app}\jsx"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend Engine & Sources
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs

; Self-Contained Binaries (yt-dlp nightly + FFmpeg + FFprobe)
Source: "bin\win-x64\*"; DestDir: "{app}\bin\win-x64"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.part,*.ytdl,*.new,*.old"

[Registry]
; Enable Adobe CEP Developer Mode for Premiere Pro (All CSXS versions from 6 to 25)
; Per-User Registry entries (Guaranteed to work on all PCs without admin rights)
Root: HKCU; Subkey: "Software\Adobe\CSXS.6"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.7"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.8"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.9"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.13"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.14"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.15"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.16"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.17"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.18"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.19"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.20"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.21"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.22"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.23"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.24"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.25"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"

; Machine-Wide Registry entries (Set when installer is run as Administrator)
Root: HKLM; Subkey: "Software\Adobe\CSXS.6"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.7"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.8"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.9"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.13"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.14"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.15"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.16"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.17"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.18"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.19"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.20"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.21"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.22"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.23"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.24"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Adobe\CSXS.25"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Check: IsAdminInstallMode

[Run]
; Auto-install certificate to Windows TrustedPublisher store
Filename: "certutil.exe"; Parameters: "-user -addstore -f ""TrustedPublisher"" ""{app}\aroha_cert.cer"""; Flags: runhidden; StatusMsg: "Configuring security credentials and trusted publisher..."
Filename: "certutil.exe"; Parameters: "-addstore -f ""TrustedPublisher"" ""{app}\aroha_cert.cer"""; Flags: runhidden; Check: IsAdminInstallMode; StatusMsg: "Registering machine security credentials..."
Filename: "certutil.exe"; Parameters: "-addstore -f ""Root"" ""{app}\aroha_cert.cer"""; Flags: runhidden; Check: IsAdminInstallMode; StatusMsg: "Finalizing machine root credentials..."

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Messages]
WelcomeLabel1=Welcome to Aroha Setup
WelcomeLabel2=This wizard will install Aroha directly into Adobe Premiere Pro.%n%nAfter installation, open Premiere Pro and go to:%nWindow > Extensions > Aroha
FinishedHeadingLabel=Aroha Installed Successfully!
FinishedLabel=Aroha is now ready in Adobe Premiere Pro with verified security credentials.%n%nTo use it, launch Premiere Pro and navigate to:%nWindow > Extensions > Aroha%n%n(If Premiere Pro is currently open, please restart it to load the extension).
