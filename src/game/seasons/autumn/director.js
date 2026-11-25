import { createFilm } from './memories/index.js';

export function createMemoryDirector(id, startPaused = false) {
  const film = createFilm(id);
  let time = 0;
  let paused = startPaused;
  function seek(value) {
    time = Math.min(film.duration, Math.max(0, value));
    film.sample(time);
  }
  seek(0);
  return {
    scene: film.scene,
    camera: film.camera,
    get time() { return time; },
    get duration() { return film.duration; },
    get ended() { return time === film.duration; },
    get paused() { return paused; },
    get caption() { return film.shots.find(({ start, end }) => time >= start && time < end)?.caption ?? ''; },
    update(dt) { if (!paused && time < film.duration) seek(time + dt); },
    toggle() { paused = !paused; },
    skip() { seek(film.duration); },
    replay() { paused = false; seek(0); },
    dispose: () => film.dispose(),
  };
}
