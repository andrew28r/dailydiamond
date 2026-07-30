let selectedDate = getSelectedDate();

const [year, month, day] = selectedDate.split("-");
document.getElementById("gameDate").textContent = `${month}/${day}/${year}`;

/*const [year, month, day] = selectedDate.split("-");

document.getElementById("gameDate").textContent =
  `${Number(month)}/${Number(day)}/${year}`;*/

let gameInfoObj;

let playerGame;
let statusGameWin = "false";
let statusGameCompleted = "false";
let statusCompletedSameDay = "false";

let inactivityTimer;

let teamCache = {};
let divisionCache = {};

const TIMEOUT_MINUTES = 30;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;


const today = getEasternDateString();
/*if (selectedDate > today) {
    window.location.href = "index.html";
}*/


async function loadPlayerGame() {
  playerGame = await playerGames(selectedDate);

  if (playerGame) {

    guesses = playerGame.guesses
      ? JSON.parse(playerGame.guesses)
      : [];

    await removeDuplicateGuesses();

    statusGameWin = playerGame.win || "false";
    statusGameCompleted = playerGame.completed || "false";
    statusCompletedSameDay = playerGame.completedSameDay || "false";

    totalHintClicks = Number(playerGame.hintClicks || 0);

    // LOAD HINT DATA FROM SUPABASE
    hintClickCount = Number(playerGame.hintStage || 0);

    hintedPlayer = playerGame.hintPlayer || null;

    document.getElementById("hintNumber").textContent = totalHintClicks;

  } else {

    guesses = [];
    statusGameWin = "false";
    statusGameCompleted = "false";

    hintClickCount = 0;
    hintedPlayer = null;

  }

  if (statusGameCompleted === "true") {
    gameLocked = true;
    applyLockUI();
  }

  console.log("Loaded guesses:", guesses);
}


