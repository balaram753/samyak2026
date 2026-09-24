// Background music controller for SAMYAK 2026
// Plays the official festival audio track (samyak launc.mpeg / samyak-launch.mp3)

let audioElement = null;
let isMuted = false;
let listeners = new Set();

function notifyListeners() {
  const state = {
    isPlaying: audioElement ? !audioElement.paused : false,
    isMuted: isMuted,
    currentTime: audioElement ? audioElement.currentTime : 0,
    duration: audioElement ? audioElement.duration : 0,
  };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // ignore
    }
  });
}

export function initLaunchAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioElement) {
    audioElement = new Audio();
    // Try primary MP3 / MPEG paths
    audioElement.src = '/samyak-launch.mp3';
    audioElement.preload = 'auto';
    audioElement.loop = true;
    audioElement.volume = 0.85;

    // Fallback if mp3 fails
    audioElement.addEventListener('error', () => {
      if (audioElement && audioElement.src.endsWith('.mp3')) {
        audioElement.src = '/samyak-launch.mpeg';
        audioElement.load();
      }
    });

    audioElement.addEventListener('play', notifyListeners);
    audioElement.addEventListener('pause', notifyListeners);
    audioElement.addEventListener('timeupdate', notifyListeners);
    audioElement.addEventListener('ended', notifyListeners);
  }
  return audioElement;
}

export function playLaunchMusic() {
  const audio = initLaunchAudio();
  if (!audio) return Promise.resolve();

  audio.muted = isMuted;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    return playPromise.catch((err) => {
      console.warn('Audio play notice:', err.message);
    });
  }
  return Promise.resolve();
}

export function pauseLaunchMusic() {
  if (audioElement && !audioElement.paused) {
    audioElement.pause();
    notifyListeners();
  }
}

export function toggleLaunchMusic() {
  if (!audioElement || audioElement.paused) {
    playLaunchMusic();
  } else {
    pauseLaunchMusic();
  }
}

export function setMusicMuted(muted) {
  isMuted = muted;
  if (audioElement) {
    audioElement.muted = muted;
  }
  notifyListeners();
}

export function isLaunchMusicPlaying() {
  return audioElement ? !audioElement.paused : false;
}

export function getAudioElement() {
  return audioElement;
}

export function subscribeAudioState(listener) {
  listeners.add(listener);
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}
