import { icon } from './icons.js';
import { esc } from './ui.js';

/* A video player that works before your video exists.
   - If `video.mp4` or `video.webm` is set in config.js → a normal HTML5 video player with controls and your poster image.
   - Otherwise → an animated walkthrough built from real application screens (poster = first screen, big play button,
     play/pause, previous/next, progress bar and chapter buttons), clearly labelled as a preview. */
export function player({ id, label, frames, chapters = [], video = {}, configKey }) {
  const note = `<!-- VIDEO SLOT "${id}": to use YOUR video, set VIDEOS.${configKey}.mp4 (and optionally .webm and .poster) in site-src/config.js, drop the file in site/assets/media/, then run: node tools/build-site.mjs -->`;
  if (video.mp4 || video.webm) {
    return `${note}
<div class="player player-video"><video controls preload="none" playsinline poster="${esc(video.poster || '')}" aria-label="${esc(label)}">${video.mp4 ? `<source src="${esc(video.mp4)}" type="video/mp4">` : ''}${video.webm ? `<source src="${esc(video.webm)}" type="video/webm">` : ''}Your browser can't play this video.</video></div>`;
  }
  return `${note}
<div class="player" data-player data-interval="3800" id="player-${esc(id)}" role="group" aria-label="${esc(label)}">
  <div class="player-stage">
    ${frames.map((f, i) => `<img class="pf${i === 0 ? ' active' : ''}" src="${f.img}" width="1180" height="860" alt="${esc(f.title + ' — ' + f.text)}" data-title="${esc(f.title)}" data-text="${esc(f.text)}" data-ch="${f.chapter}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`).join('')}
    <span class="player-badge">Preview walkthrough · your video goes here</span>
    <button type="button" class="player-play" aria-label="Play: ${esc(label)}">${icon('play', 34, 'ic')}</button>
    <div class="player-caption" aria-live="polite"><strong class="pc-title">${esc(frames[0].title)}</strong><span class="pc-text">${esc(frames[0].text)}</span></div>
  </div>
  <div class="player-bar">
    <button type="button" class="pb pb-play" aria-label="Play" aria-pressed="false">${icon('play', 18, 'ic i-play')}${icon('pause', 18, 'ic i-pause')}</button>
    <button type="button" class="pb pb-prev" aria-label="Previous step">${icon('prev', 18)}</button>
    <button type="button" class="pb pb-next" aria-label="Next step">${icon('next', 18)}</button>
    <div class="player-progress" aria-hidden="true"><span></span></div>
    <span class="player-count" aria-hidden="true">1 / ${frames.length}</span>
  </div>
  ${chapters.length ? `<div class="player-chapters">${chapters.map((c, i) => `<button type="button" data-go="${c.start}"${i === 0 ? ' class="on"' : ''}>${esc(c.label)}</button>`).join('')}</div>` : ''}
</div>`;
}
