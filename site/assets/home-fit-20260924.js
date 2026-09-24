(() => {
  const photo = document.querySelector('#home .heroPhotoSlider');
  const copy = document.querySelector('#home .heroCopy');
  const bottom = document.querySelector('.bottom');
  if (!photo || !copy || !bottom) return;
  let pending = false;
  const fit = () => {
    pending = false;
    if (window.innerWidth > 600) {
      photo.style.removeProperty('--home-photo-room');
      return;
    }
    // Zoom must remain usable: do not resize the layout during pinch zoom.
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;
    const visibleHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const photoTop = photo.getBoundingClientRect().top + window.scrollY;
    const menuTop = Math.min(visibleHeight - bottom.getBoundingClientRect().height,
      bottom.getBoundingClientRect().top);
    // Preserve readable image captions on exceptionally short screens; scrolling stays available.
    const room = Math.max(160, Math.floor(menuTop - photoTop - copy.getBoundingClientRect().height - 12));
    const value = `${room}px`;
    if (photo.style.getPropertyValue('--home-photo-room') !== value) photo.style.setProperty('--home-photo-room', value);
  };
  const schedule = () => {
    if (!pending) { pending = true; requestAnimationFrame(fit); }
  };
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  const observer = new ResizeObserver(schedule);
  [document.querySelector('header'), copy, bottom].filter(Boolean).forEach(el => observer.observe(el));
  document.fonts?.ready.then(schedule);
  schedule();
})();
