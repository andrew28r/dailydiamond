const params = new URLSearchParams(window.location.search);

let selectedDate = params.get("date") || getEasternDateString();

console.log("Game date:", selectedDate);


const [year, month, day] = selectedDate.split("-");
document.getElementById("gameDate").textContent =
  `${month}/${day}/${year}`;


let gameInfoObj = null;
let guesses = [];

let gameLocked = false;
let gameOutcome = null; 
// "win" | "giveup"

let matches = [];
let activeIndex = -1;

const input = document.getElementById("search");
const dropdown = document.getElementById("dropdown");
const board = document.getElementById("board");
const message = document.getElementById("message");
const gameTitle = document.getElementById("gameTitle");

document.getElementById("backBtn")
.addEventListener("click", () => {

    window.location.href = "indexDiamondle.html";

});

/*
=========================
DAILY PLAYER GENERATOR
=========================
*/

function getGuessStats(){

    return guesses.reduce((stats,g)=>{

        if(g.positionColor === "green" &&
            g.divisionColor === "green" &&
            g.teamColor === "green" &&
            g.batsColor === "green" &&
            g.throwsColor === "green" &&
            g.debutColor === "green" &&
            g.ageColor === "green" &&
            g.countryColor === "green"){

            stats.green++;

        }
        else {

            let colors = [
                g.positionColor,
                g.divisionColor,
                g.teamColor,
                g.batsColor,
                g.throwsColor,
                g.debutColor,
                g.ageColor,
                g.countryColor
            ];

            stats.green += colors.filter(c=>c==="green").length;
            stats.yellow += colors.filter(c=>c==="yellow").length;
            stats.red += colors.filter(c=>c==="red").length;

        }

        return stats;

    },{
        green:0,
        yellow:0,
        red:0,
        gray:0
    });

}



function openPopup(){

    const popup =
        document.getElementById("winPopup");

    const title =
        document.getElementById("winTitle");

    const scoreStats =
        document.getElementById("scoreStats");


    title.textContent =
        "You Win!";


    const {green,yellow,red,gray} =
        getGuessStats();


    scoreStats.innerHTML = `
        <pre class="share-grid">${getResultGrid()}</pre>
        `;


    popup.style.display="block";

}

function getResultGrid(){

    return [...guesses]
        .reverse()
        .map(g => {

            const colors = [
                g.divisionColor,
                g.teamColor,
                g.positionColor,
                g.batsColor,
                g.throwsColor,
                g.debutColor,
                g.ageColor,
                g.countryColor
            ];

            return colors.map(c => {

                if(c === "green")
                    return "🟩";

                if(c === "yellow")
                    return "🟨";

                return "🟥";

            }).join("");

        })
        .join("\n");

}

async function openGiveUpPopup(){

    const popup =
        document.getElementById("winPopup");

    const title =
        document.getElementById("winTitle");

    const scoreStats =
        document.getElementById("scoreStats");


    gameOutcome="giveup";

    title.textContent =
        "You Gave Up!";


    const {green,yellow,red} =
        getGuessStats();


    scoreStats.innerHTML = `
    <pre class="share-grid">${getResultGrid()}</pre>
    `;

    popup.style.display="block";

}



function closePopup(){

    document.getElementById("winPopup")
    .style.display="none";

}



async function giveUpGame(){

    gameOutcome="giveup";

    gameLocked=true;

    await saveGame();

    applyLockUI();

    openGiveUpPopup();

}



function applyLockUI(){

    if(!gameLocked)
        return;


    input.disabled=true;

    input.placeholder =
        "Game finished";

}

function seededRandom(seed){
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}


function getDaySeed(date){

    return Math.floor(
        new Date(date+"T00:00:00").getTime()
        /
        86400000
    );

}


async function generateRandomPlayer(){

    const res = await fetch(
        "https://statsapi.mlb.com/api/v1/sports/1/players"
    );

    const data = await res.json();

    const players =
        data.people.filter(p =>
            p.id &&
            p.fullName
        );


    const index =
        Math.floor(
            Math.random() * players.length
        );


    return players[index];

}