window.addPlayerGame = async function (
  date,
  guesses = "",
  guessesNumber = "0",
  win = "",
  completed = "",
  completedSameDay = "",
  hintClicks = "0",
  hintStage = 0,
  hintPlayer = null,
  ratingChange = null
) {
  const playerId = getPlayerId();
  if (!playerId) return null;

  const { data, error } = await db
    .from("playerGames")
    .upsert({
        playerId,
        date,
        guesses,
        guessesNumber,
        win,
        completed,
        completedSameDay,
        hintClicks,
        hintStage,
        hintPlayer,
        ratingChange
    }, {
        onConflict: "playerId,date"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};


window.updatePlayerGame = async function (
  date,
  guesses,
  guessesNumber,
  win,
  completed,
  completedSameDay,
  hintClicks,
  hintStage,
  hintPlayer,
  ratingChange = null
) {
  const playerId = getPlayerId();
  if (!playerId) return null;

  const { data, error } = await db
    .from("playerGames")
    .update({
      guesses,
      guessesNumber,
      win,
      completed,
      completedSameDay,
      hintClicks,
      hintStage,
      hintPlayer,
      ratingChange
    })
    .eq("playerId", playerId)
    .eq("date", date)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};


window.insertData = async function () {
  const gameObj = getGameForDate(selectedDate);

  const { error } = await db
    .from("games")
    .upsert([
      {
        date: selectedDate,
        gameinfo: gameObj
      }
    ], { onConflict: "date" });

  document.getElementById("output").textContent =
    error ? error.message : "Game created!";
};

window.checkData = async function (getAll = false) {

    let query = db.from("games").select("*");

    if (!getAll) {
        query = query.eq("date", selectedDate).maybeSingle();
    }

    const { data, error } = await query;

    if (error) {
        document.getElementById("output").textContent = error.message;
        return null;
    }

    document.getElementById("output").textContent =
        JSON.stringify(data, null, 2);

    return data;
};


const input = document.getElementById("search");
const dropdown = document.getElementById("dropdown");
const board = document.getElementById("board");
const lastGuess = document.getElementById("lastGuess");
const guessCounter = document.getElementById("guessCounter");
const message = document.getElementById("message");
const gameTitle = document.getElementById("gameTitle");
const hint = document.getElementById("hint");
const menu = document.getElementById("menu");
const statHeader = document.getElementById("statHeader");


let gameLocked = false;
let gameOutcome = null; 
// "win" | "giveup"

let hintedPlayer = null;
let hintClickCount = 0;
let totalHintClicks = 0;

let GAME;



/* =========================
   CONFIG
========================= */
const TEAMS = [
  { id: 109, name: "Arizona Diamondbacks" },
  { id: 144, name: "Atlanta Braves" },
  { id: 147, name: "New York Yankees" },
  { id: 110, name: "Baltimore Orioles" },
  { id: 111, name: "Boston Red Sox" },
  { id: 112, name: "Chicago Cubs" },
  { id: 145, name: "Chicago White Sox" },
  { id: 113, name: "Cincinnati Reds" },
  { id: 114, name: "Cleveland Guardians" },
  { id: 115, name: "Colorado Rockies" },
  { id: 116, name: "Detroit Tigers" },
  { id: 117, name: "Houston Astros" },
  { id: 118, name: "Kansas City Royals" },
  { id: 108, name: "Los Angeles Angels" },
  { id: 119, name: "Los Angeles Dodgers" },
  { id: 158, name: "Milwaukee Brewers" },
  { id: 142, name: "Minnesota Twins" },
  { id: 121, name: "New York Mets" },
  { id: 133, name: "Oakland Athletics" },
  { id: 143, name: "Philadelphia Phillies" },
  { id: 134, name: "Pittsburgh Pirates" },
  { id: 135, name: "San Diego Padres" },
  { id: 137, name: "San Francisco Giants" },
  { id: 136, name: "Seattle Mariners" },
  { id: 138, name: "St. Louis Cardinals" },
  { id: 139, name: "Tampa Bay Rays" },
  { id: 140, name: "Texas Rangers" },
  { id: 141, name: "Toronto Blue Jays" },
  { id: 120, name: "Washington Nationals" }
];

const STATS = [
  { stat: "homeRuns", title: "Home Runs", group: "hitting", includeTeamSeason: true },
  { stat: "triples", title: "Triples", group: "hitting", includeTeamSeason: false },
  { stat: "doubles", title: "Doubles", group: "hitting", includeTeamSeason: false },
  { stat: "hits", title: "Hits", group: "hitting", includeTeamSeason: true },
  { stat: "baseOnBalls", title: "Walks", group: "hitting", includeTeamSeason: false },
  { stat: "rbi", title: "RBI", group: "hitting", includeTeamSeason: false },
  { stat: "stolenBases", title: "Stolen Bases", group: "hitting", includeTeamSeason: false },
  { stat: "gamesPlayed", title: "Games Played", group: "hitting", includeTeamSeason: false },
  { stat: "extraBaseHits", title: "Extra-Base Hits", group: "hitting", includeTeamSeason: false },
  { stat: "atBats", title: "At Bats", group: "hitting", includeTeamSeason: false },
  { stat: "runs", title: "Runs", group: "hitting", includeTeamSeason: false },
  { stat: "plateAppearances", title: "Plate Appearances", group: "hitting", includeTeamSeason: false },
  { stat: "sacFlies", title: "Sacrifice Flies", group: "hitting", includeTeamSeason: false },
  { stat: "hitByPitch", title: "Hit By Pitch", group: "hitting", includeTeamSeason: false },
  { stat: "strikeOuts", title: "Strikeouts", group: "hitting", includeTeamSeason: false },

  { stat: "wins", title: "Wins", group: "pitching", includeTeamSeason: true },
  { stat: "strikeOuts", title: "Strikeouts", group: "pitching", includeTeamSeason: true },
  { stat: "saves", title: "Saves", group: "pitching", includeTeamSeason: false },
  { stat: "inningsPitched", title: "Innings Pitched", group:"pitching", includeTeamSeason: false  },
  { stat: "era", title: "ERA", group:"pitching", includeTeamSeason: false  },
  { stat: "whip", title: "WHIP", group:"pitching", includeTeamSeason: false  },
  { stat: "gamesStarted", title: "Games Started", group:"pitching", includeTeamSeason: false  },
  { stat: "completeGames", title: "Complete Games", group:"pitching", includeTeamSeason: false  },
  { stat: "shutouts", title: "Shutouts", group:"pitching", includeTeamSeason: false  },
  { stat: "qualityStarts", title: "Quality Starts", group:"pitching", includeTeamSeason: false  }
];

const YEARS = [
  1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
  2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 
  2020, 2021, 2022, 2023, 2024, 2025
];

const DECADES = [1970, 1980, 1990, 2000, 2010, 2020];


function getGameSignature(game) {
  return JSON.stringify({
    group: game.group,
    sortStat: game.sortStat,
    stats: game.stats,
    season: game.season || null,
    teamId: game.teamId || null,
    startDate: game.startDate || null,
    endDate: game.endDate || null,
    gameType: game.gameType || "R",
  });
}



/* =========================
   SEED SYSTEM
========================= */

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}


function getEasternDayNumber() {
  const easternDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  return Math.floor(
    new Date(
      easternDate.getFullYear(),
      easternDate.getMonth(),
      easternDate.getDate()
    ).getTime() / 86400000
  );
}



/* =========================
   GAME GENERATOR
========================= */


/* =========================
   STATE
========================= */

let leaderboard = [];
let guesses = [];
let matches = [];
let activeIndex = -1;
let searchTimeout = null;



/* =========================
   STORAGE
========================= */

function getSelectedDate() {
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get("date");

  if (urlDate) return urlDate;

  return getEasternDateString();
}

async function saveGame() {

  console.log("statusGameCompleted:", statusGameCompleted);
  console.log("selectedDate:", selectedDate);
  console.log("today:", getEasternDateString());

  const gameData = {
    guesses: JSON.stringify(guesses),
    guessesNumber: String(guesses.length),
    win: String(statusGameWin),
    completed: String(statusGameCompleted),

    completedSameDay:
      statusGameCompleted === "true" &&
      selectedDate === getEasternDateString()
        ? "true"
        : "false",

    hintClicks: String(totalHintClicks),
    hintStage: hintClickCount,
    hintPlayer: hintedPlayer,

    // KEEP EXISTING RATING CHANGE
    ratingChange:
      playerGame?.ratingChange ?? null
  };


  playerGame = await addPlayerGame(
    selectedDate,
    gameData.guesses,
    gameData.guessesNumber,
    gameData.win,
    gameData.completed,
    gameData.completedSameDay,
    gameData.hintClicks,
    gameData.hintStage,
    gameData.hintPlayer,
    gameData.ratingChange
  );
    
  if (
    statusGameCompleted === "false" &&
    guesses.length > 0 &&
    playerGame?.ratingChange == null
  ) {
    await applyRatingChange(selectedDate, -25);
  }

  await updateGamesPlayed(getPlayerId());

  console.log("Game Saved.");
}

/* =========================
   RESET DAILY GAME
========================= */


function getEasternDayNumberFromDate(dateString) {
  const date = new Date(dateString);

  const easternDate = new Date(
    new Date(date).toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  return Math.floor(
    new Date(
      easternDate.getFullYear(),
      easternDate.getMonth(),
      easternDate.getDate()
    ).getTime() / 86400000
  );
}


/* =========================
   LEADERBOARD
========================= */

async function loadLeaderboard(){

  leaderboard =
    await getCachedLeaderboard(gameInfoObj);


  gameTitle.textContent =
    gameInfoObj.title;


  renderStatHeader();

  render();

  lastGuess.innerHTML="";


  document.getElementById(
    "guessNumber"
  ).textContent = guesses.length;


  if(leaderboard.length)
    checkWin();

}




/* =========================
   UI HELPERS
========================= */

function getColorClass(rank) {
  if (typeof rank !== "number") return "other";

  if (rank <= 5) return "top5";
  if (rank <= 10) return "top10";
  if (rank <= 25) return "top25";

  return "ranked";
}

function renderDropdown() {
  dropdown.innerHTML = "";

  if (!matches.length) {
    dropdown.style.display = "none";
    return;
  }

  matches.forEach((player, index) => {
    const div = document.createElement("div");
    div.className = "item";

    if (index === activeIndex) div.classList.add("active");

    const img = document.createElement("img");
    img.src = getHeadshot(player.id);
    img.className = "dropdown-headshot";

    img.onerror = () => {
      img.src =
        "https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/default/headshot/0/current";
    };

    const span = document.createElement("span");
    span.textContent = player.name;

    div.appendChild(img);
    div.appendChild(span);

    div.onclick = () => {
      input.value = player.name;
      dropdown.style.display = "none";
      guessPlayer();
    };

    dropdown.appendChild(div);
  });

  dropdown.style.display = "block";
}

/* =========================
   GAME LOGIC
========================= */

async function guessPlayer() {

  if (gameLocked) {
    message.textContent = "This game is locked.";
    return;
  }
  const value = input.value.trim();
  if (!value) return;

  const normalized = value.toLowerCase();

  const already = guesses.some(g => g.name.toLowerCase() === normalized);
  if (already) {
    message.textContent = `Already guessed: ${value}`;
    input.value = "";
    dropdown.style.display = "none";
    return;
  }

  // VALIDATE AGAINST MLB API
  const validPlayer = await validatePlayerName(value);

  if (!validPlayer) {
    message.textContent = `❌ "${value}" is not a valid MLB player`;
    input.value = "";
    dropdown.style.display = "none";
    return;
  }

  if (
    hintedPlayer &&
    validPlayer.fullName.toLowerCase() === hintedPlayer.name.toLowerCase()
  ) {
      hint.textContent = "";
      hintedPlayer = null;
      hintClickCount = 0;

      setHintStage(0);
      clearHintData();
  }
  
  // now check leaderboard AFTER validation
  const player = leaderboard.find(
    p => p.name.toLowerCase() === normalized
  );

  guesses.unshift(
    player || {
      rank: null,
      name: validPlayer.fullName,
      value: "-"
    }
  );

  message.textContent = "";

  render();
  document.getElementById("guessNumber").textContent = guesses.length;

  renderStatHeader();
  await checkWin();
  renderLastGuess();
  updateHowTo();

  input.value = "";
  dropdown.style.display = "none";
  
  clearTimeout(inactivityTimer);
  await saveGame();
  resetInactivityTimer();
}

async function checkWin() {
  // Game already finished
  if (gameLocked || statusGameCompleted === "true") return;

  // Cannot possibly win before 5 guesses
  if (guesses.length < 5) return;

  const topFive = leaderboard
    .filter(p => p.rank <= 5)
    .map(p => p.name.toLowerCase());

  // Leaderboard is invalid
  if (topFive.length !== 5) return;

  const guessed = guesses.map(g => g.name.toLowerCase());

  // Must have exactly the 5 unique Top 5 players
  const guessedTopFive = [...new Set(
    guessed.filter(name => topFive.includes(name))
  )];

  if (guessedTopFive.length !== 5) return;

  // WIN
  gameOutcome = "win";
  statusGameWin = "true";
  statusGameCompleted = "true";
  gameLocked = true;

  clearHintData();

  await saveGame();
  await processCompletedRating();

  stopAutoSave();

  applyLockUI();
  openPopup();
}


function closePopup() {
  document.getElementById("winPopup").style.display = "none";
}


function shareResults() {
  const { green, yellow, red, gray } = getGuessStats();
  const [year, month, day] = selectedDate.split("-");
  const displayDate = `${month}/${day}/${year}`;

  const outcomeText =
    gameOutcome === "giveup"
      ? "Gave Up ❌"
      : "Solved ✅";

  const text =
`Daily Diamond - ${displayDate}

Total guesses: ${guesses.length}
🟢 ${green}
🟡 ${yellow}
🔴 ${red}
⚫ ${gray}
Game: ${GAME.title}`;

  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Copied to clipboard!");
    })
    .catch(() => {
      alert("Copy failed");
    });
}


