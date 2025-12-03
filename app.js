// Rotating R Trainer
// THEME TOGGLE
const themeToggleInput = document.getElementById("theme-toggle");

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
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
});

// Load saved theme
applyTheme(localStorage.getItem("theme") || "dark");




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

  feedbackContainer.classList.remove("correct", "wrong");
  feedbackContainer.classList.add(isCorrect ? "correct" : "wrong");
  feedbackIcon.textContent = isCorrect ? "✔" : "✖";
  feedbackText.textContent = isCorrect
    ? `Correct` : `Nope`;
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
  if (e.code === "Space") {
    e.preventDefault();
    newPuzzle();
  }
});

// Tap anywhere in the game area (except buttons) = new puzzle
if (gameArea) {
  const shouldIgnoreTap = target =>
    target.closest("button[data-guess]") || target.closest(".buttons");

  gameArea.addEventListener("click", e => {
    if (!shouldIgnoreTap(e.target)) newPuzzle();
  });

  gameArea.addEventListener(
    "pointerup",
    e => {
      if (e.pointerType === "mouse") return; // mouse handled via click
      if (!shouldIgnoreTap(e.target)) newPuzzle();
    },
    { passive: true }
  );
}

// First load
newPuzzle();
