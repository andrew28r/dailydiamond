let pick5SelectedDate = getEasternDateString();


let pick5TodaysGames = [];

let pick5PlayerPool = [];


let pick5SelectedSlot = null;

let pick5SelectedGame = null;

let pick5SelectedTeam = "home";



let pick5GamePlayers = {

    home: [],

    away: []

};


const PICK5_SLOTS = 5;

let pick5Hitters = Array(PICK5_SLOTS).fill(null);

/*
========================
START
========================
*/


document.getElementById("gameDate").textContent =
    new Date(pick5SelectedDate + "T12:00:00")
    .toLocaleDateString([], {
        month:"long",
        day:"numeric"
    }) + " Lineup";

document
.getElementById("backBtn")
.onclick = ()=>{

    window.location.href="index.html";

};






(async()=>{

    console.log(
        "Loading Pick5..."
    );


    await pick5LoadGames();


    await pick5BuildPlayerPool();


    await pick5LoadSavedLineup();


    await pick5UpdateLiveScores();


    await pick5LoadLeaderboard();


    console.log(
        "Pick5 ready"
    );


})();





function pick5IsGameStarted(player){

    let game = pick5TodaysGames.find(
        g => g.gamePk === player.gameId
    );


    if(!game)
        return false;


    let status = game.status;


    return (
        status.abstractGameState === "Final" ||
        (
            status.abstractGameState === "Live" &&
            status.codedGameState !== "S" &&
            status.detailedState !== "Warmup"
        )
    );

}
/*
========================
LOAD GAMES
========================
*/


async function pick5LoadGames(){


    const res = await fetch(

        `${PICK5_API}/schedule?sportId=1&date=${pick5SelectedDate}`

    );


    const data =
    await res.json();



    pick5TodaysGames =
    data.dates?.[0]?.games || [];



    console.log(
        "Games:",
        pick5TodaysGames
    );


}








/*
========================
LOAD PLAYERS
========================
*/


async function pick5BuildPlayerPool(){


    for(
        const game of pick5TodaysGames
    ){



        let home =
        await pick5LoadRoster(
            game.teams.home.team.id,
            game
        );



        let away =
        await pick5LoadRoster(
            game.teams.away.team.id,
            game
        );



        pick5PlayerPool.push(
            ...home,
            ...away
        );


    }



    console.log(
        "Players:",
        pick5PlayerPool.length
    );


}








async function pick5LoadRoster(
    teamId,
    game
){


    const res = await fetch(

        `${PICK5_API}/teams/${teamId}/roster`

    );


    const data =
    await res.json();



    return (

        data.roster || []

    )
    .map(p=>{


        return {

            id:
            p.person.id,

            name:
            p.person.fullName,

            position:
            p.position?.abbreviation || "",

            team:
            teamId,

            gameId:
            game.gamePk,

            points: 0

        };


    });



}










/*
========================
OPEN POPUP
========================
*/


document
.querySelectorAll(".pick5-slot")
.forEach(slot=>{


    slot.onclick = ()=>{


        pick5SelectedSlot =
        slot.dataset.slot;


        let index =
        Number(
            pick5SelectedSlot.replace("hitter","")
        );


        let currentPlayer =
        pick5Hitters[index];


        if(
            currentPlayer &&
            pick5IsGameStarted(currentPlayer)
        ){
            return;
        }


        pick5OpenPopup();


    };


});







function pick5OpenPopup(){


    document
    .getElementById(
        "pick5PlayerPopup"
    )
    .style.display="block";



    pick5RenderGameCarousel();


}







document
.getElementById(
    "pick5ClosePopup"
)
.onclick=()=>{


    document
    .getElementById(
        "pick5PlayerPopup"
    )
    .style.display="none";


};








/*
========================
GAME CAROUSEL
========================
*/


