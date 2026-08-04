const PICK5_API =
"https://statsapi.mlb.com/api/v1";

window.PICK5_API = PICK5_API;

let liveScoreTimer = null;



/*
=========================
START LIVE SCORING
=========================
*/


function startPick5LiveScoring(){


    updateLiveScores();


    // update every minute
    liveScoreTimer =
    setInterval(
        updateLiveScores,
        60000
    );


}







/*
=========================
UPDATE SCORES
=========================
*/


async function updateLiveScores(){


const game =
await pick5PlayerGames(
    selectedDate
);



if(!game || !game.picks)
    return;



let totalScore = 0;


let playerScores = {};



const players = [

    ...game.picks.hitters,

    game.picks.starter,

    game.picks.reliever

];





for(const player of players){


    if(!player)
        continue;



    const result =
    await getPlayerScore(
        player
    );



    player.score =
    result.score;



    player.locked =
    result.locked;



    playerScores[player.id] =
    result;



    totalScore += result.score;


}





await saveLiveScore(

    playerScores,

    totalScore

);



renderLiveScores(
    playerScores,
    totalScore
);



}









/*
=========================
LOCK CHECK
=========================
*/


function hasGameStarted(gameTime){


if(!gameTime)
    return false;



return new Date() >=
new Date(gameTime);



}








/*
=========================
GET PLAYER SCORE
=========================
*/


async function getPlayerScore(player){



const locked =
hasGameStarted(
    player.gameTime
);




const res =
await fetch(

`${PICK5_API}/game/${player.gameId}/boxscore`

);



const data =
await res.json();





if(!data.teams){

return {

score:0,

locked

};

}






let stats =
findPlayerStats(

data,

player.id

);





if(!stats){

return {

score:0,

locked

};

}






let score = 0;





if(player.position==="P"
|| player.position==="SP"
|| player.position==="RP"){


score =
calculatePitcherScore(
    stats
);


}

else{


score =
calculateHitterScore(
    stats
);


}







return {


score,

locked,


stats


};



}









/*
=========================
FIND PLAYER BOX SCORE
=========================
*/


function findPlayerStats(
boxscore,
playerId
){



let teams = [

boxscore.teams.home,

boxscore.teams.away

];




for(const team of teams){


if(!team)
continue;




let players =
team.players;



for(const key in players){


let p =
players[key];



if(
String(
p.person.id
)
===
String(playerId)
){


return p.stats;


}


}


}



return null;


}









/*
=========================
HITTER SCORING
=========================
*/


function calculateHitterScore(stats){



if(!stats.batting)
return 0;



const b =
stats.batting;



let score = 0;



score +=
(b.hits || 0);



score +=
(b.doubles || 0)
*2;



score +=
(b.triples || 0)
*3;



score +=
(b.homeRuns || 0)
*4;



score +=
(b.rbi || 0);



score +=
(b.runs || 0);



score +=
(b.baseOnBalls || 0);



score +=
(b.stolenBases || 0)
*2;



score -=
(b.strikeOuts || 0)
*.5;



return Number(
score.toFixed(2)
);



}









/*
=========================
PITCHER SCORING
=========================
*/


function calculatePitcherScore(stats){



if(!stats.pitching)
return 0;



const p =
stats.pitching;



let score = 0;




let innings =
Number(
p.inningsPitched || 0
);



score +=
innings * 2;



score +=
(p.strikeOuts || 0);



if(p.wins)
score +=5;



if(
innings >= 6 &&
p.earnedRuns <=3
)
{
score +=3;
}




score -=
(p.earnedRuns || 0)
*2;



score -=
(p.hits || 0)
*.5;



score -=
(p.baseOnBalls || 0);



return Number(
score.toFixed(2)
);



}









/*
=========================
SAVE SCORE
=========================
*/


async function saveLiveScore(
playerScores,
totalScore
){



const playerId =
localStorage.getItem(
"playerId"
);



await db
.from(
"pick5PlayerGames"
)
.update({

playerScores,

totalScore,

lastUpdated:
new Date()

})
.eq(
"playerId",
playerId
)
.eq(
"date",
selectedDate
);



}









/*
=========================
DISPLAY
=========================
*/


function renderLiveScores(
scores,
total
){



const box =
document.getElementById(
"liveScore"
);



if(!box)
return;



box.innerHTML="";



Object.values(scores)
.forEach(player=>{


box.innerHTML += `

<div class="score-card">


<strong>
${player.stats?.playerName || ""}
</strong>


<br>

${player.score} pts


</div>


`;



});




box.innerHTML += `

<h3>
TOTAL:
${total.toFixed(2)}
</h3>

`;



}







window.startPick5LiveScoring =
startPick5LiveScoring;