function openPopup() {
  const popup = document.getElementById("winPopup");
  const scoreStats = document.getElementById("scoreStats");
  const title = document.getElementById("winTitle");

  title.textContent = "You Win!";

  const { green, yellow, red, gray } = getGuessStats();

  scoreStats.innerHTML = `
    <div class="score-row">
      Total guesses: ${guesses.length}
    </div>
    <div class="score-row">
      <span class="dot green"></span> ${green}
    </div>
    <div class="score-row">
      <span class="dot yellow"></span> ${yellow}
    </div>
    <div class="score-row">
      <span class="dot red"></span> ${red}
    </div>
    <div class="score-row">
      <span class="dot gray"></span> ${gray}
    </div>
  `;

  popup.style.display = "block";
}

async function openGiveUpPopup() {
  const popup = document.getElementById("winPopup");
  const title = document.getElementById("winTitle");
  const scoreStats = document.getElementById("scoreStats");

  gameOutcome = "giveup";
  title.textContent = "You Gave Up!";

  statusGameWin = "false";
  statusGameCompleted = "true";
  gameLocked = true;

  clearHintData();

  await saveGame(); // <-- ADD THIS
  await processCompletedRating();
  
  stopAutoSave();
  applyLockUI();

  const { green, yellow, red, gray } = getGuessStats();

  scoreStats.innerHTML = `
    <div class="score-row">
      Total guesses: ${guesses.length}
    </div>
    <div class="score-row">
      <span class="dot green"></span> ${green}
    </div>
    <div class="score-row">
      <span class="dot yellow"></span> ${yellow}
    </div>
    <div class="score-row">
      <span class="dot red"></span> ${red}
    </div>
    <div class="score-row">
      <span class="dot gray"></span> ${gray}
    </div>
  `;

  popup.style.display = "block";
}