/*
=========================
LOAD / CREATE GAME
=========================
*/


async function loadGame(){


    const {data,error} =
        await db
        .from("diamondleGames")
        .select("*")
        .eq("date",selectedDate)
        .maybeSingle();



    if(error){
        console.error(error);
        return;
    }



    if(data){

        console.log("Existing game loaded");

        gameInfoObj =
            data.playerInfo;

    }
    else{


        console.log("Creating new game");


        const player =
            await generateRandomPlayer();


        const {error:saveError} =
            await db
            .from("diamondleGames")
            .insert({

                date:selectedDate,

                playerId:String(player.id),

                playerName:player.fullName,

                playerInfo:player

            });



        if(saveError){
            console.error(saveError);
            return;
        }


        gameInfoObj = player;

    }


    const answerTeamRes = await fetch(
        `${MLB_API}/teams/${gameInfoObj.currentTeam.id}`
    );

    const answerTeamData = await answerTeamRes.json();

    gameInfoObj.teamInfo = answerTeamData.teams[0];


    console.log(
        "ANSWER:",
        gameInfoObj.fullName
    );

}    



/*
=========================
LOAD PLAYER GAME
=========================
*/


async function loadPlayerGame(){


    const playerId =
        localStorage.getItem("playerId");


    if(!playerId){
        console.error("No player id");
        return;
    }


    const game =
        await diamondlePlayerGames(
            selectedDate
        );




    if(game){

        if(Array.isArray(game.guesses)){

            guesses = game.guesses;

        }
        else if(typeof game.guesses === "string"){

            guesses = JSON.parse(game.guesses);

        }
        else {

            guesses = [];

        }


        if(game.completed){

            gameLocked = true;

            if(game.win){
                gameOutcome = "win";
            }
            else{
                gameOutcome = "lose";
            }

        }

    }


}



/*
=========================
SAVE PLAYER GAME
=========================
*/


async function saveGame(){

    const playerId =
        localStorage.getItem("playerId");


    if(!playerId)
        return;


    const {error} = await db
    .from("diamondlePlayerGames")
    .upsert({

        playerId,

        date:selectedDate,

        guesses: JSON.stringify(guesses),

        guessesNumber: guesses.length,

        win:
            gameOutcome === "win",

        completed:
            gameLocked,

        completedSameDay:
            gameLocked &&
            selectedDate === getEasternDateString()

    },
    {
        onConflict:
        "playerId,date"
    });


    if(error){
        console.error("Diamondle save error:", error);
        return;
    }


    await updateDiamondleGamesPlayed(playerId);

}

/*
=========================
PLAYER SEARCH DROPDOWN
=========================
*/


function renderDropdown(){

    dropdown.innerHTML = "";


    if(matches.length === 0){

        dropdown.style.display = "none";
        return;

    }



    matches.forEach((player,index)=>{


        const div = document.createElement("div");

        div.className = "diamondle-dropdown-item";


        if(index === activeIndex){
            div.classList.add("active");
        }



        // Headshot
        const img = document.createElement("img");

        img.src = getHeadshot(player.id);

        img.className = "diamondle-dropdown-headshot";


        img.onerror = () => {

            img.src =
            "https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/default/headshot/0/current";

        };



        // Top row info container
        const info = document.createElement("div");

        info.className = "diamondle-dropdown-info";



        // Player name
        const name = document.createElement("div");

        name.className = "diamondle-dropdown-name";

        name.textContent =
            player.fullName || player.name;



        info.appendChild(name);



        // Stats full width row
        const stats = document.createElement("div");

        stats.className = "diamondle-dropdown-stats";


        stats.innerHTML = `

            <div class="diamondle-dropdown-stat">
                ${player.division || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.team || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.position || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.bats || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.throws || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.debut || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${player.age || "N/A"}
            </div>

            <div class="diamondle-dropdown-stat">
                ${getCountryAbbreviation(player.country)}
            </div>

        `;



        div.appendChild(img);

        div.appendChild(info);

        div.appendChild(stats);



        div.onclick = () => {

            input.value =
                player.fullName || player.name;

            dropdown.style.display = "none";

            guessPlayer();

        };



        dropdown.appendChild(div);


    });



    dropdown.style.display = "block";

}




