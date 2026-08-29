const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

class ImageCacheManager {
  constructor(store) {
    this.store = store;
    const baseDir = (this.store && this.store.userDataPath)
      ? this.store.userDataPath
      : path.join(process.cwd(), '.data');
    this.cacheDir = path.join(baseDir, 'image_cache');

    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create image cache directory:', err);
      }
    }

    // In-flight download deduplication: URL -> Promise<{ filePath, mimeType, fromCache }>
    this.pendingDownloads = new Map();
  }

  /**
   * Get configured Axios instance with proxy support
   */
  _getAxiosClient() {
    const config = this.store ? this.store.getConfig() : {};
    const axiosOptions = {
      timeout: 20000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://flingtrainer.com/'
      }
    };

    if (config.proxy && config.proxy.mode === 'custom' && config.proxy.customUrl) {
      try {
        let proxyStr = config.proxy.customUrl.trim();
        if (!/^https?:\/\//i.test(proxyStr)) {
          proxyStr = 'http://' + proxyStr;
        }
        const proxyUrl = new URL(proxyStr);
        axiosOptions.proxy = {
          protocol: proxyUrl.protocol.replace(':', ''),
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10),
          auth: proxyUrl.username ? { username: proxyUrl.username, password: proxyUrl.password } : undefined
        };
      } catch (e) {
        console.error('Invalid custom proxy URL for image cache:', e);
      }
    }

    return axios.create(axiosOptions);
  }

  /**
   * Extract or deduce file extension from URL
   */
  _getExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname).toLowerCase();
      if (ext && MIME_MAP[ext]) {
        return ext;
      }
    } catch {
      // Fallback regex matching
      const match = url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      if (match && MIME_MAP['.' + match[1].toLowerCase()]) {
        return '.' + match[1].toLowerCase();
      }
    }
    return '.jpg';
  }

  /**
   * Get cached filename and file path for a URL
   */
  getCachePath(url) {
    const hash = crypto.createHash('md5').update(url.trim()).digest('hex');
    const ext = this._getExtension(url);
    const filename = `${hash}${ext}`;
    return {
      filename,
      filePath: path.join(this.cacheDir, filename),
      ext
    };
  }

  /**
   * Get image from local disk cache, or download and cache it
   */
  async getImage(url) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      throw new Error(`Invalid image URL: ${url}`);
    }

    const cleanUrl = url.trim();
    const { filePath, ext } = this.getCachePath(cleanUrl);

    // 1. Check if cached on disk
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          return {
            filePath,
            mimeType: MIME_MAP[ext] || 'image/jpeg',
            fromCache: true
          };
        }
      } catch (e) {
        // Read error, continue to fetch
      }
    }

    // 2. In-flight deduplication
    if (this.pendingDownloads.has(cleanUrl)) {
      return await this.pendingDownloads.get(cleanUrl);
    }

    // 3. Perform network download
    const downloadPromise = (async () => {
      try {
        const client = this._getAxiosClient();
        const response = await client.get(cleanUrl);

        let finalExt = ext;
        const contentType = response.headers['content-type'] || '';
        for (const [e, mime] of Object.entries(MIME_MAP)) {
          if (contentType.toLowerCase().includes(mime)) {
            finalExt = e;
            break;
          }
        }

        const buffer = Buffer.from(response.data);
        if (buffer.length === 0) {
          throw new Error('Downloaded image buffer is empty');
        }

        // Save atomically
        const tempPath = `${filePath}.tmp_${Date.now()}`;
        fs.writeFileSync(tempPath, buffer);
        fs.renameSync(tempPath, filePath);

        return {
          filePath,
          mimeType: MIME_MAP[finalExt] || contentType || 'image/jpeg',
          fromCache: false
        };
      } catch (err) {
        throw new Error(`Failed to download image from ${cleanUrl}: ${err.message}`);
      } finally {
        this.pendingDownloads.delete(cleanUrl);
      }
    })();

    this.pendingDownloads.set(cleanUrl, downloadPromise);
    return await downloadPromise;
  }

  /**
   * Preload a list of images quietly in the background
   */
  async preloadImages(urls = []) {
    if (!Array.isArray(urls) || urls.length === 0) return;
    const validUrls = urls.filter(u => u && typeof u === 'string' && /^https?:\/\//i.test(u.trim()));

    const CONCURRENCY = 4;
    let idx = 0;

    const worker = async () => {
      while (idx < validUrls.length) {
        const target = validUrls[idx++];
        try {
          await this.getImage(target);
        } catch {
          // Ignore background preload errors
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, validUrls.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  }

  /**
   * Get cache directory statistics (file count, total size)
   */
  getCacheStats() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { count: 0, sizeBytes: 0, sizeFormatted: '0 B' };
      }

      const files = fs.readdirSync(this.cacheDir);
      let totalBytes = 0;
      let count = 0;

      for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(this.cacheDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            totalBytes += stats.size;
            count++;
          }
        } catch {
          // Ignore
        }
      }

      return {
        count,
        sizeBytes: totalBytes,
        sizeFormatted: this._formatBytes(totalBytes)
      };
    } catch (e) {
      console.error('Error getting cache stats:', e);
      return { count: 0, sizeBytes: 0, sizeFormatted: '0 B' };
    }
  }

  /**
   * Clear all cached images
   */
  clearCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { success: true, freedBytes: 0, count: 0 };
      }

      const files = fs.readdirSync(this.cacheDir);
      let freedBytes = 0;
      let count = 0;

      for (const file of files) {
        const fullPath = path.join(this.cacheDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            freedBytes += stats.size;
            fs.unlinkSync(fullPath);
            count++;
          }
        } catch (err) {
          console.error(`Failed to delete cache file ${file}:`, err);
        }
      }

      return {
        success: true,
        freedBytes,
        freedFormatted: this._formatBytes(freedBytes),
        count
      };
    } catch (e) {
      console.error('Error clearing image cache:', e);
      return { success: false, error: e.message };
    }
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ImageCacheManager;
