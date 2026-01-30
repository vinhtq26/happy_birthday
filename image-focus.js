(function () {
  function markPortrait(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    // Portrait/standing image heuristic
    const ratio = img.naturalHeight / img.naturalWidth;
    if (ratio >= 1.15) {
      img.classList.add('hb-portrait');

      // Dynamic focus: taller images need higher crop to keep face visible.
      // Values are percentages used by CSS: object-position: 50% var(--hb-focus-y)
      let focusY = 12;
      if (ratio >= 1.75) focusY = 2;
      else if (ratio >= 1.55) focusY = 5;
      else if (ratio >= 1.35) focusY = 8;
      else focusY = 10;

      // Allow manual override via data-focus-y="8%" if needed.
      const override = img.getAttribute('data-focus-y');
      img.style.setProperty('--hb-focus-y', override ? override : `${focusY}%`);
    } else {
      img.classList.remove('hb-portrait');
      img.style.removeProperty('--hb-focus-y');
    }
  }

  function init() {
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img) => {
      if (img.complete) {
        markPortrait(img);
      } else {
        img.addEventListener('load', () => markPortrait(img), { once: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
