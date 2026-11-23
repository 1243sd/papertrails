import { Zip, ZipPassThrough, deflateSync, zipSync, strToU8 } from 'fflate';
import { readTreasurePack } from '../src/game/treasure-pack.js';
import { createTreasureStorage } from '../src/game/treasure-storage.js';

export async function checkTreasurePack() {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const image = document.createElement('canvas');
  image.width = 6; image.height = 4;
  const ctx = image.getContext('2d');
  ctx.fillStyle = '#e54975';
  ctx.fillRect(0, 0, 6, 4);
  const blob = await new Promise((resolve) => image.toBlob(resolve));
  const png = new Uint8Array(await blob.arrayBuffer());
  const images = ['spring', 'summer', 'autumn', 'winter'].map((id) => ['images/' + id + '.png', png]);
  const manifest = {
    format: 'papertrails-treasure-pack', version: 1, title: '四季测试',
    treasures: {
      spring: { title: '春', message: '春季测试文字', image: 'images/spring.png' },
      summer: { title: '夏', message: '夏季测试文字', image: 'images/summer.png' },
      autumn: { title: '秋', message: '秋季测试文字', image: 'images/autumn.png' },
      winter: { title: '冬', letter: { salutation: '你好', paragraphs: ['第一段', '第二段'], signature: '测试' }, photo: 'images/winter.png' },
    },
  };
  const make = (entries = images, json = JSON.stringify(manifest)) => new File(
    [zipSync({ 'manifest.json': strToU8(json), ...Object.fromEntries(entries) })], 'treasures.zip',
  );
  async function reject(file, expected) {
    try { await readTreasurePack(file); } catch (error) {
      assert(error.message.includes(expected), '错误信息不明确：' + error.message);
      return;
    }
    throw new Error('没有拦截：' + expected);
  }
  const dbName = 'treasure-pack-test-' + crypto.randomUUID();
  const storage = createTreasureStorage(dbName);
  try {
    const first = await readTreasurePack(make());
    assert(first.images['images/winter.png'].type === 'image/png', '图片未解码保存');
    await storage.replace(first);
    await reject(make(images, '{'), 'JSON');
    await reject(make(images, JSON.stringify({ ...manifest, version: 2 })), '版本');
    await reject(make(images.slice(0, 3)), '缺少图片');
    await reject(make([...images, ['images/winter.png', strToU8('invalid')]]), '图片');
    await reject(make([...images, ['images/winter.png', png.slice(0, 24)]]), '解码');
    await reject(make([...images, ['../a.png', png]]), '路径');
    await reject(make([...images, ['run.exe', png]]), '文件类型');
    await reject(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.zip'), '20 MiB');
    await reject(make([...images, ['images/huge.png', new Uint8Array(12 * 1024 * 1024 + 1)]]), '12 MiB');
    const largeImage = new Uint8Array(10.1 * 1024 * 1024);
    await reject(make([...images, ...Array.from({ length: 4 }, (_, i) => ['images/large-' + i + '.png', largeImage])]), '40 MiB');
    await reject(make([...images, ...Array.from({ length: 16 }, (_, i) => ['images/extra-' + i + '.png', png])]), '20 个');
    class FileWithMalformedPadding extends ZipPassThrough {
      compression = 8;
      process(data, final) {
        const encoded = deflateSync(data);
        const padded = new Uint8Array(encoded.length + 40 * 1024);
        padded.set(encoded);
        this.ondata(null, padded, final);
      }
    }
    const paddedZip = await new Promise((resolve, reject) => {
      const chunks = [];
      const zip = new Zip((error, data, final) => {
        if (error) { reject(error); return; }
        chunks.push(data);
        if (final) resolve(new File(chunks, 'damaged.zip'));
      });
      const entry = new FileWithMalformedPadding('manifest.json');
      zip.add(entry);
      entry.push(strToU8(JSON.stringify(manifest)), true);
      zip.end();
    });
    await reject(paddedZip, '无法解压');
    assert((await storage.load()).manifest.title === '四季测试', '失败导入应保留原内容');
    const second = await readTreasurePack(make(images, JSON.stringify({ ...manifest, title: '更新后的四季' })));
    await storage.replace(second);
    const reopened = createTreasureStorage(dbName);
    try {
      const saved = await reopened.load();
      assert(saved.manifest.title === '更新后的四季' && saved.images['images/winter.png'].size === png.length, '重新打开 IndexedDB 后内容丢失');
    } finally { reopened.dispose(); }
    return 'ZIP 校验、失败保留、原子替换及 IndexedDB 重开均通过';
  } finally {
    storage.dispose();
    indexedDB.deleteDatabase(dbName);
  }
}