function pick5RenderGameCarousel(){


    const carousel =
    document.getElementById(
        "pick5GameCarousel"
    );


    carousel.innerHTML="";


    console.log(
        "Rendering carousel",
        pick5TodaysGames
    );



    pick5TodaysGames.forEach(game=>{


        let status =
        game.status?.detailedState;


        let abstract =
        game.status?.abstractGameState;


        // remove finished/cancelled/postponed games
        if(
            abstract === "Final"
        ){
            return;
        }



        // only true in progress games
        let inProgress =
        abstract === "Live" &&
        game.status?.codedGameState === "I";



        let card =
        document.createElement("div");


        card.className =
        "pick5-game-card";



        if(inProgress){

            card.classList.add(
                "locked"
            );

        }



        card.innerHTML = `


        <div class="pick5-matchup">


            <div class="pick5-team-name">
                ${pick5TeamName(game.teams.away.team.name)}
            </div>


            <div class="pick5-team-name">
                ${pick5TeamName(game.teams.home.team.name)}
            </div>


            <div class="pick5-game-time">

                ${
                    inProgress
                    ?
                    "IN PROGRESS"
                    :
                    new Date(game.gameDate)
                    .toLocaleTimeString([],{
                        hour:"numeric",
                        minute:"2-digit"
                    })
                }

            </div>


        </div>


        `;



        // only allow picking before game starts
        if(!inProgress){

            card.onclick=()=>{


                pick5LoadGamePlayers(
                    game
                );


            };

        }



        carousel.appendChild(card);


    });



    // auto load first available game

    let firstGame =
    pick5TodaysGames.find(game=>{


        return (
            game.status?.abstractGameState === "Preview"
        );


    });



    if(firstGame){

        pick5LoadGamePlayers(
            firstGame
        );

    }


}





function pick5TeamName(fullName){

    return fullName
        .replace(/^(Los Angeles|San Francisco|Kansas City|New York|St\. Louis|Tampa Bay|Cleveland|Arizona|Colorado|Texas|Washington|Oakland|Chicago|Boston|Detroit|Houston|Miami|Milwaukee|Minnesota|Atlanta|Baltimore|Pittsburgh|Philadelphia|Seattle|Toronto|San Diego|Cincinnati|Cleveland|Anaheim)/, "")
        .trim();

}



/*
========================
LOAD GAME PLAYERS
========================
*/


function pick5LoadGamePlayers(game){


    pick5SelectedGame =
    game;



    pick5GamePlayers.home =

    pick5PlayerPool.filter(player=>


        player.gameId === game.gamePk &&

        player.team === game.teams.home.team.id


    );





    pick5GamePlayers.away =

    pick5PlayerPool.filter(player=>


        player.gameId === game.gamePk &&

        player.team === game.teams.away.team.id


    );



    pick5SelectedTeam="home";
    pick5UpdateTeamButtons();


    document
    .getElementById("pick5HomeTab")
    .textContent =
    pick5TeamName(
        game.teams.home.team.name
    );



    document
    .getElementById("pick5AwayTab")
    .textContent =
    pick5TeamName(
        game.teams.away.team.name
    );



    pick5RenderPlayers();


}










/*
========================
RENDER PLAYERS
========================
*/

function pick5RenderPlayers(){


    const container =
    document.getElementById(
        "pick5GamePlayers"
    );


    let players =

    pick5SelectedTeam==="home"

    ?

    pick5GamePlayers.home

    :

    pick5GamePlayers.away;



    players = pick5FilterPlayersBySlot(players);

    players = players.filter(
        p => !pick5IsPlayerSelected(p)
    );


    players.sort((a,b)=>
        a.name.localeCompare(b.name)
    );



    container.innerHTML =

    players.map((p,index)=>{


        let locked =
        pick5IsPlayerLocked(p);



        return `


        <div 
        class="pick5-player-row ${locked ? "locked" : ""}"
        data-index="${index}">


            <img src="${getHeadshot(p.id)}">


            <div>

                ${p.name}

                <br>

                <small>
                    ${p.position}
                </small>

            </div>


            ${
                locked 
                ? 
                `
                <span class="pick5-locked-label">
                    ${p.points ?? 0} pts
                </span>
                `
                :
                ""
            }


        </div>


        `;


    }).join("");





    document
    .querySelectorAll(
        ".pick5-player-row"
    )
    .forEach(row=>{


        row.onclick=()=>{


            let player =
            players[
                row.dataset.index
            ];



            if(pick5IsPlayerLocked(player)){
                return;
            }



            pick5SelectPlayer(
                pick5SelectedSlot,
                player
            );


        };


    });


}