/*
=========================
GUESS PLAYER
=========================
*/

let leagues = {};

async function loadLeagues(){

    const res = await fetch(
        `${MLB_API}/leagues`
    );

    const data = await res.json();

    data.leagues.forEach(l => {
        leagues[l.name] = l.abbreviation;
    });

}

function getDivisionShortName(divisionName){

    if(!divisionName)
        return "N/A";


    for(const leagueName in leagues){

        if(divisionName.startsWith(leagueName)){

            return divisionName.replace(
                leagueName,
                leagues[leagueName]
            );

        }

    }


    return divisionName;

}
async function guessPlayer(){


    const value =
        input.value.trim();


    if(!value)
        return;



    const already =
        guesses.some(
            g =>
            g.name.toLowerCase()
            ===
            value.toLowerCase()
        );


    if(already){

        message.textContent =
        "Already guessed!";

        return;

    }



    const player =
        await validatePlayerName(value);

        
    if(!player){

        message.textContent =
        "Player not found";

        return;

    }

    const fullPlayerRes = await fetch(
        `${MLB_API}/people/${player.id}?hydrate=currentTeam`
    );

    const fullPlayerData = await fullPlayerRes.json();

    const fullPlayer =
        fullPlayerData.people[0];
            
    const pitcherRole =
        await getPitcherRole(fullPlayer.id);

    const teamRes = await fetch(
        `${MLB_API}/teams/${fullPlayer.currentTeam.id}`
    );

    const teamData = await teamRes.json();

    const teamInfo = teamData.teams[0];



    const result =
        await comparePlayer(
            fullPlayer,
            gameInfoObj,
            teamInfo
        );

    const isCorrectPlayer =
        String(fullPlayer.id) === String(gameInfoObj.id);    

    guesses.unshift({

        id:player.id,

        name:player.fullName,

        correct: isCorrectPlayer,


        position:
            fullPlayer.primaryPosition?.abbreviation === "P"
                ? pitcherRole
                : fullPlayer.primaryPosition?.abbreviation || "N/A",
                
        positionColor:
            result.position,


        division:
            getDivisionShortName(
                teamInfo.division?.name
            ),

        divisionColor:
            result.division,


        team:
            teamInfo.abbreviation  || "N/A",

        teamColor:
            result.team,


        bats:
            fullPlayer.batSide?.code || "N/A",

        batsColor:
            result.bats,

        throws:
            fullPlayer.pitchHand?.code || "N/A",

        throwsColor:
            result.throws,


        debut:
            fullPlayer.mlbDebutDate
                ? fullPlayer.mlbDebutDate.substring(0,4)
                : "N/A",

        debutColor:
            result.debut,

        age:
            fullPlayer.currentAge || "N/A",

        ageColor:
            (() => {

                const diff =
                    Math.abs(
                        fullPlayer.currentAge - gameInfoObj.currentAge
                    );

                if(diff === 0)
                    return "green";

                if(diff <= 3)
                    return "yellow";

                return "red";

            })(),


        country:
            fullPlayer.birthCountry || "N/A",

        countryColor:
            fullPlayer.birthCountry === gameInfoObj.birthCountry
            ? "green"
            : "red",

    });



    render();


    document.getElementById(
        "guessNumber"
    ).textContent =
        `${guesses.length}/9`;



    await saveGame();

    checkWin();
    //updateStatHeader();
    updateHowTo();

    if(!gameLocked && guesses.length >= 9){

        gameOutcome = "lose";

        gameLocked = true;

        await saveGame();

        applyLockUI();

        openLosePopup();

    }

    input.value="";

    dropdown.style.display="none";

    message.textContent="";

}

