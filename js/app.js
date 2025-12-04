// Rotating R Trainer
// This file wires up the entire UI state machine (welcome, practice, challenge, results),
// persistence (localStorage), scoring, and the underlying glyph puzzle generator.

// === Persistent UI Toggles & DOM References ===
const themeToggleInput = document.getElementById("theme-toggle");
const autoProgressToggle = document.getElementById("auto-progress-toggle");
const autoProgressToggleLabel = document.getElementById("auto-progress-toggle-label");
const soundToggle = document.getElementById("sound-toggle");
const errorAudio = document.getElementById("error-audio");
const highScoreAudio = document.getElementById("highscore-audio");
const welcomeScreen = document.getElementById("welcome-screen");
const gameCard = document.getElementById("game");
const resultsCard = document.getElementById("results");
const hintPanel = document.getElementById("practice-hint");
const challengeUI = document.getElementById("challenge-ui");
const challengeProgress = document.getElementById("challenge-progress");
const challengeTimerText = document.getElementById("challenge-timer");
const welcomePracticeBtn = document.getElementById("welcome-practice-btn");
const welcomeChallengeBtn = document.getElementById("welcome-challenge-btn");
const practiceStartChallengeBtn = document.getElementById("practice-start-challenge");
const returnToPracticeLink = document.getElementById("return-to-practice");
const resultsPracticeBtn = document.getElementById("results-practice-btn");
const resultsRetryBtn = document.getElementById("results-retry-btn");
const highScoreBanner = document.getElementById("high-score-banner");
const scoreHistoryList = document.getElementById("score-history");
const resetHistoryLink = document.getElementById("reset-history");
const resultsCorrect = document.getElementById("results-correct");
const resultsTotal = document.getElementById("results-total");
const resultsScore = document.getElementById("results-score");
const THEME_KEY = "theme";
const AUTO_PROGRESS_KEY = "autoProgress";
const SOUND_KEY = "soundEnabled";
const SCORES_KEY = "challengeScores";
const storedTheme = localStorage.getItem(THEME_KEY) || "dark";
if (!localStorage.getItem(THEME_KEY)) {
  localStorage.setItem(THEME_KEY, storedTheme);
}
let autoProgressEnabled =
  localStorage.getItem(AUTO_PROGRESS_KEY) === null
    ? true
    : localStorage.getItem(AUTO_PROGRESS_KEY) === "true";
let soundEnabled =
  localStorage.getItem(SOUND_KEY) === null
    ? true
    : localStorage.getItem(SOUND_KEY) === "true";
const progressHint = document.querySelector(".progress-hint");
const MODE = {
  WELCOME: "welcome",
  PRACTICE: "practice",
  CHALLENGE: "challenge",
  RESULTS: "results"
};
let currentMode = MODE.WELCOME;
const CHALLENGE_DURATION_MS = 180000; // 3 minute challenge
let challengeTimerId = null;
let challengeEndTime = null;
let challengeStats = { correct: 0, wrong: 0 };

// --- Mode helpers ---------------------------------------------------------
function isChallengeMode() {
  return currentMode === MODE.CHALLENGE;
}

function isAutoProgressActive() {
  return isChallengeMode() || autoProgressEnabled;
}

function syncAutoProgressUI() {
  if (!autoProgressToggle) return;
  autoProgressToggle.checked = isAutoProgressActive();
  if(isChallengeMode()){
    autoProgressToggle.disabled = true;
    autoProgressToggleLabel.classList.add('toggle-disabled');
  }
}

// --- Theme handling -------------------------------------------------------
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

// --- UI refresh helpers ---------------------------------------------------
function updateHintVisibility() {
  if (progressHint) {
    const showProgressHint = currentMode === MODE.PRACTICE && !isAutoProgressActive();
    progressHint.style.display = showProgressHint ? "inline" : "none";
  }
  if (hintPanel) {
    const shouldShowPanel = currentMode === MODE.PRACTICE || isChallengeMode();
    hintPanel.classList.toggle("hidden", !shouldShowPanel);
    hintPanel.classList.toggle("challenge-mode", isChallengeMode());
  }
}

