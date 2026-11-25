import { Raycaster, Vector2 } from 'three';
import { CONFIG, TILE_SIZE } from '../core/config.js';
import { biomeInfo, findBiome } from '../core/biomes.js';
import { bus } from '../core/events.js';
import { createTreasureChest } from './treasure-chest.js';
import { createTreasureUI } from './treasure-ui.js';
import { createChristmasTree } from './christmas-tree.js';

const settings = CONFIG.game.treasures;
const offsets = [0, -0.24, 0.24, -0.49, 0.49, -0.73, 0.73];

/** Walkable grass comes first. A path shoulder is a fallback if the road remains open beside it. */
export function findTreasureSite(world, seed, biome, origin, radius = 9) {
  if (!origin) return null;
  let fallback = null;
  for (let r = 0; r <= radius; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const cx = origin.x + dx;
      const cz = origin.z + dz;
      if (biomeInfo(seed, cx, cz).id !== biome || world.tileAt(cx, cz)?.biome !== biome) continue;
      for (const zOffset of offsets) for (const xOffset of offsets) {
        const x = cx * TILE_SIZE + xOffset;
        const z = cz * TILE_SIZE + zOffset;
        if (x * x + z * z < 9) continue;
        const surface = world.surfaceAt(x, z);
        if (surface !== 'grass' && (surface !== 'path' || fallback)) continue;
        if (!world.isWalkable(x, z) || world.clearance(x, z) < settings.clearance + (surface === 'path' ? 0.17 : 0)) continue;
        const y = world.heightAt(x, z);
        if (!Number.isFinite(y)) continue;
        if (surface === 'grass') return { cx, cz, x, y, z };
        const step = 0.45;
        const isShoulder = (sx, sz) => {
          const ox = x + sx; const oz = z + sz;
          return world.surfaceAt(ox, oz) === 'grass'
            && world.surfaceAt(x - sx, z - sz) === 'path'
            && world.clearance(x - sx, z - sz) >= CONFIG.player.radius;
        };
        if (isShoulder(step, 0) || isShoulder(-step, 0) || isShoulder(0, step) || isShoulder(0, -step)) {
          fallback = { cx, cz, x, y, z };
        }
      }
    }
  }
  return fallback;
}

export function treasureTileState(world, site) {
  const record = world.tileRecord(site.cx, site.cz);
  return record?.shown && record.fold.target === 1 ? record.fold.progress : 0;
}