function getGameFromSeed(seed, dateString) {
  const rules = getDailyGameRules(dateString);

  console.log("Generating:", dateString);
  console.log("Rules:", rules);

  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  const r4 = seededRandom(seed + 3);
  const r5 = seededRandom(seed + 4);

  let isTeamGame;

  if (rules.type === "random") {
    isTeamGame = r1 < 0.35;
  } else {
    isTeamGame = rules.teamOnly;
  }

  const team = isTeamGame
    ? rules.forcedTeam
        ? TEAMS.find(t => t.id === rules.forcedTeam)
        : TEAMS[Math.floor(r2 * TEAMS.length)]
    : null;

  let availableStats = STATS;

  if (isTeamGame) {
    availableStats = STATS.filter(
      s => s.includeTeamSeason !== false
    );
  }

  const stat = availableStats[
    Math.floor(r3 * availableStats.length)
  ];


  let game = {
    group: stat.group,
    sortStat: stat.stat,
    sortOrder: "desc",
    titleType: "Most"
  };


  if (
    ["era","whip"].includes(game.sortStat)
  ) {
    game.sortOrder = "asc";
    game.titleType = "Lowest";
  }


  if (isTeamGame) {
    game.teamId = team.id;
    game.teamName = team.name;
  }

  const word = game.titleType || "Most";

  if (
    rules.type === "career" ||
    (rules.type === "random" && r4 < 0.33)
  ) {
    game.stats = "career";
    game.title = isTeamGame
      ? `${word} Career ${stat.title} for ${team.name}`
      : `${word} Career ${stat.title}`;
  } else if (
    rules.type === "season" ||
    (rules.type === "random" && r4 < 0.66)
  ) {
    const year = YEARS[Math.floor(r5 * YEARS.length)];

    game.stats = "season";
    game.season = year;

    game.title = isTeamGame
      ? `${word} ${stat.title} in ${year} for ${team.name}`
      : `${word} ${stat.title} in ${year}`;
  } else {
    const decade = DECADES[Math.floor(r5 * DECADES.length)];

    game.stats = "byDateRange";
    game.startDate = `${decade}-01-01`;
    game.endDate = `${decade + 9}-12-31`;

    game.title = isTeamGame
      ? `${word} ${stat.title} in the ${decade}s for ${team.name}`
      : `${word} ${stat.title} in the ${decade}s`;
  }

  return game;
}

function getGameForDate(dateString) {
  return getGameFromSeed(
    getEasternDayNumberFromDate(dateString),
    dateString
  );
}

async function generateUniqueGame(dateString) {

  const baseSeed = Math.floor(Math.random() * 1000000000);

  const { data, error } = await db
    .from("games")
    .select("gameinfo");

  if (error) throw error;

  const used = new Set();

  data.forEach(row => {
    const game =
      typeof row.gameinfo === "string"
        ? JSON.parse(row.gameinfo)
        : row.gameinfo;

    used.add(getGameSignature(game));
  });

  let offset = 0;

  while (offset < 1000) {
    const game = getGameFromSeed(baseSeed + offset, dateString);

    if (!used.has(getGameSignature(game))) {
      return game;
    }

    offset++;
  }

  throw new Error("Could not generate unique game.");
}

/* =========================
   RENDER
========================= */

function render() {
  board.innerHTML = "";

  const sorted = [...guesses].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  sorted.forEach(g => {
    board.appendChild(createLeaderboardRow(g));
  });
}

function renderLastGuess() {
  lastGuess.innerHTML = "";

  if (!guesses.length) return;

  const g = guesses[0];

  const div = document.createElement("div");

  div.className = `rowGuess ${
    typeof g.rank === "number" ? getColorClass(g.rank) : "other"
  }`;

  div.innerHTML = `
    <div class="rank">${g.rank ?? "-"}</div>
    <div class="name">${g.name}</div>
    <div class="value">${g.value}</div>
  `;

  lastGuess.appendChild(div);
}



/* =========================
   DOCUMENT EVENTS
========================= */

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getPlayerId() {
    return localStorage.getItem("playerId");
}

document.getElementById("backBtn").onclick = () => {
    window.location.href = "index.html";
};

document.getElementById("menuBtn").onclick = () => {
    menu.classList.toggle("hidden");
};

