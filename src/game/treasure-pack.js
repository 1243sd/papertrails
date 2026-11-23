import { Inflate } from 'fflate';

const MiB = 1024 * 1024;
export const PACK_LIMITS = {
  maxZipSize: 20 * MiB, maxExtractedSize: 40 * MiB, maxImageSize: 12 * MiB,
  maxFiles: 20, maxImageDimension: 4096,
};
const seasons = ['spring', 'summer', 'autumn', 'winter'];
const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const utf8 = new TextDecoder('utf-8', { fatal: true });
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  for (let bit = 0; bit < 8; bit++) i = (i >>> 1) ^ (i & 1 ? 0xedb88320 : 0);
  return i;
});

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}

function safePath(path, directory = false) {
  const name = directory ? path.slice(0, -1) : path;
  return name.length > 0 && path.length <= 256 && !/[\\:\x00-\x1f\x7f]/u.test(name)
    && name.split('/').every((part) => part && part !== '.' && part !== '..' && part === part.trim());
}

function imageType(path) {
  const ext = path.match(/\.([a-z]+)$/i)?.[1].toLowerCase();
  return path.startsWith('images/') && safePath(path) && ext && Object.hasOwn(mime, ext) ? mime[ext] : null;
}

function readEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p) => view.getUint16(p, true);
  const u32 = (p) => view.getUint32(p, true);
  const invalid = () => new Error('ZIP 格式不正确，或压缩包已损坏。');
  let end = bytes.length - 22;
  const minEnd = Math.max(0, end - 65535);
  while (end >= minEnd && (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)) end--;
  if (end < minEnd || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw invalid();
  const count = u16(end + 10);
  if (count > PACK_LIMITS.maxFiles) throw new Error('ZIP 内最多允许 20 个文件或目录条目。');
  if (!count) throw new Error('ZIP 缺少 manifest.json。');
  const directoryOffset = u32(end + 16);
  if (directoryOffset + u32(end + 12) !== end) throw invalid();
  const entries = new Map();
  const occupied = [];
  let total = 0;
  let p = directoryOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || u32(p) !== 0x02014b50 || u16(p + 34)) throw invalid();
    const flags = u16(p + 8);
    const method = u16(p + 10);
    const crc = u32(p + 16);
    const compressed = u32(p + 20);
    const size = u32(p + 24);
    const nameLength = u16(p + 28);
    const next = p + 46 + nameLength + u16(p + 30) + u16(p + 32);
    const offset = u32(p + 42);
    if (!nameLength || next > end || offset + 30 > directoryOffset || u32(offset) !== 0x04034b50
      || u16(offset + 6) !== flags || u16(offset + 8) !== method || u16(offset + 26) !== nameLength) throw invalid();
    const nameBytes = bytes.subarray(p + 46, p + 46 + nameLength);
    const start = offset + 30 + nameLength + u16(offset + 28);
    const dataEnd = start + compressed;
    if (dataEnd > directoryOffset || nameBytes.some((byte, j) => byte !== bytes[offset + 30 + j])
      || occupied.some(([a, b]) => offset < b && a < dataEnd)) throw invalid();
    occupied.push([offset, dataEnd]);
    const path = utf8.decode(nameBytes);
    const directory = path.endsWith('/');
    if (!safePath(path, directory) || entries.has(path)) throw new Error('ZIP 包含无效或重复路径：' + path);
    const kind = (u32(p + 38) >>> 28) & 15;
    if ((kind && kind !== 8 && kind !== 4) || (directory && !path.startsWith('images/'))
      || (!directory && path !== 'manifest.json' && !imageType(path))) {
      throw new Error('不支持的文件类型：' + path);
    }
    if (flags & 1) throw new Error('ZIP 不支持加密文件：' + path);
    if (method !== 0 && method !== 8) throw new Error('ZIP 使用了不支持的压缩方式：' + path);
    if (method === 0 && compressed !== size) throw invalid();
    if (!(flags & 8) && (u32(offset + 14) !== crc || u32(offset + 18) !== compressed || u32(offset + 22) !== size)) throw invalid();
    if (directory && size) throw invalid();
    if (path === 'manifest.json' && size > 128 * 1024) throw new Error('manifest.json 未压缩时不能超过 128 KiB。');
    if (!directory && path !== 'manifest.json' && size > PACK_LIMITS.maxImageSize) throw new Error('图片超过 12 MiB：' + path);
    total += size;
    if (total > PACK_LIMITS.maxExtractedSize) throw new Error('ZIP 解压后总大小不能超过 40 MiB。');
    entries.set(path, { size, crc, method, directory, contents: bytes.subarray(start, dataEnd) });
    p = next;
  }
  if (p !== end) throw invalid();
  return entries;
}

function extract(entry, path) {
  const { size, crc, method, contents } = entry;
  const output = method === 0 ? contents : new Uint8Array(size);
  let written = method === 0 ? size : 0;
  if (method === 8) {
    try {
      if (!contents.length) throw new Error('empty deflate stream');
      const inflate = new Inflate((chunk) => {
        if (written + chunk.length > size) throw new Error('size');
        output.set(chunk, written);
        written += chunk.length;
      });
      // Bound the output of each push and the input retained by a stalled stream.
      const block = 2048;
      let stalledBytes = 0;
      for (let i = 0; i < contents.length; i += block) {
        const end = Math.min(i + block, contents.length);
        const previous = written;
        inflate.push(contents.subarray(i, end), end === contents.length);
        stalledBytes = previous === written ? stalledBytes + end - i : 0;
        if (stalledBytes > 32 * 1024 || (written === size && contents.length - end > block * 2)) {
          throw new Error('invalid deflate padding');
        }
      }
    } catch {
      throw new Error('ZIP 文件无法解压或大小不符：' + path);
    }
  }
  if (written !== size || crc32(output) !== crc) throw new Error('ZIP 文件完整性校验失败：' + path);
  return output;
}

