let data = null;
let activeIndex = 0;
let currentVolumeIndex = 0;
let currentTrackIndex = -1;
let shuffleQueue = [];
let isShuffleMode = false;
let isDraggingSeek = false;
let hasStartedPlayback = false;

const carouselTrack = document.getElementById("carousel-track");
const songList = document.getElementById("song-list");
const audio = document.getElementById("audio");
const trackTitle = document.getElementById("track-title");
const trackMeta = document.getElementById("track-meta");
const prevTrackBtn = document.getElementById("prev-track-btn");
const playPauseBtn = document.getElementById("play-pause-btn");
const nextTrackBtn = document.getElementById("next-track-btn");
const shuffleAllBtn = document.getElementById("shuffle-all-btn");
const seekBar = document.getElementById("seek-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const backToVolumesBtn = document.getElementById("back-to-volumes-btn");
const heroSection = document.getElementById("hero-section");
const playerBar = document.querySelector(".player-bar");

fetch("data/volumes.json")
  .then((response) => response.json())
  .then((json) => {
    data = json;
    renderCarousel();
    renderSongs();
    updateBackButtonVisibility();
  })
  .catch((error) => {
    console.error("Could not load volumes.json", error);
  });

function revealPlayer() {
  if (!hasStartedPlayback && playerBar) {
    hasStartedPlayback = true;
    playerBar.classList.remove("player-hidden");
  }
}

function wrapIndex(index) {
  return (index + data.volumes.length) % data.volumes.length;
}

function getDistance(index, active) {
  const total = data.volumes.length;
  let diff = index - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

function renderCarousel() {
  carouselTrack.innerHTML = "";

  data.volumes.forEach((volume, index) => {
    const card = document.createElement("div");
    card.className = "carousel-card";

    const img = document.createElement("img");
    img.src = `${volume.id}.jpeg`;
    img.alt = volume.id;

    card.appendChild(img);

    const diff = getDistance(index, activeIndex);

    let translateX = diff * 29;
    let translateZ = -Math.abs(diff) * 250;
    let rotateY = diff * -24;
    let scale = diff === 0 ? 1 : Math.max(0.58, 1 - Math.abs(diff) * 0.15);
    let opacity = Math.abs(diff) > 2 ? 0 : Math.max(0.16, 1 - Math.abs(diff) * 0.26);
    let blur = Math.abs(diff) * 1.6;
    let zIndex = 100 - Math.abs(diff);

    if (diff === 0) {
      translateX = 0;
      translateZ = 0;
      rotateY = 0;
      scale = 1;
      opacity = 1;
      blur = 0;
      zIndex = 200;
    }

    card.style.transform = `
      translate(-50%, -50%)
      translateX(${translateX}%)
      translateZ(${translateZ}px)
      rotateY(${rotateY}deg)
      scale(${scale})
    `;
    card.style.opacity = opacity;
    card.style.filter = `blur(${blur}px) saturate(${diff === 0 ? 1 : 0.88})`;
    card.style.zIndex = zIndex;

    card.addEventListener("click", () => {
      if (index !== activeIndex) {
        activeIndex = index;
        renderCarousel();
        renderSongs();
        scrollHeroIntoView();
      }
    });

    carouselTrack.appendChild(card);
  });
}

function renderSongs() {
  const volume = data.volumes[activeIndex];
  songList.innerHTML = "";

  volume.songs.forEach((song, index) => {
    const button = document.createElement("button");
    button.className = "song-btn";
    button.textContent = song.title;

    if (activeIndex === currentVolumeIndex && index === currentTrackIndex) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      isShuffleMode = false;
      currentVolumeIndex = activeIndex;
      currentTrackIndex = index;
      playCurrentTrack();
      renderSongs();
    });

    songList.appendChild(button);
  });
}

function getCurrentVolume() {
  return data.volumes[currentVolumeIndex];
}

function getCurrentSong() {
  const volume = getCurrentVolume();
  if (!volume || currentTrackIndex < 0 || currentTrackIndex >= volume.songs.length) {
    return null;
  }
  return volume.songs[currentTrackIndex];
}

function playCurrentTrack() {
  const song = getCurrentSong();
  if (!song) return;

  revealPlayer();

  audio.src = song.src;
  audio.play();

  trackTitle.textContent = song.title;
  trackMeta.textContent = `${song.artist} • ${song.album}`;
  playPauseBtn.textContent = "⏸";

  if (activeIndex !== currentVolumeIndex) {
    activeIndex = currentVolumeIndex;
    renderCarousel();
  }

  renderSongs();
}

function playSongByIndexes(volumeIndex, trackIndex) {
  currentVolumeIndex = volumeIndex;
  currentTrackIndex = trackIndex;
  playCurrentTrack();
}

function flattenAllSongs() {
  const list = [];
  data.volumes.forEach((volume, volumeIndex) => {
    volume.songs.forEach((song, trackIndex) => {
      list.push({ volumeIndex, trackIndex });
    });
  });
  return list;
}