function setAutoProgress(enabled) {
  autoProgressEnabled = enabled;
  localStorage.setItem(AUTO_PROGRESS_KEY, String(enabled));
  syncAutoProgressUI();
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

// --- Challenge score persistence ------------------------------------------
function loadScoreHistory() {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveScoreHistory(history) {
  localStorage.setItem(SCORES_KEY, JSON.stringify(history));
}

function renderScoreHistory(history) {
  if (!scoreHistoryList) return;
  scoreHistoryList.innerHTML = "";
  if (history.length === 0) {
    scoreHistoryList.innerHTML = "<li>No attempts yet.</li>";
    return;
  }
  const sorted = [...history].sort((a, b) => b.score - a.score).slice(0, 5);
  sorted.forEach(entry => {
    const li = document.createElement("li");
    const date = new Date(entry.timestamp);
    li.textContent = `${date.toLocaleDateString()} : ${entry.score}`;
    scoreHistoryList.appendChild(li);
  });
}

function resetChallengeStats() {
  challengeStats = { correct: 0, wrong: 0 };
  if (challengeProgress) {
    challengeProgress.style.width = "0%";
    challengeProgress.classList.remove("danger");
  }
  if (challengeTimerText) {
    challengeTimerText.textContent = formatTime(CHALLENGE_DURATION_MS);
  }
}

function stopChallengeTimer() {
  if (challengeTimerId) {
    cancelAnimationFrame(challengeTimerId);
    challengeTimerId = null;
  }
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function startChallengeTimer() {
  stopChallengeTimer();
  challengeEndTime = performance.now() + CHALLENGE_DURATION_MS;

  const tick = now => {
    const remaining = Math.max(0, challengeEndTime - now);
    if (challengeProgress) {
      const elapsedPct = ((CHALLENGE_DURATION_MS - remaining) / CHALLENGE_DURATION_MS) * 100;
      challengeProgress.style.width = `${Math.min(100, Math.max(0, elapsedPct))}%`;
      const danger = remaining <= 10000;
      challengeProgress.classList.toggle("danger", danger);
    }
    if (challengeTimerText) {
      challengeTimerText.textContent = formatTime(remaining);
    }

    if (remaining <= 0) {
      endChallenge();
      return;
    }
    challengeTimerId = requestAnimationFrame(tick);
  };

  challengeTimerId = requestAnimationFrame(tick);
}

// --- Mode transitions -----------------------------------------------------
function showWelcomeScreen() {
  currentMode = MODE.WELCOME;
  if (welcomeScreen) welcomeScreen.classList.remove("hidden");
  if (gameCard) gameCard.classList.add("hidden");
  if (resultsCard) resultsCard.classList.add("hidden");
  if (hintPanel) {
    hintPanel.classList.add("hidden");
    hintPanel.classList.remove("challenge-mode");
  }
  if (challengeUI) challengeUI.classList.add("hidden");
  if (returnToPracticeLink) returnToPracticeLink.classList.add("hidden");
  stopChallengeTimer();
  syncAutoProgressUI();
  updateHintVisibility();
}

function enterPracticeMode() {
  currentMode = MODE.PRACTICE;
  if (welcomeScreen) welcomeScreen.classList.add("hidden");
  if (resultsCard) resultsCard.classList.add("hidden");
  if (gameCard) gameCard.classList.remove("hidden");
  if (challengeUI) challengeUI.classList.add("hidden");
  if (hintPanel) {
    hintPanel.classList.remove("hidden");
    hintPanel.classList.remove("challenge-mode");
  }
  if (practiceStartChallengeBtn) practiceStartChallengeBtn.classList.remove("hidden");
  if (returnToPracticeLink) returnToPracticeLink.classList.add("hidden");
  stopChallengeTimer();
  syncAutoProgressUI();
  updateHintVisibility();
  newPuzzle();
}

function enterChallengeMode() {
  currentMode = MODE.CHALLENGE;
  stopChallengeTimer();
  if (welcomeScreen) welcomeScreen.classList.add("hidden");
  if (resultsCard) resultsCard.classList.add("hidden");
  if (gameCard) gameCard.classList.remove("hidden");
  if (challengeUI) challengeUI.classList.remove("hidden");
  if (hintPanel) {
    hintPanel.classList.remove("hidden");
    hintPanel.classList.add("challenge-mode");
  }
  if (practiceStartChallengeBtn) practiceStartChallengeBtn.classList.add("hidden");
  if (returnToPracticeLink) returnToPracticeLink.classList.remove("hidden");
  resetChallengeStats();
  syncAutoProgressUI();
  updateHintVisibility();
  startChallengeTimer();
  newPuzzle();
}

function endChallenge() {
  stopChallengeTimer();
  if (challengeUI) challengeUI.classList.add("hidden");
  if (gameCard) gameCard.classList.add("hidden");
  if (resultsCard) resultsCard.classList.remove("hidden");
  if (hintPanel) hintPanel.classList.add("hidden");
  if (returnToPracticeLink) returnToPracticeLink.classList.add("hidden");
  const total = challengeStats.correct + challengeStats.wrong;
  const score = challengeStats.correct - challengeStats.wrong;
  if (resultsCorrect) resultsCorrect.textContent = String(challengeStats.correct);
  if (resultsTotal) resultsTotal.textContent = String(total);
  if (resultsScore) resultsScore.textContent = String(score);

  const history = loadScoreHistory();
  const prevBest = history.length ? Math.max(...history.map(entry => entry.score)) : null;
  const normalizedScore = Math.max(0, score);
  const isHighScore = prevBest === null || normalizedScore > prevBest;
  const entry = {
    score: normalizedScore,
    timestamp: Date.now()
  };
  history.push(entry);
  saveScoreHistory(history);
  renderScoreHistory(history);
  if (highScoreBanner) {
    highScoreBanner.classList.toggle("hidden", !isHighScore);
  }
  if (isHighScore && soundEnabled && highScoreAudio) {
    highScoreAudio.currentTime = 0;
    highScoreAudio.play().catch(() => {});
  }
  currentMode = MODE.RESULTS;
  syncAutoProgressUI();
  updateHintVisibility();
}

// --- Event wiring ---------------------------------------------------------
if (welcomePracticeBtn) {
  welcomePracticeBtn.addEventListener("click", () => {
    enterPracticeMode();
  });
}

if (welcomeChallengeBtn) {
  welcomeChallengeBtn.addEventListener("click", () => {
    enterChallengeMode();
  });
}

if (practiceStartChallengeBtn) {
  practiceStartChallengeBtn.addEventListener("click", () => {
    enterChallengeMode();
  });
}

if (returnToPracticeLink) {
  returnToPracticeLink.addEventListener("click", e => {
    e.preventDefault();
    enterPracticeMode();
  });
}

if (resultsPracticeBtn) {
  resultsPracticeBtn.addEventListener("click", () => {
    enterPracticeMode();
  });
}

if (resultsRetryBtn) {
  resultsRetryBtn.addEventListener("click", () => {
    enterChallengeMode();
  });
}

if (resetHistoryLink) {
  resetHistoryLink.addEventListener("click", e => {
    e.preventDefault();
    localStorage.removeItem(SCORES_KEY);
    renderScoreHistory([]);
    if (highScoreBanner) highScoreBanner.classList.add("hidden");
  });
}

renderScoreHistory(loadScoreHistory());
showWelcomeScreen();

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

// === Puzzle logic (glyph generation + guessing) ===
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

  if (isChallengeMode()) {
    if (isCorrect) {
      challengeStats.correct += 1;
    } else {
      challengeStats.wrong += 1;
    }
    //updateChallengeScoreboard();
    newPuzzle();
    return;
  }

  if (isCorrect && isAutoProgressActive()) {
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
  if (currentMode !== MODE.PRACTICE) return;
  if (isAutoProgressActive()) return;
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
    if (currentMode !== MODE.PRACTICE) return;
    if (isAutoProgressActive()) return;
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
