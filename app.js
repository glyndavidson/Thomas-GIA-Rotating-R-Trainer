// Rotating R Trainer
// THEME TOGGLE
const themeToggleInput = document.getElementById("theme-toggle");
const autoProgressToggle = document.getElementById("auto-progress-toggle");
const soundToggle = document.getElementById("sound-toggle");
const errorAudio = document.getElementById("error-audio");
const THEME_KEY = "theme";
const AUTO_PROGRESS_KEY = "autoProgress";
const SOUND_KEY = "soundEnabled";
const storedTheme = localStorage.getItem(THEME_KEY) || "dark";
let autoProgressEnabled =
  localStorage.getItem(AUTO_PROGRESS_KEY) === null
    ? true
    : localStorage.getItem(AUTO_PROGRESS_KEY) === "true";
let soundEnabled =
  localStorage.getItem(SOUND_KEY) === null
    ? true
    : localStorage.getItem(SOUND_KEY) === "true";

function applyTheme(theme) {
  const isDark = theme === "dark";
  if (isDark) {
    document.body.classList.remove("light-theme");
  } else {
    document.body.classList.add("light-theme");
  }
  themeToggleInput.checked = isDark;
}

themeToggleInput.addEventListener("change", () => {
  const newTheme = themeToggleInput.checked ? "dark" : "light";
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
});

// Load saved theme (default dark)
applyTheme(storedTheme || "dark");

function updateHintVisibility() {
  const hint = document.querySelector(".progress-hint");
  if (!hint) return;
  hint.style.display = autoProgressEnabled ? "none" : "";
}

function setAutoProgress(enabled) {
  autoProgressEnabled = enabled;
  if (autoProgressToggle) {
    autoProgressToggle.checked = enabled;
  }
  localStorage.setItem(AUTO_PROGRESS_KEY, String(enabled));
  updateHintVisibility();
}

setAutoProgress(autoProgressEnabled);

if (autoProgressToggle) {
  autoProgressToggle.addEventListener("change", () => {
    setAutoProgress(autoProgressToggle.checked);
  });
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (soundToggle) {
    soundToggle.checked = enabled;
  }
  localStorage.setItem(SOUND_KEY, String(enabled));
}

setSoundEnabled(soundEnabled);

if (soundToggle) {
  soundToggle.addEventListener("change", () => {
    setSoundEnabled(soundToggle.checked);
  });
}




// Each orientation has: chirality (N = normal, M = mirrored) and angle.
const ORIENTATIONS = [
  { id: "N0", chirality: "N", angle: 0 },
  { id: "N90", chirality: "N", angle: 90 },
  { id: "N180", chirality: "N", angle: 180 },
  { id: "N270", chirality: "N", angle: 270 },
  { id: "M0", chirality: "M", angle: 0 },
  { id: "M90", chirality: "M", angle: 90 },
  { id: "M180", chirality: "M", angle: 180 },
  { id: "M270", chirality: "M", angle: 270 }
];

// Current 4 glyphs (g0,g1 left column; g2,g3 right column).
let current = [];

// DOM refs
const glyphEls = [
  document.getElementById("g0"),
  document.getElementById("g1"),
  document.getElementById("g2"),
  document.getElementById("g3")
];
const gameArea = document.getElementById("game");
const feedbackContainer = document.querySelector(".feedback");
const feedbackIcon = document.getElementById("feedback-icon");
const feedbackText = document.getElementById("feedback-text");

function triggerErrorFeedback() {
  if (gameArea) {
    gameArea.classList.remove("game-flash");
    // force reflow to restart animation
    void gameArea.offsetWidth;
    gameArea.classList.add("game-flash");
    setTimeout(() => gameArea.classList.remove("game-flash"), 400);
  }
  if (navigator.vibrate) {
    navigator.vibrate(150);
  }
  if (soundEnabled && errorAudio) {
    errorAudio.currentTime = 0;
    errorAudio.play().catch(() => {});
  }
}

// Helpers
function randomOrientation() {
  const idx = Math.floor(Math.random() * ORIENTATIONS.length);
  return ORIENTATIONS[idx];
}

function applyOrientation(el, ori) {
  const mirrored = ori.chirality === "M";
  const scaleX = mirrored ? -1 : 1;
  el.style.transform = `scaleX(${scaleX}) rotate(${ori.angle}deg)`;
}

// Count how many column pairs match by rotation only (chirality must match; rotation can differ).
function countMatchingPairs() {
  let matches = 0;

  // Left column: g0 vs g1
  if (current[0].chirality === current[1].chirality) matches++;

  // Right column: g2 vs g3
  if (current[2].chirality === current[3].chirality) matches++;

  return matches;
}

function newPuzzle() {
  current = [];
  for (let i = 0; i < 4; i++) {
    const ori = randomOrientation();
    current.push(ori);
    applyOrientation(glyphEls[i], ori);
  }

  // Clear feedback
  feedbackContainer.classList.remove("correct", "wrong");
  feedbackIcon.textContent = "";
  feedbackText.textContent = "";
}

function handleGuess(guess) {
  const correctAnswer = countMatchingPairs();
  const isCorrect = guess === correctAnswer;

  if (isCorrect && autoProgressEnabled) {
    newPuzzle();
    return;
  }

  feedbackContainer.classList.remove("correct", "wrong");
  feedbackContainer.classList.add(isCorrect ? "correct" : "wrong");
  feedbackIcon.textContent = isCorrect ? "✔" : "✖";
  feedbackText.textContent = isCorrect
    ? `Correct` : `Nope`;

  if (!isCorrect) {
    triggerErrorFeedback();
  }
}

// Button events
document.querySelectorAll("button[data-guess]").forEach(btn => {
  btn.addEventListener("click", () => {
    const guess = Number(btn.dataset.guess);
    handleGuess(guess);
  });
});

// Spacebar = new puzzle
document.addEventListener("keydown", e => {
  if (autoProgressEnabled) return;
  if (e.code === "Space") {
    e.preventDefault();
    newPuzzle();
  }
});

// Tap anywhere in the game area (except buttons) = new puzzle
if (gameArea) {
  const shouldIgnoreTap = target =>
    target.closest("button[data-guess]") || target.closest(".buttons");

  const handleTap = target => {
    if (autoProgressEnabled) return;
    if (!shouldIgnoreTap(target)) newPuzzle();
  };

  gameArea.addEventListener("click", e => {
    handleTap(e.target);
  });

  gameArea.addEventListener(
    "pointerup",
    e => {
      if (e.pointerType === "mouse") return; // mouse handled via click
      handleTap(e.target);
    },
    { passive: true }
  );
}

// First load
newPuzzle();
