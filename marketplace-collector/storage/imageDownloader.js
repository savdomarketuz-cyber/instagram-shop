const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class ImageDownloader {
  /**
   * Bitta rasmni yuklab olish
   */
  static async downloadImage(url, destPath) {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const file = fs.createWriteStream(destPath);

      client.get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(destPath);
          });
        } else {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`Failed to download image: Status ${response.statusCode}`));
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Bir nechta rasmlarni ketma-ket yoki parallel yuklab olish
   */
  static async downloadBatch(images, outputDir, concurrency = 4) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    const queue = [...images];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        const ext = path.extname(item.url.split('?')[0]) || '.jpg';
        const filename = `${item.name || Date.now()}_${item.index || 0}${ext}`;
        const dest = path.join(outputDir, filename);

        try {
          await ImageDownloader.downloadImage(item.url, dest);
          results.push({ url: item.url, path: dest, success: true });
        } catch (err) {
          results.push({ url: item.url, error: err.message, success: false });
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    return results;
  }
}

module.exports = ImageDownloader;