/*
========================
TEAM BUTTONS
========================
*/


document
.getElementById(
    "pick5HomeTab"
)
.onclick=()=>{


    pick5SelectedTeam="home";

    pick5UpdateTeamButtons();


    pick5RenderPlayers();


};




document
.getElementById(
    "pick5AwayTab"
)
.onclick=()=>{


    pick5SelectedTeam="away";

    pick5UpdateTeamButtons();


    pick5RenderPlayers();


};








/*
========================
SELECT PLAYER
========================
*/

function pick5SelectPlayer(slot, player){

    if(!slot || !player)
        return;


    let index =
    Number(
        slot.replace("hitter","")
    );


    if(index < 0 || index >= PICK5_SLOTS)
        return;


    pick5Hitters[index] = player;


    pick5RenderLineup();

    pick5SavePicks();


    document
    .getElementById("pick5PlayerPopup")
    .style.display="none";

}








function pick5RenderLineup(){

    document
    .querySelectorAll(".pick5-slot")
    .forEach(slot=>{


        let index =
        Number(
            slot.dataset.slot.replace("hitter","")
        );


        let player =
        pick5Hitters[index];


        if(player){

            let locked =
            pick5IsGameStarted(player);


            slot.innerHTML = `

            <div class="pick5-selected-card">


                <img 
                class="pick5-selected-headshot"
                src="${getHeadshot(player.id)}">


                <div class="pick5-selected-info">


                    <div class="pick5-selected-name">
                        ${player.name}
                    </div>


                    <div class="pick5-selected-position">
                        ${pick5GetTeamName(player.team)} - ${player.position}
                    </div>


                    <div class="pick5-selected-game">

                        ${pick5GetOpponent(player)}

                        ${
                            !locked
                            ?
                            `
                            <span class="pick5-game-time">
                                ${pick5GetGameTime(player)}
                            </span>
                            `
                            :
                            ""
                        }

                    </div>


                </div>



                ${
                    locked
                    ?
                    `
                    <div class="pick5-player-points">

                        ${player.points ?? 0} pts

                    </div>
                    `
                    :
                    ""
                }


            </div>

            `;


        } else {

            slot.innerHTML = `

                    <div class="empty-slot">
                        + Select Hitter
                    </div>

            `;

        }


    });

}

function pick5GetPlayerPoints(player){

    // temporary until scoring is added
    return 0;

}

function pick5GetPlayerGameStats(player){

    let stats = player.stats?.batting;


    if(!stats)
        return "0-0";


    let line = [];


    // Hits - At Bats
    line.push(
        `${stats.hits || 0}-${stats.atBats || 0}`
    );


    // Extra base hits
    if(stats.doubles)
        line.push(`${stats.doubles} 2B`);


    if(stats.triples)
        line.push(`${stats.triples} 3B`);


    // Power
    if(stats.homeRuns)
        line.push(`${stats.homeRuns} HR`);


    // Production
    if(stats.runs)
        line.push(`${stats.runs} R`);


    if(stats.rbi)
        line.push(`${stats.rbi} RBI`);


    // Plate discipline
    if(stats.baseOnBalls)
        line.push(`${stats.baseOnBalls} BB`);


    if(stats.strikeOuts)
        line.push(`${stats.strikeOuts} K`);


    // Speed
    if(stats.stolenBases)
        line.push(`${stats.stolenBases} SB`);


    // Total bases (optional but useful)
    if(stats.totalBases)
        line.push(`${stats.totalBases} TB`);


    // Points display
    let points = pick5CalculatePoints(
        player,
        player.stats
    );



    return line.join(", ");

}

function pick5GetTeamName(teamId){


    let team =
    pick5TodaysGames
    .flatMap(game=>[
        game.teams.home.team,
        game.teams.away.team
    ])
    .find(team=>team.id === teamId);



    return team
    ?
    pick5TeamName(team.name)
    :
    "";

}

