window.playerDatabase = async function () {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) {
    console.log("No player ID found");
    return;
  }

  const { data, error } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", playerId);

  if (error) {
    console.log(error);
    return;
  }

  console.log(data);
};


async function createPlayer(
  playerId,
  guest = true,
  passwordHash = null
) {

  const { data: existingPlayer, error: checkError } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", playerId)
    .maybeSingle();


  if (checkError) {
    console.log(checkError);
    return;
  }


  if (existingPlayer) {
    return existingPlayer;
  }


  const { data, error } = await db
    .from("playerData")
    .insert([
      {
        playerId: playerId,
        gamesPlayed: 0,
        wins: 0,
        streak: 0,
        rating: 1000,
        guest: guest,
        password_hash: passwordHash
      }
    ])
    .select()
    .single();


  if (error) {
    console.log(error);
    return;
  }


  return data;
}


const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", async () => {

  const playerId = localStorage.getItem("playerId");


  const { data } = await db
    .from("playerData")
    .select("playerId")
    .eq("playerId", playerId)
    .maybeSingle();


  if (!data) {

    await createPlayer(
      playerId,
      true
    );

  }


  const today = getEasternDateString();

  window.location.href =
    `game.html?date=${today}`;

});

async function loadDayButtons() {
  const container = document.getElementById("dayButtons");
  container.innerHTML = "";

  const playerId = localStorage.getItem("playerId");
  if (!playerId) return;

  // Get recent dates
  const dates = [];

  const today = new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone:"America/New_York"
      }
    )
  );

  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dates.push(formatLocalDate(date));
  }


  // Get all games at once
  const { data: games, error } = await db
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .in("date", dates);


  if (error) {
    console.error(error);
    return;
  }


  // Create buttons
  dates.forEach((iso) => {

    const date = new Date(iso + "T00:00:00");

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const btn = document.createElement("button");

    btn.classList.add("day-btn");
    btn.textContent = `${month}/${day}`;
    btn.dataset.date = iso;


    btn.addEventListener("click", () => {
      window.location.href = `game.html?date=${iso}`;
    });


    const game = games.find(g => g.date === iso);

    if (!game) {
      // No game played
      btn.classList.add("notStarted");
    }
    else if (game.win === "true") {
      // Won
      btn.classList.add("completed");
    }
    else if (game.completed === "true") {
      // Gave up / failed
      btn.classList.add("failed");
    }
    else {
      // Has guesses but not finished
      btn.classList.add("incomplete");
    }


    container.appendChild(btn);

  });
}

//document.addEventListener("DOMContentLoaded", loadDayButtons);

function openPopup() {

  const popup = document.getElementById("playerIdPopup");
  const input = document.getElementById("username");
  const password = document.getElementById("password");

  const playerId = localStorage.getItem("playerId");


  if (playerId) {
    input.value = playerId;
  } 
  else {
    input.value = "";
  }

  password.value = "";

  popup.style.display = "flex";

}

function closePopup() {
  const popup = document.getElementById("playerIdPopup");
  popup.style.display = "none";
}


const popup = document.getElementById("playerIdPopup");

popup.addEventListener("click", (e) => {
  if (e.target === popup) {
    closePopup();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePopup();
  }
});

async function submitPlayerId() {
  const username = document.getElementById("username").value.trim();

  if (!username) return;


  const { data: existingPlayer } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", username)
    .maybeSingle();


  if (existingPlayer) {

    document.getElementById("loginConfirmText").textContent =
      `The player ID "${username}" already exists. Do you want to login to this account?`;

    document.getElementById("loginConfirmPopup").style.display = "flex";


    document.getElementById("loginYesBtn").onclick = () => {
      localStorage.setItem("playerId", username);

      updateMenuPlayerId();

      document.getElementById("loginConfirmPopup").style.display = "none";
      document.getElementById("playerIdPopup").style.display = "none";

      loadDayButtons();
      loadPlayerStreak();

loadGameHub();
      
    };


    document.getElementById("loginNoBtn").onclick = () => {
      document.getElementById("loginConfirmPopup").style.display = "none";
    };


    return;
  }


  // New player
  await createPlayer(username);

  localStorage.setItem("playerId", username);

  updateMenuPlayerId();

  document.getElementById("playerIdPopup").style.display = "none";

  loadDayButtons();
}


