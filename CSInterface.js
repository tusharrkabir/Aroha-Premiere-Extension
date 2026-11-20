/**
 * CSInterface - v11.0.0
 * Lightweight Adobe CEP JavaScript interface for communicating with Premiere Pro host.
 */

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

function CSInterface() {
    // Empty constructor
}

CSInterface.prototype.evalScript = function(script, callback) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.evalScript(script, callback || function() {});
    } else {
        console.log('[CSInterface Mock evalScript]:', script);
        if (callback) {
            callback(JSON.stringify({ success: true, mock: true }));
        }
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        var p = window.__adobe_cep__.getSystemPath(pathType);
        if (p) {
            p = decodeURI(p.replace(/^file:\/\/\/?/, ''));
            // Fix Windows drive letter e.g. /C:/ -> C:/
            p = p.replace(/^\/([a-zA-Z]:)/, '$1');
            return p;
        }
    }
    return '';
};

CSInterface.prototype.getHostEnvironment = function() {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return { appName: 'PPRO', appVersion: '24.0' };
};

CSInterface.prototype.closeExtension = function() {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.closeExtension();
    }
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.openURLInDefaultBrowser(url);
    } else if (typeof require === 'function') {
        try {
            require('child_process').exec(`start "" "${url}"`);
        } catch(e) {
            window.open(url, '_blank');
        }
    }
};

window.SystemPath = SystemPath;
window.CSInterface = CSInterface;