document.getElementById("hintBtn").addEventListener("click", async () => {
   
    if (gameLocked || statusGameCompleted === "true") {
        hint.textContent = "";
        menu.classList.add("hidden");
        return;
    }


    const guessed = guesses.map(g => g.name.toLowerCase());

    const player = leaderboard
        .filter(p => p.rank <= 5)
        .reverse()
        .find(p => !guessed.includes(p.name.toLowerCase()));

    if (!player) {
        hint.textContent = "All Top 5 players have been guessed!";
        return;
    }

    hintedPlayer = player;
    setHintPlayer(player);

    hintClickCount++;
    totalHintClicks++;

    document.getElementById("hintNumber").textContent = totalHintClicks;

    setHintStage(hintClickCount);

    await saveGame();

    const initials = player.name
        .split(" ")
        .map(n => n[0])
        .join(".") + ".";

    const isTeamGame = !!GAME.teamId;
    const isAllStarGame = GAME.gameType === "A";

    const league = player.league || "";
    const team = player.team || "";
    const position = player.position || "";

    if (isTeamGame) {
        // TEAM GAME
        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${position}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${position} | ${initials}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 10);

            hintClickCount = 0;
        }
    } 
    else if (isAllStarGame) {
        // ALL-STAR GAME
        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${league}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${league} | ${position}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = `Hint: ${league} | ${position} | ${initials}`;
        } 
        else if (hintClickCount === 4) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 10);

            hintClickCount = 0;
        }
    } 
    else {
        // NORMAL GAME

        const division = await getTeamDivision(team);
        const isPitchingGame = GAME.group === "pitching";

        if (hintClickCount === 1) {
            hint.textContent = `Hint: ${league}`;
        } 
        else if (hintClickCount === 2) {
            hint.textContent = `Hint: ${league} | ${division}`;
        } 
        else if (hintClickCount === 3) {
            hint.textContent = `Hint: ${league} | ${division} | ${team}`;
        } 

        // REMOVE POSITION FOR PITCHING
        else if (isPitchingGame && hintClickCount === 4) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${initials}`;
        }

        // HITTING POSITION HINT
        else if (!isPitchingGame && hintClickCount === 4) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${position}`;
        }

        // HITTING INITIALS
        else if (!isPitchingGame && hintClickCount === 5) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${position} | ${initials}`;
        }

        // AUTO GUESS
        else if (
            (isPitchingGame && hintClickCount === 5) ||
            (!isPitchingGame && hintClickCount === 6)
        ) {
            hint.textContent = "";

            input.value = player.name;

            setTimeout(() => {
                guessPlayer();
            }, 10);

            hintClickCount = 0;
        }
    }

    menu.classList.add("hidden");
});


document.addEventListener("click", (e) => {
  if (!e.target.closest(".container")) {
    dropdown.style.display = "none";
  }
  const menu = document.getElementById("menu");
  const wrapper = document.querySelector(".menu-wrapper");

  if (!wrapper.contains(e.target)) {
    menu.classList.add("hidden");
  }
  
});

document.getElementById("leaderboardPopup").addEventListener("click", (e) => {
    if (e.target.id === "leaderboardPopup") {
        closeLeaderboard();
    }
});



/* =========================
   INPUT EVENTS
========================= */

input.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchPlayers(input.value)
    .then(results=>{
        matches = results;
        activeIndex=-1;
        renderDropdown();
    });
  }, 150);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    activeIndex = Math.min(activeIndex + 1, matches.length - 1);
    renderDropdown();
  }

  if (e.key === "ArrowUp") {
    activeIndex = Math.max(activeIndex - 1, 0);
    renderDropdown();
  }

  if (e.key === "Enter") {
    e.preventDefault();

    if (activeIndex >= 0 && matches[activeIndex]) {
      input.value = matches[activeIndex].name;
      guessPlayer();
      return;
    }

    guessPlayer();
  }
});



function openLeaderboard() {
  // close win popup
  //document.getElementById("winPopup").style.display = "none";

  const popup = document.getElementById("leaderboardPopup");
  const list = document.getElementById("leaderboardList");

  // sort leaderboard (safely)
  const sorted = [...leaderboard].sort((a, b) => {
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  list.innerHTML = "";

  document.getElementById("leaderboardTitle").textContent =
  gameInfoObj.title;

  sorted.forEach(p => {
    list.appendChild(createLeaderboardRow(p));
  });

  popup.classList.remove("hidden");
  popup.style.display = "flex";
}

function closeLeaderboard() {
  const popup = document.getElementById("leaderboardPopup");
  popup.classList.add("hidden");
  popup.style.display = "none";
}

function createLeaderboardRow(p) {
  const div = document.createElement("div");

  div.className = `row ${getColorClass(p.rank)}`;

  div.innerHTML = `
    <div class="rank">${p.rank ?? "-"}</div>
    <div class="name">${p.name}</div>
    <div class="value">${p.value}</div>
  `;

  return div;
}

document.getElementById("giveUpBtn").addEventListener("click", () => {
  openGiveUpPopup();
});





function applyLockUI() {
  if (gameLocked) {
    input.disabled = true;
    input.placeholder = "Game finished";

    const hintBtn = document.getElementById("hintBtn");
    if (hintBtn) {
      hintBtn.disabled = true;
    }

    const giveUpBtn = document.getElementById("giveUpBtn");
    if (giveUpBtn) {
      giveUpBtn.disabled = true;
    }
  }
}
function getEasternDateString() {
  const eastern = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  const year = eastern.getFullYear();
  const month = String(eastern.getMonth() + 1).padStart(2, "0");
  const day = String(eastern.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getGuessStats() {
    return guesses.reduce((stats, g) => {
        if (typeof g.rank !== "number") {
            stats.gray++;
        } else if (g.rank <= 5) {
            stats.green++;
        } else if (g.rank <= 10) {
            stats.yellow++;
        } else if (g.rank <= 25) {
            stats.red++;
        } else {
            stats.gray++;
        }

        return stats;
    }, {
        green: 0,
        yellow: 0,
        red: 0,
        gray: 0
    });
}

function setHintStage(value) {
  hintClickCount = value;
}


function setHintPlayer(player) {
  hintedPlayer = player;
}


function clearHintData() {

  hintedPlayer = null;
  hintClickCount = 0;

  hint.textContent = "";

}

async function loadHintStage() {

    const stage = hintClickCount;

    if (!stage) return;

    if (!hintedPlayer) return;

    const player = hintedPlayer;

    const initials = player.name
        .split(" ")
        .map(n => n[0])
        .join(".") + ".";

    const league = player.league || "";
    const team = player.team || "";
    const position = player.position || "";

    const isTeamGame = !!GAME.teamId;
    const isAllStarGame = GAME.gameType === "A";

    const division = await getTeamDivision(team);

    if (isTeamGame) {

        // TEAM GAME
        if (stage === 1) {
            hint.textContent = `Hint: ${position}`;
        }

        else if (stage === 2) {
            hint.textContent =
                `Hint: ${position} | ${initials}`;
        }

    }

    else if (isAllStarGame) {

        // ALL STAR
        if (stage === 1) {
            hint.textContent = `Hint: ${league}`;
        }

        else if (stage === 2) {
            hint.textContent =
                `Hint: ${league} | ${position}`;
        }

        else if (stage === 3) {
            hint.textContent =
                `Hint: ${league} | ${position} | ${initials}`;
        }

    }

    else {

        // NORMAL GAME
        const isPitchingGame = GAME.group === "pitching";

        if (stage === 1) {
            hint.textContent =
                `Hint: ${league}`;
        }

        else if (stage === 2) {
            hint.textContent =
                `Hint: ${league} | ${division}`;
        }

        else if (stage === 3) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team}`;
        }

        else if (isPitchingGame && stage === 4) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${initials}`;
        }

        else if (!isPitchingGame && stage === 4) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${position}`;
        }

        else if (!isPitchingGame && stage === 5) {
            hint.textContent =
                `Hint: ${league} | ${division} | ${team} | ${position} | ${initials}`;
        }
    }
}