async function initializePlayer(){

  let playerId = localStorage.getItem("playerId");


  if (!playerId){

    playerId = await generateGuestName();

    localStorage.setItem(
      "playerId",
      playerId
    );


    localStorage.setItem(
      "guest",
      "true"
    );


    console.log(
      "Created local guest:",
      playerId
    );

  }


  updateMenuPlayerId();
  loadPlayerStreak();
  loadDayButtons();

  await updateLoginButton();

}

async function startApp(){

    await initializePlayer();

    await playerDatabase();

    await updateLoginButton();

}

startApp();

console.log(
  "Current player ID:",
  localStorage.getItem("playerId")
);


function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function loadPlayerStreak() {
  const playerId = localStorage.getItem("playerId");

  if (!playerId) {
    document.getElementById("streakDisplay").textContent =
      "Current Streak: Login to view 🔥";
    return;
  }

  const { data, error } = await db
    .from("playerData")
    .select("streak")
    .eq("playerId", playerId)
    .maybeSingle();


  if(!data){
    document.getElementById("streakDisplay").textContent = "";
    return;
  }

  if (error) {
    console.error("Error loading streak:", error);
    return;
  }

  const streakDisplay = document.getElementById("streakDisplay");

  streakDisplay.textContent = Number(data.streak) > 0
    ? `Current Streak: ${data.streak} 🔥`
    : "";
}


async function loadLeaderboard() {

  const { data, error } = await db
    .from("playerData")
    .select("playerId, wins, rating")
    .neq("playerId", "andrew28r")
    .order("rating", { ascending: false })
    .limit(5);


  if (error) {
    console.error("Leaderboard error:", error);

    document.getElementById("leaderboardList").textContent =
      "Unable to load leaderboard";

    return;
  }


  const leaderboard = document.getElementById("leaderboardList");

  leaderboard.innerHTML = "";


  data.forEach((player, index) => {

    const row = document.createElement("div");

    row.className = "leaderboard-row";


    row.innerHTML = `
      <span>${index + 1}.</span>
      <span>${player.playerId}</span>
      <span>${player.rating ?? 1000}</span>
      <span>${player.wins}</span>
    `;


    leaderboard.appendChild(row);

  });

}


const calendarButton = document.getElementById("calendarButton");
const calendarPopup = document.getElementById("calendarPopup");
const closeCalendar = document.getElementById("closeCalendar");


closeCalendar.addEventListener("click", () => {
    calendarPopup.style.display = "none";
});
calendarPopup.addEventListener("click", (e) => {

    // Only close if clicking the dark overlay, not the calendar box
    if (e.target === calendarPopup) {
        calendarPopup.style.display = "none";
    }

});

calendarButton.addEventListener("click", async () => {
    calendarPopup.style.display = "flex";
    setCurrentCalendarMonth();
    await loadCalendar();
});

let calendarYear;
let calendarMonth;

function setCurrentCalendarMonth() {

    const today = new Date(
        new Date().toLocaleString("en-US", {
            timeZone:"America/New_York"
        })
    );

    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();

}
const minCalendarYear = 2026;
const minCalendarMonth = 6; // July

async function loadCalendar() {

    const grid = document.getElementById("calendarGrid");

    grid.innerHTML = "";


    const year = calendarYear;
    const month = calendarMonth;


    document.getElementById("calendarMonth").textContent =
        new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
        });


    // Day headers
    const headers = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];


    headers.forEach(day => {

        const header = document.createElement("div");

        header.className = "calendar-header-day";

        header.textContent = day;

        grid.appendChild(header);

    });



    // Empty spaces before first day
    const firstDay = new Date(year, month, 1).getDay();


    for (let i = 0; i < firstDay; i++) {

        grid.appendChild(document.createElement("div"));

    }



    const playerId = localStorage.getItem("playerId");


    const { data: games, error } = await db
        .from("playerGames")
        .select("*")
        .eq("playerId", playerId);


    if (error) {

        console.error(error);

        return;

    }



    const today = new Date(
        new Date().toLocaleString("en-US", {
            timeZone:"America/New_York"
        })
    );



    // Days in month
    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();



    for (let day = 1; day <= daysInMonth; day++) {


        const square = document.createElement("div");

        square.className = "calendarDay";

        square.textContent = day;



        const monthNumber = String(month + 1).padStart(2, "0");

        const dayNumber = String(day).padStart(2, "0");


        const dateString =
            `${year}-${monthNumber}-${dayNumber}`;


        square.dataset.date = dateString;



        const calendarDate =
            new Date(dateString + "T00:00:00");



        const game =
            games.find(g => g.date === dateString);



        // Future game
        if (calendarDate > today) {

            square.classList.add("future");

        }


        // Won
        else if (game && game.win === "true") {

            square.classList.add("completed");

        }


        // Failed
        else if (game && game.completed === "true") {

            square.classList.add("failed");

        }


        // Started but unfinished
        else if (game) {

            square.classList.add("incomplete");

        }


        // Available past game
        else {

            square.classList.add("notStarted");

        }



        // Open game when clicked
        square.addEventListener("click", () => {


            if (calendarDate > today) {

                return;

            }


            window.location.href =
                `game.html?date=${dateString}`;


        });



        grid.appendChild(square);

    }

}