function pick5GetOpponent(player){

    let game =
    pick5TodaysGames.find(
        g=>g.gamePk === player.gameId
    );


    if(!game)
        return "";


    let opponent =
    player.team === game.teams.home.team.id
    ?
    game.teams.away.team.name
    :
    game.teams.home.team.name;


    let result =
    "vs " + pick5TeamName(opponent);


    if(pick5IsGameStarted(player)){

        let stats =
        pick5GetPlayerGameStats(player);


        if(stats){

            result += `: ${stats}`;

        }

    }


    return result;

}

async function pick5LoadLeaderboard(){


    const {data,error} = await db
    .from("pick5PlayerGames")
    .select("*")
    .eq(
        "date",
        pick5SelectedDate
    )
    .order(
        "score",
        {
            ascending:false
        }
    );

    if(error){

        console.log(error);
        return;

    }


    for(let game of data){

        let player =
        await db
        .from("playerData")
        .select("playerId")
        .eq(
            "playerId",
            game.playerId
        )
        .single();


        game.playerData = player.data;

    }


    if(error){

        console.log(error);
        return;

    }


    console.log(
        "Leaderboard:",
        data
    );

    pick5RenderLeaderboard(data);


}

function pick5GetGameTime(player){


    let game =
    pick5TodaysGames.find(
        g=>g.gamePk === player.gameId
    );


    if(!game)
        return "";


    return new Date(game.gameDate)
    .toLocaleTimeString([],{
        hour:"numeric",
        minute:"2-digit"
    });


}

function pick5UpdateTeamButtons(){

    document
    .getElementById("pick5HomeTab")
    .classList.toggle(
        "active",
        pick5SelectedTeam === "home"
    );


    document
    .getElementById("pick5AwayTab")
    .classList.toggle(
        "active",
        pick5SelectedTeam === "away"
    );

}

function pick5FilterPlayersBySlot(players){

    return players.filter(player =>
        !["P","SP","RP"].includes(player.position)
    );

}



function pick5IsPlayerLocked(player){

    return pick5IsGameStarted(player);

}
async function pick5RefreshGameStatus(){

    const res = await fetch(
        `${PICK5_API}/schedule?sportId=1&date=${pick5SelectedDate}`
    );


    const data = await res.json();


    pick5TodaysGames =
    data.dates?.[0]?.games || [];


    pick5RenderLineup();

}


function pick5RenderLeaderboard(players){


    let board =
    document.getElementById(
        "pick5Leaderboard"
    );


    if(!board)
        return;



    board.innerHTML = "";



    players.forEach((player,index)=>{


        board.innerHTML += `


        <div class="leaderboard-row">


            <span>
                ${index + 1}
            </span>


            <span>
                ${player.playerData?.playerId || "Guest"}
            </span>


            <span>
            </span>


            
            <span>
               
                ${player.score || 0}
            </span>

        </div>


        `;


    });


}



function pick5IsPlayerSelected(player){

    let current =
    pick5GetCurrentSlotPlayer();


    return pick5Hitters.some(
        selected =>
            selected &&
            selected.id === player.id &&
            selected !== current
    );

}

function pick5GetCurrentSlotPlayer(){

    if(!pick5SelectedSlot)
        return null;


    let index =
    Number(
        pick5SelectedSlot.replace("hitter","")
    );


    return pick5Hitters[index] || null;

}


async function pick5LoadSavedLineup(){


    let playerId =
    localStorage.getItem("playerId");


    if(!playerId)
        return;



    const {data,error}=await db
    .from("pick5PlayerGames")
    .select("*")
    .eq("playerId",playerId)
    .eq("date",pick5SelectedDate)
    .maybeSingle();



    if(error || !data)
        return;



    if(data.picks){


        pick5Hitters =
        Array.from(
            {length:PICK5_SLOTS},
            (_,i)=>
            pick5FindPlayer(
                data.picks[`hitter${i}`]
            )

        );


    }


    pick5RenderLineup();


}

function pick5FindPlayer(id){

    if(!id)
        return null;


    return pick5PlayerPool.find(
        p => p.id === id
    ) || null;

}

