(() => {
  const AUDIO_ID = 'bg-music';
  const TOGGLE_ID = 'music-toggle';
  const SESSION_KEY = 'hb_music_enabled';
  const TIME_KEY = 'hb_music_time';
  const WAS_PLAYING_KEY = 'hb_music_was_playing';

  function getAudio() {
    return document.getElementById(AUDIO_ID);
  }

  function getToggle() {
    return document.getElementById(TOGGLE_ID);
  }

  function setToggleState(isPlaying) {
    const btn = getToggle();
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isPlaying));
    btn.title = isPlaying ? 'Pause music' : 'Play music';
    btn.textContent = isPlaying ? '♪' : '♫';
  }

  async function tryPlay(audio) {
    if (!audio) return false;
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  function showTapToPlayPrompt() {
    if (document.getElementById('hb-tap-to-play')) return;

    const el = document.createElement('div');
    el.id = 'hb-tap-to-play';
    el.textContent = 'Tap anywhere to play music';
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '86px';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '2001';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '999px';
    el.style.background = 'rgba(255, 255, 255, 0.82)';
    el.style.backdropFilter = 'blur(10px)';
    el.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.12)';
    el.style.color = '#4a4a4a';
    el.style.fontSize = '13px';
    el.style.userSelect = 'none';
    document.body.appendChild(el);
  }

  function hideTapToPlayPrompt() {
    document.getElementById('hb-tap-to-play')?.remove();
  }

  function init() {
    const audio = getAudio();
    if (!audio) return;

    audio.loop = true;
    audio.preload = 'auto';

    // Restore last playback position (best-effort). This can't be perfectly seamless
    // across full page navigations, but it resumes from the previous timestamp.
    const savedTime = Number(sessionStorage.getItem(TIME_KEY) || '0');
    if (Number.isFinite(savedTime) && savedTime > 0) {
      try {
        audio.currentTime = savedTime;
      } catch {
        // Ignore if browser blocks setting currentTime before metadata loads.
        audio.addEventListener(
          'loadedmetadata',
          () => {
            try {
              const t = Number(sessionStorage.getItem(TIME_KEY) || '0');
              if (Number.isFinite(t) && t > 0 && t < (audio.duration || Infinity)) {
                audio.currentTime = t;
              }
            } catch { }
          },
          { once: true }
        );
      }
    }

    // Enabled by default on each new page load.
    // We use sessionStorage so closing/reopening the site returns to "music on".
    // Clean up any old localStorage value from previous versions.
    try { localStorage.removeItem('hb_music_enabled'); } catch { }

    const saved = sessionStorage.getItem(SESSION_KEY);
    const shouldEnable = saved === null ? true : saved === 'true';
    const wasPlaying = (sessionStorage.getItem(WAS_PLAYING_KEY) || 'true') === 'true';

    // Always wire controls, even if music is currently disabled.
    const btn = getToggle();
    if (btn) {
      btn.addEventListener('click', async () => {
        if (audio.paused) {
          const ok = await tryPlay(audio);
          sessionStorage.setItem(SESSION_KEY, String(ok));
          sessionStorage.setItem(WAS_PLAYING_KEY, String(ok));
          setToggleState(ok);
          if (ok) hideTapToPlayPrompt();
        } else {
          audio.pause();
          sessionStorage.setItem(SESSION_KEY, 'false');
          sessionStorage.setItem(WAS_PLAYING_KEY, 'false');
          setToggleState(false);
        }
      });
    }

    audio.addEventListener('play', () => {
      setToggleState(true);
      sessionStorage.setItem(WAS_PLAYING_KEY, 'true');
    });
    audio.addEventListener('pause', () => {
      setToggleState(false);
      sessionStorage.setItem(WAS_PLAYING_KEY, 'false');
    });

    const persistTime = () => {
      try {
        if (!Number.isFinite(audio.currentTime)) return;
        sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
      } catch { }
    };

    audio.addEventListener('timeupdate', persistTime);
    window.addEventListener('pagehide', persistTime);

    if (!shouldEnable) {
      audio.pause();
      setToggleState(false);
      return;
    }

    // If the user paused earlier in this same session, don't force play.
    if (!wasPlaying) {
      audio.pause();
      setToggleState(false);
      return;
    }

    // Autoplay is often blocked until user gesture. We'll try once, then arm a gesture listener.
    tryPlay(audio).then((ok) => {
      setToggleState(ok);
      if (ok) {
        hideTapToPlayPrompt();
        return;
      }

      showTapToPlayPrompt();

      const resume = async () => {
        const played = await tryPlay(audio);
        setToggleState(played);
        if (played) {
          hideTapToPlayPrompt();
          window.removeEventListener('pointerdown', resume);
          window.removeEventListener('touchstart', resume);
          window.removeEventListener('click', resume);
          window.removeEventListener('keydown', resume);
        }
      };

      // Autoplay restrictions (especially on mobile Safari) require a user gesture.
      // We listen to multiple gesture-like events for best compatibility.
      window.addEventListener('pointerdown', resume, { once: false, passive: true });
      window.addEventListener('touchstart', resume, { once: false, passive: true });
      window.addEventListener('click', resume, { once: false, passive: true });
      window.addEventListener('keydown', resume, { once: false });
    });

    // If autoplay succeeded, keep toggle in sync.
  }

  window.addEventListener('DOMContentLoaded', init);
})();