async function getTeamDivision(teamName) {

    if (!teamName) return "";

    if (divisionCache[teamName]) {
        return divisionCache[teamName];
    }

    try {

        const res = await fetch(
            `https://statsapi.mlb.com/api/v1/teams?sportId=1`
        );

        const data = await res.json();

        const team = data.teams.find(
            t => t.name.toLowerCase() === teamName.toLowerCase()
        );

        if (!team) return "";


        let division =
            team.division?.name || "";


        // Convert:
        // "American League East" -> "East"
        // "National League West" -> "West"
        division = division
            .replace("American League ", "")
            .replace("National League ", "");


        divisionCache[teamName] = division;


        return division;


    } catch(err) {

        console.error(
            "Division lookup failed:",
            err
        );

        return "";
    }
}


/* =========================
   FUTURE GAME PRELOADER
========================= */

async function preloadFutureGames() {

    console.log("Starting future game preload...");

    const datesToCheck = [];

    for (let i = 1; i <= 3; i++) {

        const future = new Date();

        future.setDate(
            future.getDate() + i
        );


        const dateString =
            future.toLocaleDateString(
                "en-CA",
                {
                    timeZone: "America/New_York"
                }
            );


        datesToCheck.push(dateString);
    }



    for (const dateString of datesToCheck) {

        try {

            console.log(
                "Checking future date:",
                dateString
            );


            // Check if game already exists
            const { data: existingGame, error } = await db
                .from("games")
                .select("date, leaderboard")
                .eq("date", dateString)
                .maybeSingle();



            if(error){
                console.error(
                    "Future game check failed:",
                    error
                );

                continue;
            }



            // Game already exists
            if(existingGame){

                console.log(
                    "Already exists:",
                    dateString
                );


                // Optional:
                // If game exists but leaderboard does not,
                // fill it in

                if(
                    !existingGame.leaderboard ||
                    existingGame.leaderboard.length === 0
                ){

                    console.log(
                        "Leaderboard missing. Creating..."
                    );


                    const { data: gameData } = await db
                        .from("games")
                        .select("gameinfo")
                        .eq("date", dateString)
                        .single();



                    const gameInfo =
                        typeof gameData.gameinfo === "string"
                        ? JSON.parse(gameData.gameinfo)
                        : gameData.gameinfo;



                    const leaderboard =
                        await fetchLeaderboard(gameInfo);



                    await db
                        .from("games")
                        .update({
                            leaderboard
                        })
                        .eq("date", dateString);


                    console.log(
                        "Leaderboard added:",
                        dateString
                    );
                }


                continue;
            }




            // CREATE NEW GAME

            console.log(
                "Creating future game:",
                dateString
            );



            const generatedGame =
                await generateUniqueGame(dateString);



            console.log(
                "Fetching leaderboard:",
                dateString
            );


            const leaderboard =
                await fetchLeaderboard(generatedGame);



            const { error: insertError } = await db
                .from("games")
                .insert({

                    date: dateString,

                    gameinfo: generatedGame,

                    leaderboard: leaderboard

                });



            if(insertError){

                console.error(
                    "Future game save failed:",
                    insertError
                );

            }
            else {

                console.log(
                    "Future game created:",
                    dateString
                );

            }


        }
        catch(err){

            console.error(
                "Future preload error:",
                dateString,
                err
            );

        }

    }


    console.log(
        "Future preload finished."
    );

}


/* =========================
   INIT
========================= */
(async function boot() {
  try {
    console.log("Boot started");

    console.log("Checking today's game...");

    const { data: todaysGame, error } = await db
      .from("games")
      .select("gameinfo")
      .eq("date", selectedDate)
      .maybeSingle();

    if (error) throw error;

    if (todaysGame) {
      console.log("Loaded existing game.");

      gameInfoObj =
        typeof todaysGame.gameinfo === "string"
          ? JSON.parse(todaysGame.gameinfo)
          : todaysGame.gameinfo;

    } else {
      console.log("Generating new game...");

      const generatedGame = await generateUniqueGame(selectedDate);

      const { error: insertError } = await db
        .from("games")
        .upsert(
          {
            date: selectedDate,
            gameinfo: generatedGame
          },
          {
            onConflict: "date"
          }
        );

      if (insertError) throw insertError;

      gameInfoObj = generatedGame;
    }

    GAME = gameInfoObj;

    preloadFutureGames();


    await loadPlayerGame();
    await loadLeaderboard();


    checkUnfinishedRating();

    loadHintStage();
    updateHowTo();

    // Restore completed game popup after reload
    if (statusGameCompleted === "true") {
      gameLocked = true;
      applyLockUI();

      if (statusGameWin === "true") {
        gameOutcome = "win";
        openPopup();
      } else {
        gameOutcome = "giveup";
        openGiveUpPopup();
      }
    }


    resetInactivityTimer();

    startAutoSave();

    console.log("Boot finished");

  } catch (err) {
    console.error("BOOT FAILED:", err);

    gameTitle.textContent = "Failed to load today's game.";
    message.textContent = err.message;
  }
})();

let autoSaveInterval;

function startAutoSave() {
  autoSaveInterval = setInterval(() => {
    if (guesses.length > 0) {
      saveGame();
    }
  }, 10000);
}

function stopAutoSave() {
  clearInterval(autoSaveInterval);
}