async function pick5SavePicks(){


    let playerId =
    localStorage.getItem("playerId");


    if(!playerId)
        return;



    let picks={};


    pick5Hitters.forEach((player,index)=>{


        picks[
            `hitter${index}`
        ] =
        player?.id || null;


    });



    const {error}=await db
    .from("pick5PlayerGames")
    .upsert({

        playerId,

        date:pick5SelectedDate,

        picks

    },{
        onConflict:"playerId,date"
    });



    if(error)
        console.log(
            "Pick5 save error:",
            error
        );


}

async function pick5UpdateLiveScores(){

    let activePlayers = pick5Hitters.filter(Boolean);


    for(let player of activePlayers){


        let game =
        pick5TodaysGames.find(
            g=>g.gamePk === player.gameId
        );


        if(!game)
            continue;



        if(
            game.status.abstractGameState !== "Live" &&
            game.status.abstractGameState !== "Final"
        ){
            continue;
        }



        try{


            const res =
            await fetch(
                `${PICK5_API}/game/${player.gameId}/boxscore`
            );


            const data =
            await res.json();



            let foundPlayer = null;


            for(let team of [
                data.teams.away,
                data.teams.home
            ]){


                if(
                    team.players?.[`ID${player.id}`]
                ){

                    foundPlayer =
                    team.players[`ID${player.id}`];

                    break;

                }

            }



            if(!foundPlayer)
                continue;



            player.stats = foundPlayer.stats;

            player.points =
            pick5CalculatePoints(
                player,
                foundPlayer.stats
            );


        }
        catch(e){

            console.log(
                "Score update error",
                e
            );

        }


    }



    let playerId =
    localStorage.getItem("playerId");



    let total = pick5Hitters.reduce(
        (sum, player) => sum + (player?.points || 0),
        0
    );


    await db
    .from("pick5PlayerGames")
    .update({

        score: total,

        completed:
        pick5TodaysGames.every(
            g => g.status.abstractGameState === "Final"
        )

    })
    .eq(
        "playerId",
        playerId
    )
    .eq(
        "date",
        pick5SelectedDate
    );



    pick5RenderLineup();

    pick5LoadLeaderboard();

}

function pick5CalculatePoints(player, stats){

    let points = 0;

    const batting = stats.batting || {};


    // =========================
    // HITTING
    // =========================

    points += (batting.hits || 0) * 3;

    points += (batting.homeRuns || 0) * 5;

    points += (batting.runs || 0) * 2;

    points += (batting.rbi || 0) * 2;

    points += (batting.baseOnBalls || 0);

    points += (batting.stolenBases || 0) * 2;


    // Extra-base hits

    points += (batting.doubles || 0) * 2;

    points += (batting.triples || 0) * 4;


    // Total bases

    points += (batting.totalBases || 0);


    // Sacrifice flies

    points += (batting.sacFlies || 0);



    // =========================
    // QUALITY BONUSES
    // =========================


    // 2+ hit game
    if((batting.hits || 0) >= 2){
        points += 5;
    }


    // 3+ hit game
    if((batting.hits || 0) >= 3){
        points += 5;
    }


    // Multi-HR game
    if((batting.homeRuns || 0) >= 2){
        points += 10;
    }


    // Big RBI game
    if((batting.rbi || 0) >= 3){
        points += 5;
    }



    // =========================
    // NEGATIVES
    // =========================


    // Strikeouts
    points -= (batting.strikeOuts || 0);


    // Double plays
    points -= (batting.groundIntoDoublePlay || 0) * 2;



    // =========================
    // POSITION BONUSES
    // =========================


    if(player.position === "C"){

        points += (batting.rbi || 0) * 0.5;

    }


    if(
        player.position === "SS" ||
        player.position === "2B"
    ){

        points += (batting.stolenBases || 0);

    }



    return Math.round(points);

}

setInterval(
    pick5RefreshGameStatus,
    60000
);


setInterval(async()=>{

    await pick5UpdateLiveScores();
    await pick5LoadLeaderboard();

},60000);