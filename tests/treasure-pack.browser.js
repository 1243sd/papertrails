import { Zip, ZipPassThrough, deflateSync, unzipSync, zipSync, strToU8 } from 'fflate';
import { readTreasurePack } from '../src/game/treasure-pack.js';
import { createTreasureStorage } from '../src/game/treasure-storage.js';
import { fixturePack } from './game.browser.js';

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
    await reject(make(images, JSON.stringify({ ...manifest, version: 4 })), '版本');
    const v2 = structuredClone(manifest);
    v2.version = 2;
    delete v2.treasures.winter.photo;
    v2.treasures.winter.photos = [
      { image: 'images/winter.png', caption: '下雪的那天' },
      { image: 'images/another.png', caption: '<b>按纯文本处理</b>' },
    ];
    const makeV2 = (extra = []) => make([...images, ...extra], JSON.stringify(v2));
    await reject(makeV2(), '缺少图片');
    const modern = await readTreasurePack(makeV2([['images/another.png', png]]));
    assert(modern.manifest.version === 2 && modern.images['images/another.png'].size === png.length
      && modern.manifest.treasures.winter.photos[1].caption === '<b>按纯文本处理</b>', '多照片及各自说明未保留');
    v2.treasures.winter.photos = Array(7).fill(v2.treasures.winter.photos[0]);
    await reject(makeV2(), '6 张照片');
    v2.treasures.winter.photos = [{ image: 'images/winter.png', caption: ' ' }];
    await reject(makeV2(), '照片说明');
    v2.treasures.winter.photos[0].caption = '照片';
    delete v2.treasures.winter.letter;
    assert(!(await readTreasurePack(makeV2())).manifest.treasures.winter.letter, '版本 2 应支持稍后补信');
    v2.treasures.winter.videos = [{ video: 'videos/memory.webm', caption: '视频回忆' }];
    await reject(makeV2(), '缺少视频');
    await reject(makeV2([['videos/memory.webm', png]]), '视频格式与扩展名不符');
    delete v2.treasures.winter.videos;
    await reject(makeV2(Array.from({ length: 6 }, (_, i) => ['images/extra-' + i + '.png', png])), '9 张');

    const legacyAutumn = await readTreasurePack(make(images, JSON.stringify({
      ...v2, treasures: { ...v2.treasures, autumn: { ...v2.treasures.autumn, memories: { firstChat: null } } },
    })));
    assert(legacyAutumn.manifest.treasures.autumn.memories === undefined, '旧版宝藏包的秋季内容应按旧格式读取');

    const v3 = structuredClone(v2);
    v3.version = 3;
    const memories = {
      firstChat: { sticker: 'images/chat.png' },
      firstMeeting: { photos: [{ image: 'images/meeting-1.png', caption: '<b>第一张</b>' }, { image: 'images/meeting-2.png' }] },
      newYear: { photos: [{ image: 'images/new-year-1.png' }, { image: 'images/new-year-2.png' }] },
      livingTogether: { photos: [{ image: 'images/home-1.png' }, { image: 'images/home-2.png' }] },
      letter: { salutation: '你好', paragraphs: ['第一段', '第二段'], signature: '秋天' },
    };
    v3.treasures.autumn.memories = memories;
    v3.treasures.winter.photos.push(...Array.from({ length: 5 }, (_, i) => ({
      image: 'images/winter-' + i + '.png', caption: '冬天',
    })));
    const autumnPaths = [
      'images/chat.png', 'images/meeting-1.png', 'images/meeting-2.png',
      'images/new-year-1.png', 'images/new-year-2.png', 'images/home-1.png', 'images/home-2.png',
    ];
    const v3Images = [
      ...images,
      ...autumnPaths.map((path) => [path, png]),
      ...Array.from({ length: 5 }, (_, i) => ['images/winter-' + i + '.png', png]),
    ];
    const v3File = (entries = v3Images, data = v3) => make(entries, JSON.stringify(data));
    const archive = unzipSync(new Uint8Array(await (await fixturePack(2)).arrayBuffer()));
    const winterVideoPaths = ['videos/snow-night.webm', 'videos/winter-day.webm', 'videos/winter-evening.webm'];
    v3.treasures.winter.videos = winterVideoPaths.map((video) => ({ video, caption: '冬季影片' }));
    const fullV3Entries = [...v3Images, ...winterVideoPaths.map((path) => [path, archive['videos/snow-night.webm']])];
    const fullV3 = await readTreasurePack(v3File(fullV3Entries));
    const received = fullV3.manifest.treasures.autumn.memories;
    assert(fullV3.manifest.version === 3 && fullV3.manifest.treasures.autumn.image === 'images/autumn.png'
      && Object.keys(fullV3.images).length === 16 && autumnPaths.every((path) => fullV3.images[path]?.type === 'image/png'),
    '版本 3 应保留四季原有图片并读取全部秋季回忆图片');
    assert(received.firstChat.sticker === 'images/chat.png' && received.firstMeeting.photos[0].caption === '<b>第一张</b>'
      && received.firstMeeting.photos[1].caption === undefined && received.newYear.photos[1].image === 'images/new-year-2.png'
      && received.livingTogether.photos[1].image === 'images/home-2.png'
      && received.letter.salutation === '你好' && received.letter.paragraphs[1] === '第二段' && received.letter.signature === '秋天',
    '秋季贴纸、相册或信件的字段未保留');
    assert(fullV3.manifest.treasures.winter.photos.length === 6 && fullV3.manifest.treasures.winter.letter === undefined
      && winterVideoPaths.every((path) => fullV3.videos[path]?.type === 'video/webm'), '版本 3 应延续冬季多照片、视频和可选信件');
    await reject(v3File([...fullV3Entries, ['images/', new Uint8Array()]]), '20 个');
    delete v3.treasures.winter.videos;
    await reject(v3File([...v3Images, ['images/extra.png', png]]), '16 张');
    for (const path of autumnPaths) {
      await reject(v3File(v3Images.filter(([name]) => name !== path)), '缺少图片：' + path);
    }
    await reject(v3File(v3Images.map(([path, bytes]) => [path, path === 'images/chat.png' ? strToU8('invalid') : bytes])), '图片格式');
    const oversizedSticker = png.slice();
    new DataView(oversizedSticker.buffer).setUint32(16, 4097);
    await reject(v3File(v3Images.map(([path, bytes]) => [path, path === 'images/chat.png' ? oversizedSticker : bytes])), '4096 像素');

    const withMemories = (value) => {
      const data = structuredClone(v3);
      data.treasures.autumn.memories = value;
      return v3File(v3Images, data);
    };
    const basic = await readTreasurePack(withMemories(undefined));
    assert(basic.manifest.treasures.autumn.memories === undefined && !basic.images['images/chat.png'],
      '版本 3 可以省略秋季回忆，资源表只保留被引用的图片');
    const partial = await readTreasurePack(withMemories({ newYear: { photos: [] }, letter: { paragraphs: [] } }));
    assert(!partial.manifest.treasures.autumn.memories.firstChat
      && partial.manifest.treasures.autumn.memories.newYear.photos.length === 0
      && partial.manifest.treasures.autumn.memories.letter.paragraphs.length === 0,
    '秋季回忆可以省略章节并使用空相册和信件');
    for (const [value, error] of [
      [null, 'autumn.memories'],
      [{ firstChat: {} }, '图片路径'],
      [{ firstChat: { sticker: 'https://example.invalid/chat.png' } }, '图片路径'],
      [{ firstMeeting: { photos: [{ image: 'images/../chat.png' }] } }, '图片路径'],
      [{ newYear: { photos: 'images/chat.png' } }, '2 张照片'],
      [{ livingTogether: { photos: Array(3).fill({ image: 'images/chat.png' }) } }, '2 张照片'],
      [{ firstMeeting: { photos: [null] } }, 'firstMeeting.photos'],
      [{ firstMeeting: { photos: [{ image: 'images/chat.png', caption: 7 }] } }, 'caption'],
      [{ firstMeeting: { photos: [{ image: 'images/chat.png', caption: '长'.repeat(321) }] } }, 'caption'],
      [{ letter: { paragraphs: '这是一封信' } }, '30 段'],
      [{ letter: { paragraphs: Array(31).fill('正文') } }, '30 段'],
      [{ letter: { paragraphs: ['长'.repeat(2401)] } }, '2400'],
      [{ letter: { paragraphs: [], salutation: false } }, 'salutation'],
      [{ letter: { paragraphs: [], signature: '长'.repeat(141) } }, 'signature'],
    ]) {
      await reject(withMemories(value), error);
    }

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
    return 'ZIP v1 至 v3 校验、失败保留、原子替换及 IndexedDB 重开均通过';
  } finally {
    storage.dispose();
    indexedDB.deleteDatabase(dbName);
  }
}