function openLosePopup(){

    const popup =
        document.getElementById("winPopup");

    const title =
        document.getElementById("winTitle");

    const scoreStats =
        document.getElementById("scoreStats");


    title.textContent =
        "You Lose! ❌";


    scoreStats.innerHTML = `
        <pre class="share-grid">${getResultGrid()}</pre>
        <div class="answer-text">
            <div>The answer was:</div>
            <strong>${gameInfoObj.fullName}</strong>
        </div>
    `;


    popup.style.display="block";

}

async function checkWin(){

    if(gameLocked)
        return;


    const answer =
        String(gameInfoObj.id);


    const lastGuess =
        guesses[0];


    if(
        lastGuess &&
        String(lastGuess.id) === answer
    ){

        gameOutcome="win";

        gameLocked=true;


        await saveGame();


        const playerId =
            localStorage.getItem("playerId");


        await updateDiamondleGamesPlayed(playerId);


        applyLockUI();

        openPopup();

    }

}


/*
=========================
COMPARE
=========================
*/


async function comparePlayer(guess, answer, guessTeam){

    let guessPos =
        guess.primaryPosition?.abbreviation;

    let answerPos =
        answer.primaryPosition?.abbreviation;


    // Convert "P" into SP/RP
    if (guessPos === "P") {
        guessPos = await getPitcherRole(guess.id);
    }

    if (answerPos === "P") {
        answerPos = await getPitcherRole(answer.id);
    }


    return {

        position:
        (() => {

            // Exact match
            if (guessPos === answerPos)
                return "green";

            const pitchers = [
                "SP",
                "RP"
            ];


            if (
                pitchers.includes(guessPos) &&
                pitchers.includes(answerPos)
            )
                return "yellow";
                

            const outfield = [
                "LF",
                "CF",
                "RF"
            ];


            const infield = [
                "1B",
                "2B",
                "3B",
                "SS"
            ];


            if (
                outfield.includes(guessPos) &&
                outfield.includes(answerPos)
            )
                return "yellow";


            if (
                infield.includes(guessPos) &&
                infield.includes(answerPos)
            )
                return "yellow";


            return "red";

        })(),


        division:
        (() => {

            const guessDivision =
                guessTeam?.division?.id;

            const answerDivision =
                answer.teamInfo?.division?.id;


            if (guessDivision === answerDivision)
                return "green";


            const guessLeague =
                guessTeam?.league?.id;

            const answerLeague =
                answer.teamInfo?.league?.id;


            if (guessLeague === answerLeague)
                return "yellow";


            return "red";

        })(),


        bats:
        guess.batSide?.code ===
        answer.batSide?.code
        ? "green"
        : "red",


        throws:
        guess.pitchHand?.code ===
        answer.pitchHand?.code
        ? "green"
        : "red",


        debut:
        (() => {

            const guessYear =
                Number(guess.mlbDebutDate?.substring(0,4));

            const answerYear =
                Number(answer.mlbDebutDate?.substring(0,4));


            if (guessYear === answerYear)
                return "green";


            if (Math.abs(guessYear - answerYear) <= 3)
                return "yellow";


            return "red";

        })(),


        team:
        guess.currentTeam?.id ===
        answer.currentTeam?.id
        ? "green"
        : "red"

    };

}




/*
=========================
RENDER
=========================
*/