export function createTreasures({ world, materials, traveller, progress, seed, controls, game, renderer, follow, treasureUI = true }) {
  const chests = [];
  for (const [id, theme] of Object.entries(settings.seasons)) {
    const center = findBiome(seed, theme.biome, 0, 0, 3, 90)
      ?? findBiome(seed, theme.biome, 0, 0, 1, 180);
    const spot = findTreasureSite(world, seed, theme.biome, center)
      ?? findTreasureSite(world, seed, theme.biome, center, 18);
    if (!spot) { console.warn('[treasures] 找不到安全落点', id, seed); continue; }
    const site = { id, ...spot };
    const chest = createTreasureChest(materials, theme.color, id);
    chest.group.name = 'treasure-' + id;
    const tree = id === 'winter' ? createChristmasTree(materials) : null;
    const group = tree?.group ?? chest.group;
    if (tree) {
      chest.group.position.set(0, 0.035, 0.42);
      tree.group.add(chest.group);
    }
    group.position.set(site.x, site.y, site.z);
    group.visible = false;
    world.group.add(group);
    chests.push({ site, chest, tree, group, ready: false });
  }
  const treeSite = chests.find(({ tree }) => tree)?.site ?? null;

  function sync(entry, dt, snap = false) {
    const { site, chest, tree, group } = entry;
    const fold = treasureTileState(world, site);
    const wasVisible = group.visible;
    entry.ready = fold >= 0.995 && world.tileRecord(site.cx, site.cz)?.fold.settled !== false;
    group.visible = fold > 0.08;
    if (!group.visible) return;
    group.position.y = world.heightAt(site.x, site.z);
    group.scale.setScalar(Math.min(1, fold));
    chest.update(dt, progress.treasureOpened?.(site.id) ?? false, snap || !wasVisible);
    tree?.update(dt);
  }

  const onRise = ({ x, z }) => {
    for (const entry of chests) {
      if (entry.site.cx === x && entry.site.cz === z) sync(entry, 0, true);
    }
  };
  const onHide = ({ x, z }) => {
    for (const entry of chests) {
      if (entry.site.cx !== x || entry.site.cz !== z) continue;
      entry.ready = false;
      entry.group.visible = false;
    }
  };
  const off = [bus.on('tile:rise', onRise), bus.on('tile:flat', onHide), bus.on('tile:despawn', onHide)];
  const root = treasureUI && globalThis.document?.getElementById('treasure-ui');
  const ui = root ? createTreasureUI(root, () => controls?.clearInput(), {
    onPack: (pack, status) => {
      game?.spring?.setPack(pack, status);
      game?.autumn?.setPack(pack, status);
      game?.winter?.setPack(pack, status);
    },
  }) : null;
  let pending = null;

  function nearest(radius) {
    let best = null;
    let limit = radius * radius;
    const p = traveller.position;
    for (const entry of chests) {
      if (!entry.ready) continue;
      const dx = p.x - entry.site.x;
      const dz = p.z - entry.site.z;
      const sq = dx * dx + dz * dz;
      if (sq > limit) continue;
      best = entry;
      limit = sq;
    }
    return best;
  }

  function show(entry) {
    const { id } = entry.site;
    if (id === 'spring' && game?.spring) {
      ui.prompt('');
      game.spring.open();
    } else if (id === 'autumn' && game?.autumn) {
      ui.prompt('');
      game.autumn.open();
    } else if (id === 'winter') {
      ui.prompt('');
      game?.winter?.open(settings.seasons[id]);
    } else ui.showTreasure(id, settings.seasons[id]);
  }

  function isLocked(id) {
    return id === 'winter' && settings.requireEarlierTreasures
      && Object.keys(settings.seasons).some((season) => season !== 'winter' && !progress.treasureOpened(season));
  }

  function onKeyDown(event) {
    const scene = game?.treasureScene?.();
    if (event.code === 'Escape' && (pending || ui.open || scene)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (scene?.escape) {
        if (!event.repeat) scene.escape();
        return;
      }
      pending = null;
      ui.close();
      game?.winter?.close();
      controls?.clearInput();
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey
      || game?.atlasmap?.open || pending || ui.open || scene) return;
    if (event.code === 'KeyI') {
      event.preventDefault();
      controls?.clearInput();
      traveller.velocity?.set(0, 0, 0);
      ui.showImport();
      return;
    }
    if (event.code !== 'KeyF') return;
    const entry = nearest(settings.interactRadius);
    if (!entry || isLocked(entry.site.id)) return;
    event.preventDefault();
    openEntry(entry);
  }

  function openEntry(entry) {
    controls?.clearInput();
    traveller.velocity?.set(0, 0, 0);
    if (progress.openTreasure(entry.site.id)) {
      entry.chest.celebrate();
      pending = entry;
    } else show(entry);
  }

  const canvas = ui && follow?.camera && renderer?.domElement;
  const pointer = new Vector2(), ray = new Raycaster();
  let touch;
  function onTouchDown(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary || !game?.autumn || game.modal()) return;
    const entry = nearest(settings.interactRadius);
    if (entry?.site.id !== 'autumn') return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set(2 * (event.clientX - bounds.left) / bounds.width - 1,
      1 - 2 * (event.clientY - bounds.top) / bounds.height);
    ray.setFromCamera(pointer, follow.camera);
    entry.group.updateWorldMatrix(true, true);
    if (!ray.intersectObject(entry.group, true).length) return;
    event.stopImmediatePropagation();
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, entry };
  }
  function onTouchUp(event) {
    if (touch?.id !== event.pointerId) return;
    const { x, y, entry } = touch;
    touch = undefined;
    if (event.type === 'pointerup' && !game.modal() && nearest(settings.interactRadius) === entry
      && Math.hypot(event.clientX - x, event.clientY - y) < 12) openEntry(entry);
  }
  canvas?.addEventListener('pointerdown', onTouchDown, true);
  if (canvas) {
    window.addEventListener('pointerup', onTouchUp, true);
    window.addEventListener('pointercancel', onTouchUp, true);
  }
  if (ui) window.addEventListener('keydown', onKeyDown, true);

  return {
    sites: chests.map(({ site }) => site),
    treeSite,
    get open() { return !!(pending || ui?.open || game?.treasureScene?.()); },
    update(dt) {
      for (const entry of chests) sync(entry, dt);
      if (!ui) return;
      if (pending?.chest.opened) {
        show(pending);
        pending = null;
      }
      const entry = pending || ui.open || game?.treasureScene?.() || game?.atlasmap?.open ? null : nearest(settings.promptRadius);
      if (!entry) { ui.prompt(''); return; }
      const { id } = entry.site;
      progress.discoverTreasure(id);
      const title = settings.seasons[id].promptTitle ?? settings.seasons[id].title;
      const key = id === 'autumn' && matchMedia('(pointer: coarse)').matches ? '轻触宝箱' : '按 F';
      const action = isLocked(id) ? '先打开春、夏、秋宝箱' : progress.treasureOpened(id) ? key + ' 再次查看' : key + ' 打开';
      const withinReach = nearest(settings.interactRadius) === entry;
      ui.prompt(`✦ ${title}　${withinReach ? action : '再走近一点'}`);
    },
    settle() {
      for (const entry of chests) sync(entry, 0, true);
    },
    isVisible(id) { return chests.some(({ site, group }) => site.id === id && group.visible); },
    isReady(id) { return chests.some(({ site, ready }) => site.id === id && ready); },
    dispose() {
      canvas?.removeEventListener('pointerdown', onTouchDown, true);
      if (canvas) {
        window.removeEventListener('pointerup', onTouchUp, true);
        window.removeEventListener('pointercancel', onTouchUp, true);
      }
      if (ui) window.removeEventListener('keydown', onKeyDown, true);
      ui?.dispose();
      pending = null;
      for (const unsubscribe of off) unsubscribe();
      for (const { chest, tree } of chests) {
        chest.dispose();
        tree?.dispose();
      }
    },
  };
}