function renderStatHeader() {

  const abbreviations = {
    // Hitting
    homeRuns: "HR",
    triples: "3B",
    doubles: "2B",
    hits: "H",
    baseOnBalls: "BB",
    rbi: "RBI",
    stolenBases: "SB",
    gamesPlayed: "G",
    extraBaseHits: "XBH",
    atBats: "AB",
    runs: "R",
    plateAppearances: "PA",
    sacFlies: "SF",
    hitByPitch: "HBP",
    strikeOuts: "SO",

    // Pitching
    wins: "W",
    saves: "SV",
    inningsPitched: "IP",
    era: "ERA",
    whip: "WHIP",
    gamesStarted: "GS",
    completeGames: "CG",
    shutouts: "SHO",
    qualityStarts: "QS"
  };

  // Hide header until at least one guess exists
  if (guesses.length === 0) {
    statHeader.innerHTML = "";
    statHeader.style.display = "none";
    return;
  }

  statHeader.style.display = "grid";

  const abbr = abbreviations[gameInfoObj.sortStat] || "";

  statHeader.innerHTML = `
    <div></div>
    <div></div>
    <div class="stat-label">${abbr}</div>
  `;
}

function updateHowTo() {

  const howTo = document.getElementById("howTo");

  if (guesses.length === 0) {
    howTo.style.display = "block";
  } else {
    howTo.style.display = "none";
  }

}

async function removeDuplicateGuesses() {
  const before = guesses.length;

  guesses = [
    ...new Map(
      guesses.map(g => [g.name.toLowerCase(), g])
    ).values()
  ];

  const after = guesses.length;

  if (before !== after) {
    console.log(`Removed ${before - after} duplicate guesses`);

    document.getElementById("guessNumber").textContent = guesses.length;

    await saveGame();
  }
}

function resetInactivityTimer() {

  if (!gameInfoObj) return;
  
  clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(() => {

    window.location.href = "index.html";

  }, TIMEOUT_MS);
}

[
  "click",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart"
].forEach(event => {
  document.addEventListener(event, resetInactivityTimer);
});


function getDailyGameRules(dateString) {
  const date = new Date(dateString + "T00:00:00");

  switch (date.getDay()) {

    case 0: // Sunday - Atlanta Braves Day
      return {
        type: "team",
        teamOnly: true,
        forcedTeam: 144
      };

    case 1: // Monday
      return {
        type: "decade",
        teamOnly: true
      };

    case 2: // Tuesday
      return {
        type: "season",
        teamOnly: false
      };

    case 3: // Wednesday
      return {
        type: "career",
        teamOnly: false
      };

    case 4: // Thursday
      return {
        type: "decade",
        teamOnly: false
      };

    case 5: // Friday
      return {
        type: "career",
        teamOnly: true
      };

    default: // Saturday
      return {
        type: "random",
        teamOnly: null
      };
  }
}


async function checkUnfinishedRating(){

    if(
        statusGameCompleted === "false" &&
        guesses.length > 0 &&
        (!playerGame?.ratingChange)
    ){

        console.log("Applying unfinished game penalty");

        await applyRatingChange(
            selectedDate,
            -25
        );

    }

}

async function applyRatingChange(date, amount){

    const playerId = getPlayerId();

    if (!playerId) return;


    const {data:user, error} = await db
      .from("playerData")
      .select("rating")
      .eq("playerId", playerId)
      .single();


    if(error){
        console.error(error);
        return;
    }


    const currentRating =
        Number(user.rating || 1000);


    const newRating =
        currentRating + amount;


    await db
      .from("playerData")
      .update({
          rating:newRating
      })
      .eq("playerId",playerId);



    await db
      .from("playerGames")
      .update({
          ratingChange:amount
      })
      .eq("playerId",playerId)
      .eq("date",date);



    // update memory
    if(playerGame){
        playerGame.ratingChange = amount;
    }


    console.log(
        `Rating ${currentRating} → ${newRating} (${amount})`
    );

}

function calculateRatingChange(game) {

    let baseScore;


    // RESULT
    if (game.win === "true") {
        baseScore = 100;
    } 
    else {
        baseScore = -50;
    }


    // GUESS MODIFIER


    // GUESS MODIFIER
    // GUESS MODIFIER
   /* const guesses = Number(game.guessesNumber);

    let guessModifier;

    if (guesses <= 5) {
        guessModifier = 1.50;
    } else {
        guessModifier = 1.50 - ((guesses - 5) * 0.01);
    }

    guessModifier = Math.max(
        0.20,
        guessModifier
    );*/

    const guesses = Number(game.guessesNumber);

    let guessModifier =
        1.5 - (Math.log10(guesses / 5) * 0.5);

    guessModifier = Math.max(
        0.70,
        guessModifier
    );




/*
    const guesses = Number(game.guessesNumber);

    let guessModifier = 1.50;

    if (guesses > 5) {

        guessModifier =
            1.50 - ((guesses - 5) * 0.005);

    }

    guessModifier = Math.max(
        0.70,
        Math.min(1.50, guessModifier)
    );
*/
    /*
    const guesses = Number(game.guessesNumber);

    let guessModifier = 1;

    if (guesses <= 5)
        guessModifier = 1.50;
    else if (guesses <= 10)
        guessModifier = 1.30;
    else if (guesses <= 20)
        guessModifier = 1.15;
    else if (guesses <= 50)
        guessModifier = 1.00;
    else if (guesses <= 100)
        guessModifier = 0.90;
    else if (guesses <= 200)
        guessModifier = 0.80;
    else
        guessModifier = 0.70;
    */
   
    // HINT MODIFIER
    const hints = Number(game.hintClicks);

    //let hintModifier = 1;

    //let hintModifier = Math.max(-1, 2 - (hints * 0.15));
    /*let hintModifier = Math.max(
        0.25,
        1.5 - (hints * 0.1)
    ); */
/*
        let hintModifier = Math.max(
        0.25,
        1.25 - (hints * 0.08)
    );
*/

    let hintModifier =
        1.25 - (Math.log10(hints + 1) * 0.5);

    hintModifier = Math.max(
        0.50,
        hintModifier
    );

    /*let hintModifier = Math.max(
        0.0,
        2 - (hints * 0.25)
    );*/
    
    /*
    if (hints === 0)
        hintModifier = 2.00;
    else if (hints === 1)
      hintModifier = 1.60;
    else if (hints === 2)
      hintModifier = 1.30;
    else if (hints === 3)
      hintModifier = 1.00;
    else if (hints === 4)
      hintModifier = 0.80;
    else if (hints >= 5)
      hintModifier = 0.50;
    */


    // COMPLETION MODIFIER
    let completionModifier = 0.95;

    if(
        game.win === "true" &&
        game.completedSameDay === "true"
    ){
        completionModifier = 1;
    }


    return Math.round(
        baseScore *
        guessModifier *
        hintModifier *
        completionModifier
    );

}