function shuffleArray(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function startShuffleAll() {
  const allSongs = flattenAllSongs();
  if (!allSongs.length) return;

  shuffleQueue = shuffleArray(allSongs);
  isShuffleMode = true;

  const first = shuffleQueue.shift();
  playSongByIndexes(first.volumeIndex, first.trackIndex);
}

function playNextTrack() {
  if (!data) return;

  if (isShuffleMode) {
    if (!shuffleQueue.length) {
      shuffleQueue = shuffleArray(flattenAllSongs());
    }
    const next = shuffleQueue.shift();
    if (next) playSongByIndexes(next.volumeIndex, next.trackIndex);
    return;
  }

  const volume = getCurrentVolume();
  if (!volume) return;

  if (currentTrackIndex < volume.songs.length - 1) {
    currentTrackIndex += 1;
    playCurrentTrack();
    return;
  }

  const nextVolumeIndex = wrapIndex(currentVolumeIndex + 1);
  currentVolumeIndex = nextVolumeIndex;
  currentTrackIndex = 0;
  playCurrentTrack();
}

function playPreviousTrack() {
  if (!data) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  if (isShuffleMode) {
    audio.currentTime = 0;
    return;
  }

  const volume = getCurrentVolume();
  if (!volume) return;

  if (currentTrackIndex > 0) {
    currentTrackIndex -= 1;
    playCurrentTrack();
    return;
  }

  const prevVolumeIndex = wrapIndex(currentVolumeIndex - 1);
  const prevVolume = data.volumes[prevVolumeIndex];
  currentVolumeIndex = prevVolumeIndex;
  currentTrackIndex = prevVolume.songs.length - 1;
  playCurrentTrack();
}

function togglePlayPause() {
  if (!audio.src) {
    const activeVolume = data.volumes[activeIndex];
    if (activeVolume && activeVolume.songs.length) {
      isShuffleMode = false;
      currentVolumeIndex = activeIndex;
      currentTrackIndex = 0;
      playCurrentTrack();
    }
    return;
  }

  revealPlayer();

  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updateTimeline() {
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);

  if (!isDraggingSeek) {
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seekBar.value = percent;
  }
}

function scrollHeroIntoView() {
  heroSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function updateBackButtonVisibility() {
  const heroBottom = heroSection.getBoundingClientRect().bottom;
  if (heroBottom < window.innerHeight * 0.55) {
    backToVolumesBtn.classList.add("visible");
  } else {
    backToVolumesBtn.classList.remove("visible");
  }
}

let startX = 0;
let isPointerDown = false;
const swipeThreshold = 42;

carouselTrack.addEventListener("pointerdown", (event) => {
  isPointerDown = true;
  startX = event.clientX;
});

carouselTrack.addEventListener("pointerup", (event) => {
  if (!isPointerDown) return;
  isPointerDown = false;

  const deltaX = event.clientX - startX;
  if (Math.abs(deltaX) < swipeThreshold) return;

  if (deltaX < 0) {
    activeIndex = wrapIndex(activeIndex + 1);
  } else {
    activeIndex = wrapIndex(activeIndex - 1);
  }

  renderCarousel();
  renderSongs();
});

carouselTrack.addEventListener("pointerleave", () => {
  isPointerDown = false;
});

shuffleAllBtn.addEventListener("click", startShuffleAll);
prevTrackBtn.addEventListener("click", playPreviousTrack);
nextTrackBtn.addEventListener("click", playNextTrack);
playPauseBtn.addEventListener("click", togglePlayPause);
backToVolumesBtn.addEventListener("click", scrollHeroIntoView);

audio.addEventListener("play", () => {
  revealPlayer();
  playPauseBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "▶";
});

audio.addEventListener("timeupdate", updateTimeline);
audio.addEventListener("loadedmetadata", updateTimeline);
audio.addEventListener("ended", playNextTrack);

seekBar.addEventListener("input", () => {
  isDraggingSeek = true;
  const targetTime = audio.duration ? (seekBar.value / 100) * audio.duration : 0;
  currentTimeEl.textContent = formatTime(targetTime);
});

seekBar.addEventListener("change", () => {
  const targetTime = audio.duration ? (seekBar.value / 100) * audio.duration : 0;
  audio.currentTime = targetTime;
  isDraggingSeek = false;
});

document.addEventListener("keydown", (event) => {
  if (!data) return;

  if (event.key === "ArrowRight") {
    activeIndex = wrapIndex(activeIndex + 1);
    renderCarousel();
    renderSongs();
  }

  if (event.key === "ArrowLeft") {
    activeIndex = wrapIndex(activeIndex - 1);
    renderCarousel();
    renderSongs();
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayPause();
  }
});

window.addEventListener("scroll", updateBackButtonVisibility);
window.addEventListener("resize", updateBackButtonVisibility);