function render() {

    board.innerHTML = "";

    guesses.forEach(g => {

        const row = document.createElement("div");
        row.className = "diamondle-row";

        let headerColor = "gray";

        const allGreen =
            g.positionColor === "green" &&
            g.divisionColor === "green" &&
            g.teamColor === "green" &&
            g.batsColor === "green" &&
            g.throwsColor === "green" &&
            g.debutColor === "green" &&
            g.ageColor === "green" &&
            g.countryColor === "green";


        if (g.correct && allGreen) {
            headerColor = "green";
        }
        else if (!g.correct && allGreen) {
            headerColor = "yellow";
        }

        row.innerHTML = `

            <div class="diamondle-name">
                ${g.name}
            </div>


            <div class="diamondle-stats">

                <div class="diamondle-stat ${g.divisionColor}">
                    <strong>${g.division}</strong>
                </div>

                <div class="diamondle-stat ${g.teamColor}">
                    <strong>${g.team}</strong>
                </div>

                <div class="diamondle-stat ${g.positionColor}">
                    <strong>${g.position}</strong>
                </div>

                <div class="diamondle-stat ${g.batsColor}">
                    <strong>${g.bats}</strong>
                </div>

                <div class="diamondle-stat ${g.throwsColor}">
                    <strong>${g.throws}</strong>
                </div>

                <div class="diamondle-stat ${g.debutColor}">
                    <strong>${g.debut}</strong>
                </div>

                <div class="diamondle-stat ${g.ageColor}">
                    <strong>${g.age}</strong>
                </div>

                <div class="diamondle-stat ${g.countryColor}">
                    <strong>${getCountryAbbreviation(g.country)}</strong>
                </div>

            </div>

        `;

        board.appendChild(row);

    });

}






/*
=========================
INPUT EVENTS
=========================
*/


let searchTimer;



input.addEventListener(
"input",
()=>{


    clearTimeout(searchTimer);



    searchTimer =
    setTimeout(async()=>{


        matches =
        await searchMLBPlayers(
            input.value
        );


        activeIndex=-1;


        renderDropdown();



    },150);


});





input.addEventListener(
"keydown",
(e)=>{


    if(e.key==="ArrowDown"){

        activeIndex =
        Math.min(
            activeIndex+1,
            matches.length-1
        );

        renderDropdown();

    }



    if(e.key==="ArrowUp"){


        activeIndex =
        Math.max(
            activeIndex-1,
            0
        );


        renderDropdown();

    }




    if(e.key==="Enter"){


        e.preventDefault();


        if(
            activeIndex >=0 &&
            matches[activeIndex]
        ){

            input.value =
            matches[activeIndex].name;

        }


        guessPlayer();

    }


});






document.addEventListener(
"click",
(e)=>{


    if(
        !e.target.closest(".input-wrapper")
    ){

        dropdown.style.display="none";

    }


});

function getShareGrid(){

    let emojiGrid = "";

    guesses.forEach(g => {

        const colors = [
            g.divisionColor,
            g.teamColor,
            g.positionColor,
            g.batsColor,
            g.throwsColor,
            g.debutColor,
            g.ageColor,
            g.countryColor
        ];

        colors.forEach(color => {

            if(color === "green"){
                emojiGrid += "🟩";
            }
            else if(color === "yellow"){
                emojiGrid += "🟨";
            }
            else{
                emojiGrid += "🟥";
            }

        });

        emojiGrid += "\n";

    });

    return emojiGrid;

}

function shareResults(){

    const [year, month, day] = selectedDate.split("-");
    const displayDate = `${month}/${day}/${year}`;

    const text =
`Daily Diamond - ${displayDate}

${getResultGrid()}`;


    navigator.clipboard.writeText(text)
    .then(()=>{
        alert("Copied to clipboard!");
    })
    .catch(()=>{
        alert("Copy failed");
    });

}



function getColorGrid(){

    let grid = "";

    guesses.forEach(g=>{

        const colors = [
            g.divisionColor,
            g.teamColor,
            g.positionColor,
            g.batsColor,
            g.throwsColor,
            g.debutColor,
            g.ageColor,
            g.countryColor
        ];


        colors.forEach(color=>{

            if(color === "green"){
                grid += `<span class="popup-square green"></span>`;
            }
            else if(color === "yellow"){
                grid += `<span class="popup-square yellow"></span>`;
            }
            else{
                grid += `<span class="popup-square red"></span>`;
            }

        });


        grid += "<br>";

    });


    return grid;

}