const prevMonth =
    document.getElementById("prevMonth");


const nextMonth =
    document.getElementById("nextMonth");



prevMonth.addEventListener("click", async () => {

    calendarMonth--;

    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }


    // Stop going before July 2026
    if (
        calendarYear < minCalendarYear ||
        (calendarYear === minCalendarYear && calendarMonth < minCalendarMonth)
    ) {

        calendarYear = minCalendarYear;
        calendarMonth = minCalendarMonth;

        return;
    }


    await loadCalendar();

});





nextMonth.addEventListener("click", async () => {


    calendarMonth++;


    if (calendarMonth > 11) {

        calendarMonth = 0;

        calendarYear++;

    }


    await loadCalendar();


});


window.addEventListener("load", async () => {
  const playerId = localStorage.getItem("playerId");

  if (playerId) {
    await updateGamesPlayed(playerId);
  }

  loadPlayerStreak();
  loadLeaderboard();
});

const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    menu.classList.add("hidden");
});

menu.addEventListener("click", (e) => {
    e.stopPropagation();
});

updateMenuPlayerId();

document.getElementById("changeUserBtn").addEventListener("click", () => {

  menu.classList.add("hidden");

  const popup = document.getElementById("changeUsernamePopup");

  document.getElementById("newUsername").value =
    localStorage.getItem("playerId");

  document.getElementById("usernameChangeMessage").textContent = "";

  popup.style.display = "flex";

});

document.getElementById("cancelUsernameBtn")
.addEventListener("click", () => {

  document.getElementById("changeUsernamePopup").style.display = "none";

});


const saveUsernameBtn = document.getElementById("saveUsernameBtn");

console.log("Save button:", saveUsernameBtn);

saveUsernameBtn.addEventListener("click", async () => {

  console.log("Save clicked");

  const newUsername = document
    .getElementById("newUsername")
    .value
    .trim();

  console.log("New username:", newUsername);

  if (!newUsername) {
    console.log("No username entered");
    return;
  }

  await changeUsername(newUsername);

});

function updateMenuPlayerId() {
    document.getElementById("menuPlayerId").textContent =
        localStorage.getItem("playerId") || "Not Logged In";
}



if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
    .then(() => {
        console.log("Service Worker registered");
    })
    .catch(error => {
        console.log("Service Worker failed:", error);
    });
}

async function generateGuestName(){

  const words = [
    "Diamond",
    "Slugger",
    "Baseball",
    "HomeRun",
    "Fastball",
    "Curveball"
  ];


  while (true) {

    const word =
      words[Math.floor(Math.random()*words.length)];


    const number =
      Math.floor(Math.random()*9000)+1000;


    const guestName = word + number;


    const { data, error } = await db
      .from("playerData")
      .select("playerId")
      .eq("playerId", guestName)
      .maybeSingle();


    if (error) {
      console.error(error);
      continue;
    }


    // Name is available
    if (!data) {
      return guestName;
    }

  }

}