function parseManifest(bytes) {
  let data;
  try { data = JSON.parse(utf8.decode(bytes)); }
  catch { throw new Error('manifest.json 必须是有效的 UTF-8 JSON。'); }
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const text = (v, name, max) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(name + ' 必须是非空文字，且最多 ' + max + ' 个字符。');
    return v;
  };
  if (!object(data) || data.format !== 'papertrails-treasure-pack') throw new Error('manifest.json 的 format 不正确。');
  if (data.version !== 1) throw new Error('宝藏包版本不受支持，目前仅支持版本 1。');
  if (!object(data.treasures) || Object.keys(data.treasures).length !== seasons.length) throw new Error('宝藏包必须包含春、夏、秋、冬四季。');
  const title = text(data.title, '宝藏包标题', 140);
  const treasures = {};
  for (const id of seasons) {
    const item = data.treasures[id];
    if (!object(item)) throw new Error('缺少或无法识别季节：' + id);
    const heading = text(item.title, id + '.title', 140);
    const path = id === 'winter' ? item.photo : item.image;
    if (typeof path !== 'string' || !imageType(path)) throw new Error(id + ' 的图片路径必须指向 images/ 下的 PNG、JPEG 或 WebP。');
    if (id !== 'winter') treasures[id] = { title: heading, image: path, message: text(item.message, id + '.message', 2000) };
    else {
      const letter = item.letter;
      if (!object(letter) || !Array.isArray(letter.paragraphs) || !letter.paragraphs.length || letter.paragraphs.length > 30) {
        throw new Error('冬季信件必须包含 1 至 30 段文字。');
      }
      treasures[id] = {
        title: heading, photo: path,
        letter: {
          salutation: text(letter.salutation, '冬季称呼', 140),
          paragraphs: letter.paragraphs.map((p, i) => text(p, '冬季第 ' + (i + 1) + ' 段', 2400)),
          signature: text(letter.signature, '冬季落款', 140),
        },
      };
    }
  }
  return { format: data.format, version: 1, title, treasures };
}

/** Check declared dimensions before asking the browser to allocate a decoded surface. */
function imageDimensions(bytes, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  if (type === 'image/png' && bytes.length >= 24 && view.getUint32(0) === 0x89504e47
    && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(12) === 0x49484452) {
    return [view.getUint32(16), view.getUint32(20)];
  }
  if (type === 'image/jpeg' && bytes.length > 4 && view.getUint16(0) === 0xffd8) {
    for (let p = 2; p + 8 < bytes.length && bytes[p] === 0xff;) {
      while (bytes[p] === 0xff) p++;
      const marker = bytes[p++];
      if (marker === 0xda || p + 2 > bytes.length) break;
      const length = view.getUint16(p);
      if (length < 2 || p + length > bytes.length) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
        return [view.getUint16(p + 5), view.getUint16(p + 3)];
      }
      p += length;
    }
  }
  if (type === 'image/webp' && bytes.length >= 25 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const chunk = view.getUint32(12);
    if (chunk === 0x56503858 && bytes.length >= 30) {
      const u24 = (p) => bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16);
      return [1 + u24(24), 1 + u24(27)];
    }
    if (chunk === 0x5650384c && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
    }
    if (chunk === 0x56503820 && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff];
    }
  }
  return null;
}

function checkDimensions(width, height, path) {
  const max = PACK_LIMITS.maxImageDimension;
  if (!width || !height || width > max || height > max) throw new Error('图片宽或高不能超过 4096 像素：' + path);
}

export async function readTreasurePack(file) {
  if (!file || file.size < 22) throw new Error('请选择有效的 ZIP 宝藏包。');
  if (file.size > PACK_LIMITS.maxZipSize) throw new Error('ZIP 压缩包不能超过 20 MiB。');
  let entries;
  try { entries = readEntries(new Uint8Array(await file.arrayBuffer())); }
  catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) throw new Error('ZIP 格式不正确，文件路径必须是 UTF-8。');
    throw error;
  }
  if (!entries.has('manifest.json')) throw new Error('ZIP 根目录缺少 manifest.json。');
  const manifest = parseManifest(extract(entries.get('manifest.json'), 'manifest.json'));
  const paths = new Set(Object.values(manifest.treasures).map((item) => item.image || item.photo));
  for (const path of paths) if (!entries.has(path)) throw new Error('宝藏包缺少图片：' + path);
  const images = {};
  for (const [path, entry] of entries) {
    if (path === 'manifest.json' || entry.directory) continue;
    const bytes = extract(entry, path);
    const type = imageType(path);
    const size = imageDimensions(bytes, type);
    if (!size) throw new Error('图片格式与扩展名不符，或图片已损坏：' + path);
    checkDimensions(size[0], size[1], path);
    const blob = new Blob([bytes], { type });
    let bitmap;
    try { bitmap = await createImageBitmap(blob); }
    catch { throw new Error('图片无法解码：' + path); }
    try { checkDimensions(bitmap.width, bitmap.height, path); }
    finally { bitmap.close(); }
    if (paths.has(path)) images[path] = blob;
  }
  return { manifest, images };
}
