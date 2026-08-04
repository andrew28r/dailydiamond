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




let pick5Hitters = [
    null,
    null,
    null
];


let pick5Starter = null;

let pick5Reliever = null;



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


    let status =
    game.status?.abstractGameState;


    return (
        status === "Live" ||
        status === "Final"
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


        let currentPlayer = null;


        if(pick5SelectedSlot==="hitter0")
            currentPlayer=pick5Hitters[0];

        if(pick5SelectedSlot==="hitter1")
            currentPlayer=pick5Hitters[1];

        if(pick5SelectedSlot==="hitter2")
            currentPlayer=pick5Hitters[2];

        if(pick5SelectedSlot==="starter")
            currentPlayer=pick5Starter;

        if(pick5SelectedSlot==="reliever")
            currentPlayer=pick5Reliever;



        if(currentPlayer && pick5IsGameStarted(currentPlayer)){
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


    let card =
    document.createElement("div");



    card.className =
    "pick5-game-card";



    card.innerHTML = `

    <div class="pick5-matchup">

        <div class="pick5-team-name">
            ${pick5TeamName(game.teams.away.team.name)}
        </div>

        <div class="pick5-team-name">
            ${pick5TeamName(game.teams.home.team.name)}
        </div>

        <div class="pick5-game-time">
            ${new Date(game.gameDate).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            })}
        </div>

    </div>

    `;



    card.onclick=()=>{


        pick5LoadGamePlayers(
            game
        );


    };



    carousel.appendChild(card);


    });



    // AUTO LOAD FIRST GAME

    if(pick5TodaysGames.length){

        pick5LoadGamePlayers(
            pick5TodaysGames[0]
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


    players.sort((a,b)=>{


        if(a.position==="P" && b.position!=="P")
            return 1;


        if(a.position!=="P" && b.position==="P")
            return -1;


        return a.name.localeCompare(b.name);


    });



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


function pick5SelectPlayer(
    slot,
    player
){


    if(slot==="hitter0")
        pick5Hitters[0]=player;


    if(slot==="hitter1")
        pick5Hitters[1]=player;


    if(slot==="hitter2")
        pick5Hitters[2]=player;


    if(slot==="starter")
        pick5Starter=player;


    if(slot==="reliever")
        pick5Reliever=player;



    pick5RenderLineup();

    pick5SavePicks();   



    document
    .getElementById(
        "pick5PlayerPopup"
    )
    .style.display="none";


}









function pick5RenderLineup(){


    document
    .querySelectorAll(
        ".pick5-slot"
    )
    .forEach(slot=>{


        let player = null;



        if(slot.dataset.slot==="hitter0")
            player=pick5Hitters[0];

        if(slot.dataset.slot==="hitter1")
            player=pick5Hitters[1];

        if(slot.dataset.slot==="hitter2")
            player=pick5Hitters[2];

        if(slot.dataset.slot==="starter")
            player=pick5Starter;

        if(slot.dataset.slot==="reliever")
            player=pick5Reliever;



        if(player){

            let locked = pick5IsGameStarted(player);


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

                        <span>
                            ${pick5GetGameTime(player)}
                        </span>


                        ${
                            locked
                            ?
                            "<span class='pick5-lock-badge'>LOCKED</span>"
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


        }


    });


}

function pick5GetPlayerPoints(player){

    // temporary until scoring is added
    return 0;

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



    return "vs " + pick5TeamName(opponent);


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


    if(
        pick5SelectedSlot === "hitter0" ||
        pick5SelectedSlot === "hitter1" ||
        pick5SelectedSlot === "hitter2"
    ){

        return players.filter(
            p => !pick5IsPitcher(p)
        );

    }



    if(
        pick5SelectedSlot === "starter" ||
        pick5SelectedSlot === "reliever"
    ){

        return players.filter(
            p => pick5IsPitcher(p)
        );

    }


    return players;

}

function pick5IsPitcher(player){

    return player.position === "P";

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

    let selectedPlayers = [

        ...pick5Hitters,

        pick5Starter,

        pick5Reliever

    ];


    let currentPlayer =
    pick5GetCurrentSlotPlayer();



    return selectedPlayers.some(
        selected =>
        selected &&
        selected.id === player.id &&
        selected !== currentPlayer
    );

}

function pick5GetCurrentSlotPlayer(){

    if(pick5SelectedSlot==="hitter0")
        return pick5Hitters[0];

    if(pick5SelectedSlot==="hitter1")
        return pick5Hitters[1];

    if(pick5SelectedSlot==="hitter2")
        return pick5Hitters[2];

    if(pick5SelectedSlot==="starter")
        return pick5Starter;

    if(pick5SelectedSlot==="reliever")
        return pick5Reliever;


    return null;

}


async function pick5LoadSavedLineup(){


    let playerId =
    localStorage.getItem("playerId");


    if(!playerId)
        return;


    const {data,error} = await db
    .from("pick5PlayerGames")
    .select("*")
    .eq(
        "playerId",
        playerId
    )
    .eq(
        "date",
        pick5SelectedDate
    )
    .maybeSingle();



    if(error){

        console.log(
            "No saved Pick5 lineup"
        );

        return;

    }



    if(data.picks){


        pick5Hitters[0] =
        data.picks.hitter0
        ?
        pick5FindPlayer(data.picks.hitter0)
        :
        null;


        pick5Hitters[1] =
        data.picks.hitter1
        ?
        pick5FindPlayer(data.picks.hitter1)
        :
        null;


        pick5Hitters[2] =
        data.picks.hitter2
        ?
        pick5FindPlayer(data.picks.hitter2)
        :
        null;


        pick5Starter =
        data.picks.starter
        ?
        pick5FindPlayer(data.picks.starter)
        :
        null;


        pick5Reliever =
        data.picks.reliever
        ?
        pick5FindPlayer(data.picks.reliever)
        :
        null;


    }


    pick5RenderLineup();


}

function pick5FindPlayer(id){

    return pick5PlayerPool.find(
        p => p.id === id
    ) || null;

}

async function pick5SavePicks(){

    let playerId = localStorage.getItem("playerId");


    if(!playerId){

        console.log("No player ID found");
        return;

    }


    let picks = {

        hitter0:
        pick5Hitters[0]?.id || null,

        hitter1:
        pick5Hitters[1]?.id || null,

        hitter2:
        pick5Hitters[2]?.id || null,

        starter:
        pick5Starter?.id || null,

        reliever:
        pick5Reliever?.id || null

    };



    const { data, error } = await db
    .from("pick5PlayerGames")
    .upsert({

        playerId: playerId,

        date: pick5SelectedDate,

        picks: picks

    },{
        onConflict:
        "playerId,date"
    });



    if(error){

        console.log(
            "Pick5 save error:",
            error
        );

    }
    else{

        console.log(
            "Pick5 saved",
            data
        );

    }

}

async function pick5UpdateLiveScores(){

    let activePlayers = [

        ...pick5Hitters.filter(Boolean),

        pick5Starter,

        pick5Reliever

    ].filter(Boolean);



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



    let scores = {

        hitter0:
        pick5Hitters[0]?.points || 0,

        hitter1:
        pick5Hitters[1]?.points || 0,

        hitter2:
        pick5Hitters[2]?.points || 0,

        starter:
        pick5Starter?.points || 0,

        reliever:
        pick5Reliever?.points || 0

    };



    let total =
    Object.values(scores)
    .reduce(
        (a,b)=>a+b,
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

}


function pick5ConvertIP(ip){

    if(!ip)
        return 0;


    let parts =
    ip.toString().split(".");


    let innings =
    Number(parts[0]) || 0;


    let outs =
    Number(parts[1]) || 0;


    return innings + (outs / 3);

}


function pick5CalculatePoints(
    player,
    stats
){

    let points = 0;



    if(player.position === "P"){


        points +=
        pick5ConvertIP(
            stats.pitching?.inningsPitched
        ) * 3;



        points +=
        (stats.pitching?.strikeOuts || 0) * 2;



        points +=
        (stats.pitching?.wins || 0) * 5;



        points +=
        (stats.pitching?.saves || 0) * 5;



        points +=
        (stats.pitching?.earnedRuns || 0) * -2;



    }
    else{


        points +=
        (stats.batting?.hits || 0) * 3;



        points +=
        (stats.batting?.homeRuns || 0) * 5;



        points +=
        (stats.batting?.runs || 0) * 2;



        points +=
        (stats.batting?.rbi || 0) * 2;



        points +=
        (stats.batting?.baseOnBalls || 0);



        points +=
        (stats.batting?.stolenBases || 0) * 2;



    }



    return Math.round(points);

}

setInterval(
    pick5RefreshGameStatus,
    60000
);


setInterval(
    pick5UpdateLiveScores,
    60000
);