async function updateLoginButton(){

  const loginMenuBtn = document.getElementById("loginMenuBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const changeUserBtn = document.getElementById("changeUserBtn");

  const playerId = localStorage.getItem("playerId");


  if(!playerId){

    loginMenuBtn.style.display = "block";
    logoutBtn.style.display = "none";
    changeUserBtn.style.display = "none";

    return;
  }


  const { data, error } = await db
    .from("playerData")
    .select("guest")
    .eq("playerId", playerId)
    .maybeSingle();


  if(error){
    console.log(error);
    return;
  }


  // Guest player
  if(!data || data.guest === true){

    loginMenuBtn.style.display = "block";
    logoutBtn.style.display = "none";
    changeUserBtn.style.display = "none";

    return;

  }


  // Logged in account
  if(data.guest === false){

    loginMenuBtn.style.display = "none";
    logoutBtn.style.display = "block";
    changeUserBtn.style.display = "block";

  }

}

/*
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", () => {
  openPopup();
});*/

const loginMenuBtn = document.getElementById("loginMenuBtn");

loginMenuBtn.addEventListener("click", () => {

  menu.classList.add("hidden");

  openPopup();

});


const usernameInput = document.getElementById("username");
const accountActionBtn = document.getElementById("accountActionBtn");


usernameInput.addEventListener("input", async () => {

  const username = usernameInput.value.trim();

  if (!username) {
    accountActionBtn.textContent = "Create Account";
    return;
  }


  const { data } = await db
    .from("playerData")
    .select("playerId, password_hash")
    .eq("playerId", username)
    .maybeSingle();


  if (data) {

    // Player exists but has no password
    if (!data.password_hash) {

      accountActionBtn.textContent = "Create Account";

    }
    else {

      // Player exists and has password
      accountActionBtn.textContent = "Login";

    }

  } 
  else {

    // New player
    accountActionBtn.textContent = "Create Account";

  }

});


document.getElementById("password").addEventListener("input", () => {
  document.getElementById("accountMessage").textContent = "";
});
usernameInput.addEventListener("input", () => {
  document.getElementById("accountMessage").textContent = "";
});

accountActionBtn.addEventListener("click", async () => {

  const username = usernameInput.value.trim();
  const password = document.getElementById("password").value;

  if(!username || !password){
    document.getElementById("accountMessage").textContent =
      "Enter username and password";
    return;
  }


  const currentPlayer = localStorage.getItem("playerId");


  const { data: currentAccount } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", currentPlayer)
    .maybeSingle();


  const { data: requestedAccount } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", username)
    .maybeSingle();



    // Existing account = login
  // Existing account
  // Existing account
  if(requestedAccount){

      // Normal account
      if(requestedAccount.password_hash){

          await loginAccount(username,password);
          return;

      }


      // Guest account
      if(
          requestedAccount.guest === true &&
          currentPlayer === username
      ){

          const passwordHash = await hashPassword(password);


          await db
            .from("playerData")
            .update({
                password_hash: passwordHash,
                guest:false
            })
            .eq("playerId", username);


          localStorage.setItem(
              "playerId",
              username
          );


          updateMenuPlayerId();
          updateLoginButton();

          loadGameHub();

          return;
      }


      // Someone else trying to take guest name
      document.getElementById("accountMessage").textContent =
        "This player ID already exists.";

      return;
  }


  // Current player is guest -> rename guest
  if(currentAccount && currentAccount.guest === true){

    console.log(
      "Migrating",
      currentPlayer,
      "to",
      username
    );


    const success = await migrateGuestAccount(
      currentPlayer,
      username,
      password
    );

    if(success){
      document.getElementById("playerIdPopup").style.display = "none";
    }
    return;

  }



  // Normal new account
  await createAccount(
    username,
    password
  );

});

async function hashPassword(password){

  const encoder = new TextEncoder();

  const data = encoder.encode(password);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(
    new Uint8Array(hash)
  )
  .map(b => b.toString(16).padStart(2,"0"))
  .join("");

}

async function createAccount(username,password){

  const passwordHash = await hashPassword(password);


  await createPlayer(
    username,
    false,
    passwordHash
  );


  localStorage.setItem(
    "playerId",
    username
  );


  document.getElementById("playerIdPopup").style.display="none";

  updateMenuPlayerId();
  updateLoginButton();

  loadGameHub();

}

async function loginAccount(username,password){

  const passwordHash = await hashPassword(password);


  const { data, error } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", username)
    .eq("password_hash", passwordHash)
    .maybeSingle();


  if(error){
    console.log(error);
    return;
  }


  if(!data){

    document.getElementById("accountMessage").textContent =
      "Wrong or invalid password";

    return;

  }


  localStorage.setItem(
    "playerId",
    username
  );


  document.getElementById("playerIdPopup").style.display="none";


  updateMenuPlayerId();
  updateLoginButton();
  loadPlayerStreak();
  loadDayButtons();

  loadGameHub();

}

async function upgradeGuestAccount(username,password){

  const passwordHash = await hashPassword(password);


  const { data, error } = await db
    .from("playerData")
    .update({
      guest:false,
      password_hash:passwordHash
    })
    .eq("playerId",username)
    .select()
    .single();


  if(error){
    console.log(error);
    return;
  }


  localStorage.setItem(
    "playerId",
    username
  );


  document.getElementById("playerIdPopup").style.display="none";


  updateMenuPlayerId();
  updateLoginButton();
  loadPlayerStreak();
  loadDayButtons();

  loadGameHub();


  console.log("Guest upgraded:", data);

}

async function migrateGuestAccount(
  oldId,
  newId,
  password
){

  const passwordHash = await hashPassword(password);

  const {error: gamesError} = await db
    .from("playerGames")
    .update({
      playerId:newId
    })
    .eq("playerId",oldId);


  if(gamesError){
    console.log(gamesError);
    return false;
  }


  const {error: playerError} = await db
    .from("playerData")
    .update({
      playerId:newId,
      guest:false,
      password_hash:passwordHash
    })
    .eq("playerId",oldId);


  if(playerError){
    console.log(playerError);
    return false;
  }


  localStorage.setItem(
    "playerId",
    newId
  );


  updateMenuPlayerId();
  updateLoginButton();
  loadPlayerStreak();
  loadDayButtons();


  return true;
}


const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {

  localStorage.removeItem("playerId");


  const guestName = await generateGuestName();


  localStorage.setItem(
    "playerId",
    guestName
  );


  console.log("New local guest:", guestName);


  // Refresh page
  window.location.reload();

});