/*
=========================
START GAME
=========================
*/


(async function boot(){


    try{


        console.log(
            "Starting Diamondle..."
        );

        await loadLeagues();
        await loadGame();

        const playerId = localStorage.getItem("playerId");

        await createDiamondlePlayer(playerId);


        gameTitle.textContent =
        "Guess the MLB Player";



        await loadPlayerGame();

        //updateStatHeader();
        updateHowTo();


        if(gameLocked){

            applyLockUI();

            if(gameOutcome==="win"){
                openPopup();
            }
            else{
                openLosePopup();
            }

        }

        render();



        document.getElementById(
            "guessNumber"
        ).textContent =
            `${guesses.length}/9`;



        console.log(
            "Game Loaded",
            gameInfoObj
        );


    }
    catch(err){

        console.error(
            "BOOT ERROR",
            err
        );


        message.textContent =
        err.message;

    }


})();

document.getElementById("nameStatHeader").innerHTML = `
  <span>DIV</span>
  <span>TEAM</span>
  <span>POS</span>
  <span>BAT</span>
  <span>THR</span>
  <span>DEBUT</span>
  <span>AGE</span>
  <span>BORN</span>
`;


const countryCodes = {

    "United States": "USA",
    "Dominican Republic": "DOM",
    "Venezuela": "VEN",
    "Puerto Rico": "PRI",
    "Cuba": "CUB",
    "Mexico": "MEX",
    "Canada": "CAN",
    "Japan": "JPN",
    "South Korea": "KOR",
    "Taiwan": "TWN",
    "Colombia": "COL",
    "Australia": "AUS",
    "Netherlands": "NED",
    "Curacao": "CUW",
    "Panama": "PAN",
    "Nicaragua": "NIC",
    "Brazil": "BRA",
    "Germany": "GER",
    "Italy": "ITA",
    "Spain": "ESP",
    "France": "FRA",
    "South Africa": "RSA",
    "Aruba": "ARU",
    "Bahamas": "BAH",
    "Belize": "BLZ",
    "Honduras": "HON",
    "Guatemala": "GUA",
    "Chile": "CHI",
    "Peru": "PER",
    "Poland": "POL",
    "Sweden": "SWE",
    "Czech Republic": "CZE",
    "Czechia": "CZE",
    "United Kingdom": "GBR",
    "Ireland": "IRL",
    "Austria": "AUT",
    "Belgium": "BEL",
    "Switzerland": "SUI",
    "Russia": "RUS",
    "Ukraine": "UKR",
    "Lithuania": "LTU",
    "Croatia": "CRO",
    "Serbia": "SRB",
    "Israel": "ISR"

};


function getCountryAbbreviation(country){

    if(!country)
        return "N/A";


    return countryCodes[country] || 
        country.substring(0,3).toUpperCase();

}

async function getPitcherRole(playerId){

    const res = await fetch(
        `${MLB_API}/people/${playerId}/stats?stats=season&group=pitching`
    );

    const data = await res.json();

    const splits =
        data.stats?.[0]?.splits?.[0];

    if(!splits)
        return "P";


    const stats = splits.stat;


    const games =
        stats.gamesPlayed || 0;

    const starts =
        stats.gamesStarted || 0;


    if(games === 0)
        return "P";


    // More than half appearances as starts
    if(starts / games >= 0.5)
        return "SP";


    return "RP";

}

function updateHowTo() {

  //const howTo = document.getElementById("howTo");

  if (guesses.length === 0) {
    openHowTo();
  } else {
    closeHowTo();
  }

}

function openHowTo() {
  document.getElementById("howtoPopup").style.display = "block";
}

function closeHowTo() {
  document.getElementById("howtoPopup").style.display = "none";
}

/*
function updateStatHeader() {

  const statHeader =
    document.getElementById("nameStatHeader");

  if (guesses.length === 0) {
    statHeader.stylde.display = "none";
  } 
  else {
    statHeader.style.display = "grid";
  }

}*/