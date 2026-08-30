const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { spawn, exec } = require('child_process');
const { shell } = require('electron');
const AdmZip = require('adm-zip');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

class Downloader {
  constructor(store, mainWindow) {
    this.store = store;
    this.mainWindow = mainWindow;
    this.activeTasks = new Map(); // id -> { abortController, state, speedTimer }
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  _sendEvent(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  _sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  _cleanCoverUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (clean.startsWith('//')) clean = 'https:' + clean;
    clean = clean.replace(/-\d+x\d+(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '$1');
    clean = clean.replace(/-scaled(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '$1');
    return clean;
  }

  /**
   * Helper to perform HTTP GET following redirects and sending cookies/referer
   */
  _fetchStreamWithRedirect(targetUrl, headers, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Too many redirects'));
      }

      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            ...headers
          }
        },
        (res) => {
          // Handle Redirects (301, 302, 303, 307, 308)
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, targetUrl).toString();
            }

            // Forward cookies if any
            const newHeaders = { ...headers };
            if (res.headers['set-cookie']) {
              const cookies = Array.isArray(res.headers['set-cookie'])
                ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
                : res.headers['set-cookie'].split(';')[0];
              newHeaders['Cookie'] = cookies;
            }

            return this._fetchStreamWithRedirect(redirectUrl, newHeaders, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
          }

          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP error ${res.statusCode}: ${res.statusMessage}`));
          }

          resolve({ res, finalUrl: targetUrl });
        }
      );

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Start a download task
   */
  async startDownload(taskData) {
    const {
      id = Date.now().toString(),
      downloadUrl,
      referer,
      filename = 'Trainer.zip',
      gameTitle = 'Game Trainer',
      cover = '',
      thumbCover = '',
      version = ''
    } = taskData;

    const finalCover = cover || thumbCover || '';

    const config = this.store.getConfig();
    const downloadDir = config.downloadDir;
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const safeFilename = this._sanitizeFileName(filename);
    const targetFilePath = path.join(downloadDir, safeFilename);

    const record = {
      id,
      downloadUrl,
      referer,
      filename: safeFilename,
      gameTitle,
      cover: finalCover,
      version,
      targetFilePath,
      totalBytes: 0,
      downloadedBytes: 0,
      percent: 0,
      speed: 0,
      eta: 0,
      status: 'downloading', // 'downloading', 'completed', 'failed', 'cancelled'
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.store.saveDownload(record);
    this._sendEvent('download-start', record);

    try {
      const headers = {};
      if (referer) {
        headers['Referer'] = referer;
      }

      const { res } = await this._fetchStreamWithRedirect(downloadUrl, headers);

      // Parse real filename from Content-Disposition header if available
      let realFilename = safeFilename;
      const cd = res.headers['content-disposition'];
      if (cd) {
        const match = cd.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
        if (match && match[1]) {
          realFilename = this._sanitizeFileName(decodeURIComponent(match[1]));
        }
      }
      
      // Ensure proper extension
      const validExts = ['.exe', '.zip', '.rar', '.7z'];
      const currentExt = path.extname(realFilename).toLowerCase();
      if (!validExts.includes(currentExt)) {
        realFilename = realFilename.replace(/\.(fling|tmp|com)$/i, '') + '.exe';
      }

      let actualFilePath = path.join(downloadDir, realFilename);
      record.filename = realFilename;
      record.targetFilePath = actualFilePath;

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      record.totalBytes = totalBytes;

      const fileStream = fs.createWriteStream(actualFilePath);
      let downloadedBytes = 0;
      let lastBytes = 0;
      let lastTime = Date.now();

      const taskHandle = {
        res,
        fileStream,
        targetFilePath: actualFilePath,
        isCancelled: false
      };
      this.activeTasks.set(id, taskHandle);

      const speedInterval = setInterval(() => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.5) {
          const bytesDiff = downloadedBytes - lastBytes;
          const speed = Math.round(bytesDiff / timeDiff); // bytes/sec
          const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
          const remainingBytes = totalBytes - downloadedBytes;
          const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

          record.downloadedBytes = downloadedBytes;
          record.percent = percent;
          record.speed = speed;
          record.eta = eta;
          record.updatedAt = now;

          this.store.saveDownload(record);
          this._sendEvent('download-progress', record);

          lastBytes = downloadedBytes;
          lastTime = now;
        }
      }, 500);

      taskHandle.speedInterval = speedInterval;

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      res.pipe(fileStream);

      fileStream.on('finish', async () => {
        clearInterval(speedInterval);
        this.activeTasks.delete(id);

        if (taskHandle.isCancelled) return;

        record.downloadedBytes = downloadedBytes;
        record.percent = 100;
        record.speed = 0;
        record.eta = 0;
        record.status = 'completed';
        record.completedAt = Date.now();

        let extractedExePath = null;
        let extractedFolderPath = path.dirname(actualFilePath);

        try {
          // Check file magic bytes: 'MZ' (4D 5A) is Windows EXE, 'PK' (50 4B) is ZIP
          const fd = fs.openSync(actualFilePath, 'r');
          const magic = Buffer.alloc(4);
          fs.readSync(fd, magic, 0, 4, 0);
          fs.closeSync(fd);

          const isExe = magic[0] === 0x4D && magic[1] === 0x5A; // 'MZ'
          const isZip = magic[0] === 0x50 && magic[1] === 0x4B; // 'PK'

          if (isExe) {
            // Direct standalone executable: ensure it ends in .exe
            if (!actualFilePath.toLowerCase().endsWith('.exe')) {
              let properExePath = actualFilePath.replace(/\.(zip|fling|tmp|rar|7z)$/i, '') + '.exe';
              if (!properExePath.toLowerCase().endsWith('.exe')) properExePath = actualFilePath + '.exe';
              if (fs.existsSync(properExePath) && properExePath !== actualFilePath) {
                try { fs.unlinkSync(properExePath); } catch (e) {}
              }
              fs.renameSync(actualFilePath, properExePath);
              actualFilePath = properExePath;
              record.filename = path.basename(properExePath);
              record.targetFilePath = properExePath;
            }
            extractedExePath = actualFilePath;
            extractedFolderPath = path.dirname(actualFilePath);
          } else if (isZip) {
            // Real zip file -> ensure it ends in .zip
            if (!actualFilePath.toLowerCase().endsWith('.zip')) {
              let properZipPath = actualFilePath.replace(/\.(exe|fling|tmp|rar|7z)$/i, '') + '.zip';
              if (!properZipPath.toLowerCase().endsWith('.zip')) properZipPath = actualFilePath + '.zip';
              if (fs.existsSync(properZipPath) && properZipPath !== actualFilePath) {
                try { fs.unlinkSync(properZipPath); } catch (e) {}
              }
              fs.renameSync(actualFilePath, properZipPath);
              actualFilePath = properZipPath;
              record.filename = path.basename(properZipPath);
              record.targetFilePath = properZipPath;
            }
            // Real zip file -> extract
            if (config.autoExtract) {
              const extractResult = await this.extractZipFile(actualFilePath, gameTitle);
              extractedExePath = extractResult.exePath;
              extractedFolderPath = extractResult.folderPath;
            }
          } else {
            extractedExePath = actualFilePath;
          }
        } catch (fileCheckErr) {
          console.error('Error inspecting downloaded file:', fileCheckErr);
          extractedExePath = actualFilePath;
        }

        record.extractedExePath = extractedExePath;
        record.extractedFolderPath = extractedFolderPath;

        const cleanTitle = (gameTitle || '').replace(/\s+Trainer$/i, '').trim();
        // Add to local library with true high-definition cover
        const libraryItem = {
          id: id,
          title: gameTitle,
          cleanTitle: cleanTitle,
          version: version,
          cover: this._cleanCoverUrl(finalCover),
          zipPath: actualFilePath,
          exePath: extractedExePath || actualFilePath,
          folderPath: extractedFolderPath || downloadDir,
          downloadUrl: downloadUrl,
          referer: referer,
          addedAt: Date.now()
        };
        this.store.saveLibraryItem(libraryItem);

        this.store.saveDownload(record);
        this._sendEvent('download-completed', { ...record, libraryItem });
      });

      fileStream.on('error', (err) => {
        clearInterval(speedInterval);
        this.activeTasks.delete(id);
        record.status = 'failed';
        record.error = err.message;
        this.store.saveDownload(record);
        this._sendEvent('download-failed', record);
      });

      res.on('error', (err) => {
        clearInterval(speedInterval);
        this.activeTasks.delete(id);
        record.status = 'failed';
        record.error = err.message;
        this.store.saveDownload(record);
        this._sendEvent('download-failed', record);
      });

    } catch (e) {
      this.activeTasks.delete(id);
      record.status = 'failed';
      record.error = e.message;
      this.store.saveDownload(record);
      this._sendEvent('download-failed', record);
      console.error('Download error:', e);
    }

    return record;
  }

  cancelDownload(id) {
    const task = this.activeTasks.get(id);
    if (task) {
      task.isCancelled = true;
      if (task.speedInterval) clearInterval(task.speedInterval);
      if (task.res) task.res.destroy();
      if (task.fileStream) {
        task.fileStream.close(() => {
          if (fs.existsSync(task.targetFilePath)) {
            try { fs.unlinkSync(task.targetFilePath); } catch (e) {}
          }
        });
      }
      this.activeTasks.delete(id);
    }
    const downloads = this.store.getDownloads();
    const item = downloads.find(x => x.id === id);
    if (item) {
      item.status = 'cancelled';
      item.speed = 0;
      this.store.saveDownload(item);
      this._sendEvent('download-progress', item);
    }
  }

  /**
   * Unzip a trainer archive into a dedicated folder
   */
  async extractZipFile(zipPath, gameTitle) {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`File not found: ${zipPath}`);
    }

    const config = this.store.getConfig();
    const folderName = this._sanitizeFileName(gameTitle || path.basename(zipPath, '.zip'));
    const targetFolder = path.join(config.downloadDir, folderName);

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetFolder, true);

    // Find the .exe inside the extracted folder
    let foundExe = null;
    const findExeRecursive = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findExeRecursive(fullPath);
        } else if (file.toLowerCase().endsWith('.exe')) {
          foundExe = fullPath;
          break;
        }
      }
    };

    findExeRecursive(targetFolder);

    return {
      folderPath: targetFolder,
      exePath: foundExe
    };
  }

  /**
   * Launch a trainer executable with full Windows UAC elevation support
   */
  async launchTrainer(exePath) {
    if (!exePath) {
      throw new Error('修改器路径为空');
    }

    const config = this.store.getConfig();
    const downloadDir = config.downloadDir;

    let targetPath = exePath;

    // 1. If path is relative, resolve with downloadDir
    if (!path.isAbsolute(targetPath) && downloadDir) {
      const inDownloadDir = path.join(downloadDir, targetPath);
      if (fs.existsSync(inDownloadDir)) {
        targetPath = inDownloadDir;
      }
    }

    // 2. Check if file exists directly, or if .exe is missing
    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(targetPath + '.exe')) {
        targetPath = targetPath + '.exe';
      } else if (downloadDir && fs.existsSync(downloadDir)) {
        // 3. Resilient search: scan download directory and subfolders for matching .exe
        const baseName = path.basename(exePath).replace(/\.exe$/i, '').toLowerCase();
        try {
          const findExe = (dir, depth = 0) => {
            if (depth > 2 || !fs.existsSync(dir)) return null;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (e.isFile() && e.name.toLowerCase().endsWith('.exe')) {
                const normName = e.name.toLowerCase().replace(/\.exe$/i, '');
                if (normName.includes(baseName) || baseName.includes(normName)) {
                  return full;
                }
              } else if (e.isDirectory()) {
                const res = findExe(full, depth + 1);
                if (res) return res;
              }
            }
            return null;
          };
          const found = findExe(downloadDir);
          if (found) {
            targetPath = found;
          }
        } catch (err) {}
      }
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`修改器执行文件不存在: ${path.basename(exePath)}`);
    }

    // Auto-fix: if file is not .exe or has .fling/.zip extension but is a PE executable (MZ header), rename to .exe
    if (fs.statSync(targetPath).isFile() && !targetPath.toLowerCase().endsWith('.exe')) {
      try {
        const fd = fs.openSync(targetPath, 'r');
        const magic = Buffer.alloc(2);
        fs.readSync(fd, magic, 0, 2, 0);
        fs.closeSync(fd);
        if (magic[0] === 0x4D && magic[1] === 0x5A) {
          let properPath = targetPath.replace(/\.(fling|zip|tmp|rar|7z)$/i, '') + '.exe';
          if (!properPath.toLowerCase().endsWith('.exe')) properPath = targetPath + '.exe';
          if (!fs.existsSync(properPath)) {
            fs.renameSync(targetPath, properPath);
            targetPath = properPath;
          }
        }
      } catch (e) {
        console.error('Error auto-fixing exe extension:', e);
      }
    }

    try {
      // Electron shell.openPath automatically triggers Windows UAC prompt (Administrator elevation)
      const err = await shell.openPath(targetPath);
      if (err) {
        console.warn('shell.openPath warning:', err);
        const dir = path.dirname(targetPath);
        exec(`start "" "${targetPath}"`, { cwd: dir, shell: 'cmd.exe' });
      }
      return { success: true };
    } catch (e) {
      const dir = path.dirname(targetPath);
      exec(`start "" "${targetPath}"`, { cwd: dir, shell: 'cmd.exe' });
      return { success: true };
    }
  }

  /**
   * Show file or folder in Explorer
   */
  openInExplorer(targetPath) {
    if (!targetPath) return;
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        shell.openPath(targetPath);
      } else {
        shell.showItemInFolder(targetPath);
      }
    } else {
      const parentDir = path.dirname(targetPath);
      if (fs.existsSync(parentDir)) {
        shell.openPath(parentDir);
      }
    }
  }
}

module.exports = Downloader;