async function processCompletedRating(){

    let finalChange = 0;

    const playerId = getPlayerId();

    // Get the actual saved rating change
    const { data: gameData, error } = await db
        .from("playerGames")
        .select("ratingChange")
        .eq("playerId", playerId)
        .eq("date", selectedDate)
        .single();


    if(error){
        console.error(error);
    }


    // Restore unfinished penalty
    if(Number(gameData?.ratingChange) === -25){

        console.log("Restoring unfinished penalty +25");

        finalChange += 25;
    }


    const gameChange = calculateRatingChange({
        win: statusGameWin,
        guessesNumber: guesses.length,
        hintClicks: totalHintClicks,
        completedSameDay:
            selectedDate === getEasternDateString()
            ? "true"
            : "false"
    });


    console.log("Game rating:", gameChange);

    const { data: playerData } = await db
        .from("playerData")
        .select("rating")
        .eq("playerId", playerId)
        .single();

    const currentRating = Number(playerData?.rating || 1000);

    const ratingMultiplier = getRatingMultiplier(currentRating);

    finalChange += Math.round(
        gameChange * ratingMultiplier
    );

    console.log("Final rating change:", finalChange);


    await applyRatingChange(
        selectedDate,
        finalChange
    );

}

async function rebuildAllPlayerGameRatings() {

    const { data: players, error: playerError } = await db
        .from("playerData")
        .select("playerId");


    if (playerError) {
        console.error(playerError);
        return;
    }


    for (const player of players) {

        const playerId = player.playerId;


        const { data: games, error: gameError } = await db
            .from("playerGames")
            .select("*")
            .eq("playerId", playerId)
            .order("date", { ascending: true });


        if (gameError) {
            console.error(gameError);
            continue;
        }


        // Starting rating
        let rating = 1000;



        for (const game of games) {

            let change = null;


            const completed =
                String(game.completed) === "true";


            const win =
                String(game.win) === "true";


            const completedSameDay =
                String(game.completedSameDay) === "true";


            const guesses =
                Number(game.guessesNumber || 0);


            const hints =
                Number(game.hintClicks || 0);



            /*
                COMPLETED GAME
            */

            if (completed) {


                const baseChange = calculateRatingChange({

                    win: String(win),

                    guessesNumber: guesses,

                    hintClicks: hints,

                    completedSameDay:
                        String(completedSameDay)

                });



                const multiplier =
                    getRatingMultiplier(rating);



                change = Math.round(
                    baseChange * multiplier
                );


            }



            /*
                STARTED BUT NEVER FINISHED
            */

            else if (guesses > 0) {

                change = -25;

            }



            /*
                APPLY CHANGE
            */

            if (change !== null) {


                const ratingBefore = rating;


                rating += change;



                await db
                    .from("playerGames")
                    .update({
                        ratingChange: change
                    })
                    .eq("playerId", playerId)
                    .eq("date", game.date);



                console.log({
                    playerId,
                    date: game.date,
                    before: ratingBefore,
                    change,
                    after: rating,
                    win,
                    completed,
                    guesses,
                    hints
                });

            }

        }



        /*
            SAVE FINAL PLAYER RATING
        */

        await db
            .from("playerData")
            .update({
                rating: rating
            })
            .eq("playerId", playerId);



        console.log(
            "FINAL RATING:",
            playerId,
            rating
        );

    }


    console.log(
        "ALL RATINGS REBUILT"
    );

}



async function getCachedLeaderboard(gameInfoObj){

    // CHECK GAMES TABLE FIRST
    const { data: gameRow, error } = await db
        .from("games")
        .select("leaderboard")
        .eq("date", selectedDate)
        .maybeSingle();


    if(error){
        console.error(
            "Game leaderboard lookup error:",
            error
        );
    }


    // RETURN CACHED LEADERBOARD
    if(
        gameRow &&
        gameRow.leaderboard &&
        gameRow.leaderboard.length
    ){

        console.log(
            "Loaded leaderboard from games cache"
        );

        return gameRow.leaderboard;

    }



    // FETCH MLB API
    console.log(
        "Fetching MLB API leaderboard"
    );


    const results = await fetchLeaderboard(gameInfoObj);


    console.log(
        "Leaderboard results:",
        results
    );



    // SAVE LEADERBOARD INTO GAMES TABLE
    const { error: saveError } = await db
        .from("games")
        .upsert(
            {
                date: selectedDate,
                gameinfo: JSON.stringify(gameInfoObj),
                leaderboard: results
            },
            {
                onConflict: "date"
            }
        );


    if(saveError){

        console.error(
            "Leaderboard save failed:",
            saveError
        );

    } else {

        console.log(
            "Leaderboard saved to games table"
        );

    }


    return results;

}

/*
function getRatingMultiplier(rating){

    return Math.max(
        0.5,
        1.25 - ((rating - 1000) / 5000)
    );

}*/

function getRatingMultiplier(rating){

    const difference = rating - 1000;

    return Math.max(
        0.05,
        1.25 - (Math.sqrt(Math.max(0, difference)) / 100)
    );

    

}