async function changeUsername(newUsername) {

  const oldUsername = localStorage.getItem("playerId");

  if (!oldUsername) {
    return;
  }


  // Check if new username already exists
  const { data: existing } = await db
    .from("playerData")
    .select("playerId")
    .eq("playerId", newUsername)
    .maybeSingle();


  if (existing) {
    document.getElementById("usernameChangeMessage").textContent =
      "Username already taken";
    return;
  }


  // Update playerData playerId
  const { error: playerError } = await db
    .from("playerData")
    .update({
      playerId: newUsername
    })
    .eq("playerId", oldUsername);


  if (playerError) {
    console.log("PlayerData update error:", playerError);
    return;
  }


  // Update playerGames playerId
  const { error: gamesError } = await db
    .from("playerGames")
    .update({
      playerId: newUsername
    })
    .eq("playerId", oldUsername);


  if (gamesError) {
    console.log("PlayerGames update error:", gamesError);
    return;
  }


  // Update browser
  localStorage.setItem(
    "playerId",
    newUsername
  );


  updateMenuPlayerId();
  loadDayButtons();
  loadPlayerStreak();

loadGameHub();


  document.getElementById("changeUsernamePopup").style.display = "none";


  console.log(
    "Username changed:",
    oldUsername,
    "→",
    newUsername
  );

}


const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {

  if (passwordInput.type === "password") {

    // Show password
    passwordInput.type = "text";
    togglePassword.textContent = "◎";

  } else {

    // Hide password
    passwordInput.type = "password";
    togglePassword.textContent = "◉";

  }

});


async function loadGameHub(){

    const today = getEasternDateString();
    const playerId = localStorage.getItem("playerId");

    if(!playerId){
        return;
    }


    const { data: diamondGame, error: diamondError } = await db
        .from("playerGames")
        .select("*")
        .eq("playerId", playerId)
        .eq("date", today)
        .maybeSingle();


    if(diamondError){
        console.log("Diamond error:", diamondError);
    }



    const { data: diamondleGame, error: diamondleError } = await db
        .from("diamondlePlayerGames")
        .select("*")
        .eq("playerId", playerId)
        .eq("date", today)
        .maybeSingle();


    if(diamondleError){
        console.log("Diamondle error:", diamondleError);
    }


/*
    updateHubStatus(
        "diamondStatus",
        diamondGame
    );*/


    updateHubStatus(
        "diamondleStatus",
        diamondleGame
    );

}

function updateHubStatus(elementId, game){

    const element = document.getElementById(elementId);

    if(!element) return;


    element.classList.remove(
        "completed",
        "failed",
        "incomplete",
        "notStarted"
    );


    // Not played
    if(!game){

        element.textContent = "Not Played";
        element.classList.add("notStarted");
        return;

    }


    // Won
    if(game.win === true || game.win === "true"){

        element.textContent = "Won";
        element.classList.add("completed");
        return;

    }


    // Lost / Give up
    if(game.completed === true || game.completed === "true"){

        element.textContent = "Lost";
        element.classList.add("failed");
        return;

    }


    // Started but unfinished
    element.textContent = "Started";
    element.classList.add("incomplete");

}

window.addEventListener("load", async () => {

    const playerId = localStorage.getItem("playerId");

    if(playerId){
        await loadGameHub();
    }

});

/*
document.getElementById("diamondResultsBtn")
.addEventListener("click", () => {

    window.location.href = "indexGuess5.html";

});
*/

document.getElementById("diamondlePlayBtn")
.addEventListener("click", () => {

    window.location.href = "indexDiamondle.html";

});