const supabaseUrl = "https://aqnlbvlfkkhqewvdcehu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbmxidmxma2tocWV3dmRjZWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDA4NTYsImV4cCI6MjA5ODg3Njg1Nn0.9Kw8ESBCDQGzqcg5lQnrl06DUr7-T7Ag8mmm2PzdWYI";

const db = supabase.createClient(
  supabaseUrl,
  supabaseKey
);


/* =========================
   PLAYER DATA
========================= */

async function createPlayer(playerId) {

  const { data: existingPlayer, error: checkError } = await db
    .from("playerData")
    .select("*")
    .eq("playerId", playerId)
    .maybeSingle();

  if (checkError) {
    console.error(checkError);
    return;
  }

  if (existingPlayer) {
    return existingPlayer;
  }


  const { data, error } = await db
    .from("playerData")
    .insert([
      {
        playerId,
        gamesPlayed: 0,
        wins: 0,
        streak: 0
      }
    ])
    .select()
    .single();


  if (error) {
    console.error(error);
    return;
  }

  return data;
}



/* =========================
   PLAYER GAMES
========================= */

async function playerGames(date) {

  const playerId = localStorage.getItem("playerId");

  if (!playerId) return null;


  const { data, error } = await db
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .eq("date", date)
    .maybeSingle();


  if (error) {
    console.error(error);
    return null;
  }

  return data;
}



async function updateGamesPlayed(playerId) {

  const { data: games, error } = await db
    .from("playerGames")
    .select("*")
    .eq("playerId", playerId)
    .order("date", {ascending:false});


  if (error) {
    console.error(error);
    return;
  }

  const completedGames = games;


  let gamesPlayed = completedGames.length;


  let wins = completedGames.filter(
    g => g.win === true ||
         g.win === "true"
  ).length;
  
  let streak = 0;

  let expectedDate = getEasternDateString();


  for (let i = 0; i < 100; i++) {

      const dayGame = games.find(
          g => g.date === expectedDate
      );


      // No game that day
      if (!dayGame) {
          break;
      }


      const isCompleted =
          dayGame.completed === true ||
          dayGame.completed === "true";


      const isWin =
          dayGame.win === true ||
          dayGame.win === "true";


      const isSameDay =
          dayGame.completedSameDay === true ||
          dayGame.completedSameDay === "true";


      // unfinished game breaks streak
      if (!isCompleted) {
          break;
      }


      // completed late breaks streak
      if (!isSameDay && expectedDate !== getEasternDateString()) {
          break;
      }


      // loss breaks streak
      if (!isWin) {
          break;
      }


      streak++;


      const d = new Date(expectedDate + "T00:00:00");
      d.setDate(d.getDate() - 1);

      expectedDate =
          d.toISOString().split("T")[0];
  }

    await db
    .from("playerData")
    .update({
        gamesPlayed: Number(gamesPlayed),
        wins: Number(wins),
        streak: Number(streak)
    })
    .eq("playerId", playerId);
}



function getEasternDateString(){

  const eastern = new Date(
    new Date().toLocaleString(
      "en-US",
      {
        timeZone:"America/New_York"
      }
    )
  );


  return [
    eastern.getFullYear(),
    String(eastern.getMonth()+1).padStart(2,"0"),
    String(eastern.getDate()).padStart(2,"0")
  ].join("-");
}



async function diamondlePlayerGames(date) {

  const playerId = localStorage.getItem("playerId");

  if (!playerId) return null;


  const { data, error } = await db
    .from("diamondlePlayerGames")
    .select("*")
    .eq("playerId", playerId)
    .eq("date", date)
    .maybeSingle();


  if (error) {
    console.error(error);
    return null;
  }


  return data;
}

/* =========================
   DIAMONDLE PLAYER DATA
========================= */

async function createDiamondlePlayer(playerId) {

  const { data: existingPlayer, error: checkError } = await db
    .from("diamondlePlayerData")
    .select("*")
    .eq("playerId", playerId)
    .maybeSingle();


  if (checkError) {
    console.error(checkError);
    return;
  }


  if (existingPlayer) {
    return existingPlayer;
  }


  const { data, error } = await db
    .from("diamondlePlayerData")
    .insert([
      {
        playerId,
        gamesPlayed: 0,
        wins: 0,
        streak: 0
      }
    ])
    .select()
    .single();


  if (error) {
    console.error(error);
    return;
  }


  return data;
}



/* =========================
   DIAMONDLE PLAYER GAMES
========================= */

async function diamondlePlayerGames(date) {

  const playerId = localStorage.getItem("playerId");

  if (!playerId) return null;


  const { data, error } = await db
    .from("diamondlePlayerGames")
    .select("*")
    .eq("playerId", playerId)
    .eq("date", date)
    .maybeSingle();


  if (error) {
    console.error(error);
    return null;
  }


  return data;
}



/* =========================
   UPDATE DIAMONDLE STATS
========================= */

async function updateDiamondleGamesPlayed(playerId) {

  const { data: games, error } = await db
    .from("diamondlePlayerGames")
    .select("*")
    .eq("playerId", playerId)
    .order("date", {ascending:false});


  if (error) {
    console.error(error);
    return;
  }


  let gamesPlayed = games.length;


  let wins = games.filter(
    g =>
      g.win === true ||
      g.win === "true"
  ).length;


  let streak = 0;

  let expectedDate = getEasternDateString();


  for(let i = 0; i < 100; i++) {


    const dayGame = games.find(
      g => g.date === expectedDate
    );


    if(!dayGame)
      break;


    const completed =
      dayGame.completed === true ||
      dayGame.completed === "true";


    const win =
      dayGame.win === true ||
      dayGame.win === "true";


    if(!completed || !win)
      break;


    streak++;


    const d =
      new Date(expectedDate + "T00:00:00");


    d.setDate(
      d.getDate() - 1
    );


    expectedDate =
      d.toISOString().split("T")[0];

  }



  await db
    .from("diamondlePlayerData")
    .update({
      gamesPlayed,
      wins,
      streak
    })
    .eq("playerId", playerId);

}


/* =========================
   PICK5 PLAYER DATA
========================= */


async function createPick5Player(playerId) {

  const { data: existingPlayer, error: checkError } = await db
    .from("pick5PlayerData")
    .select("*")
    .eq("playerId", playerId)
    .maybeSingle();


  if (checkError) {
    console.error(checkError);
    return;
  }


  if(existingPlayer){
    return existingPlayer;
  }


  const { data, error } = await db
    .from("pick5PlayerData")
    .insert([
      {
        playerId,
        gamesPlayed:0,
        totalScore:0,
        highScore:0,
        wins:0,
        streak:0
      }
    ])
    .select()
    .single();


  if(error){
    console.error(error);
    return;
  }


  return data;

}




/* =========================
   PICK5 PLAYER GAMES
========================= */


async function pick5PlayerGames(date){

    const playerId =
        localStorage.getItem("playerId");


    if(!playerId)
        return null;



    const {data,error} =
        await db
        .from("pick5PlayerGames")
        .select("*")
        .eq("playerId",playerId)
        .eq("date",date)
        .maybeSingle();



    if(error){
        console.error(error);
        return null;
    }


    return data;

}




/* =========================
   UPDATE PICK5 STATS
========================= */


async function updatePick5PlayerData(playerId){


    const {data:games,error} =
        await db
        .from("pick5PlayerGames")
        .select("*")
        .eq("playerId",playerId);



    if(error){
        console.error(error);
        return;
    }



    let gamesPlayed =
        games.length;



    let totalScore =
        games.reduce(
            (sum,g)=>
            sum + (g.score || 0),
            0
        );



    let highScore =
        Math.max(
            ...games.map(
                g=>g.score || 0
            ),
            0
        );



    let wins =
        games.filter(
            g=>g.score > 0
        ).length;



    await db
    .from("pick5PlayerData")
    .update({

        gamesPlayed,
        totalScore,
        highScore,
        wins

    })
    .eq("playerId",playerId);


}


window.createPick5Player =
    createPick5Player;

window.pick5PlayerGames =
    pick5PlayerGames;

window.updatePick5PlayerData =
    updatePick5PlayerData;

window.createDiamondlePlayer = createDiamondlePlayer;
window.diamondlePlayerGames = diamondlePlayerGames;
window.updateDiamondleGamesPlayed = updateDiamondleGamesPlayed;
window.db = db;
window.createPlayer = createPlayer;
window.playerGames = playerGames;
window.updateGamesPlayed = updateGamesPlayed;
window.getEasternDateString = getEasternDateString;





/* =========================================================
   TEAMMATE PLAYER DATA
========================================================= */

async function createTeammatePlayer(playerId) {

    if (!playerId) {
        console.error(
            "Cannot create Teammate player without playerId."
        );

        return null;
    }

    const playerIdString =
        String(playerId);


    const {
        data: existingPlayer,
        error: checkError
    } = await db
        .from("teammatePlayerData")
        .select("*")
        .eq(
            "playerId",
            playerIdString
        )
        .maybeSingle();


    if (checkError) {

        console.error(
            "Teammate player check error:",
            checkError
        );

        return null;
    }


    if (existingPlayer) {
        return existingPlayer;
    }


    const {
        data,
        error
    } = await db
        .from("teammatePlayerData")
        .insert([
            {
                playerId:
                    playerIdString,

                gamesplayed: 0,

                wins: 0,

                streak: 0,

                guest: true
            }
        ])
        .select()
        .single();


    if (error) {

        console.error(
            "Teammate player creation error:",
            error
        );

        return null;
    }


    console.log(
        "Teammate player created:",
        data
    );


    return data;
}


/* =========================================================
   TEAMMATE PLAYER GAMES
========================================================= */

async function teammatePlayerGames(date) {

    const playerId =
        localStorage.getItem("playerId");


    if (!playerId) {

        console.warn(
            "No playerId found while loading Teammate game."
        );

        return null;
    }


    const {
        data,
        error
    } = await db
        .from("teammatePlayerGames")
        .select("*")
        .eq(
            "playerId",
            String(playerId)
        )
        .eq(
            "date",
            date
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Teammate player game load error:",
            error
        );

        return null;
    }


    console.log(
        "Teammate saved game loaded:",
        data
    );


    return data;
}


/* =========================================================
   SAVE TEAMMATE PLAYER GAME
========================================================= */

async function saveTeammatePlayerGame(
    date,
    guesses,
    win,
    completed,
    completedSameDay
) {

    const playerId =
        localStorage.getItem("playerId");


    if (!playerId) {

        console.error(
            "No playerId found. " +
            "Teammate game cannot be saved."
        );

        return null;
    }


    const playerIdString =
        String(playerId);


    /* -----------------------------------------------------
       MAKE SURE PLAYER PROFILE EXISTS
    ----------------------------------------------------- */

    const playerProfile =
        await createTeammatePlayer(
            playerIdString
        );


    if (!playerProfile) {

        console.error(
            "Could not create/find Teammate player profile."
        );

        return null;
    }


    /* -----------------------------------------------------
       CLEAN GUESSES
    ----------------------------------------------------- */

    const cleanGuesses =
        Array.isArray(guesses)
            ? guesses
                .filter(
                    guess =>
                        guess &&
                        guess.player &&
                        guess.player.id
                )
                .map(
                    guess => ({

                        playerId:
                            Number(
                                guess.player.id
                            ),

                        playerName:
                            String(
                                guess.player.name ||
                                ""
                            ),

                        correct:
                            guess.correct === true,

                        intermediate:
                            guess.intermediate === true

                    })
                )
            : [];


    /* -----------------------------------------------------
       BUILD DATABASE ROW
    ----------------------------------------------------- */

    const payload = {

        playerId:
            playerIdString,

        date:
            date,

        guesses:
            cleanGuesses,

        guessesnumber:
            cleanGuesses.length,

        win:
            win === true,

        completed:
            completed === true,

        completedsameday:
            completedSameDay === true

    };


    console.log(
        "======================================"
    );

    console.log(
        "Saving Teammate game..."
    );

    console.log(
        "Payload:",
        payload
    );

    console.log(
        "======================================"
    );


    /* -----------------------------------------------------
       UPSERT
    ----------------------------------------------------- */

    const {
        data,
        error
    } = await db
        .from("teammatePlayerGames")
        .upsert(
            payload,
            {
                onConflict:
                    "playerId,date"
            }
        )
        .select()
        .single();


    /* -----------------------------------------------------
       HANDLE ERROR
    ----------------------------------------------------- */

    if (error) {

        console.error(
            "======================================"
        );

        console.error(
            "TEAMMATE GAME SAVE FAILED"
        );

        console.error(
            "Error:",
            error
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Details:",
            error.details
        );

        console.error(
            "Hint:",
            error.hint
        );

        console.error(
            "Payload:",
            payload
        );

        console.error(
            "======================================"
        );

        return null;
    }


    /* -----------------------------------------------------
       SUCCESS
    ----------------------------------------------------- */

    console.log(
        "======================================"
    );

    console.log(
        "TEAMMATE GAME SAVED SUCCESSFULLY"
    );

    console.log(
        data
    );

    console.log(
        "======================================"
    );


    /* -----------------------------------------------------
       UPDATE LIFETIME STATS
    ----------------------------------------------------- */

    if (completed === true) {

        await updateTeammatePlayerData(
            playerIdString
        );

    }


    return data;
}


/* =========================================================
   UPDATE TEAMMATE PLAYER DATA
========================================================= */

async function updateTeammatePlayerData(
    playerId
) {

    if (!playerId) {
        return;
    }


    const playerIdString =
        String(playerId);


    const {
        data: games,
        error
    } = await db
        .from("teammatePlayerGames")
        .select("*")
        .eq(
            "playerId",
            playerIdString
        )
        .order(
            "date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Teammate player games stats error:",
            error
        );

        return;
    }


    const allGames =
        Array.isArray(games)
            ? games
            : [];


    /* -----------------------------------------------------
       GAMES PLAYED
    ----------------------------------------------------- */

    const gamesPlayed =
        allGames.length;


    /* -----------------------------------------------------
       WINS
    ----------------------------------------------------- */

    const wins =
        allGames.filter(
            game =>
                game.win === true ||
                game.win === "true"
        ).length;


    /* -----------------------------------------------------
       STREAK
    ----------------------------------------------------- */

    let streak = 0;


    let expectedDate =
        getEasternDateString();


    for (
        let i = 0;
        i < 100;
        i++
    ) {

        const dayGame =
            allGames.find(
                game =>
                    game.date ===
                    expectedDate
            );


        if (!dayGame) {
            break;
        }


        const completed =
            dayGame.completed === true ||
            dayGame.completed === "true";


        const win =
            dayGame.win === true ||
            dayGame.win === "true";


        const completedSameDay =
            dayGame.completedsameday === true ||
            dayGame.completedsameday === "true";


        if (!completed) {
            break;
        }


        /*
         * Today's game is allowed automatically.
         *
         * Previous games must have been completed
         * on their actual game date.
         */

        if (
            expectedDate !==
                getEasternDateString() &&
            !completedSameDay
        ) {

            break;
        }


        /*
         * A loss breaks the streak.
         */

        if (!win) {
            break;
        }


        streak++;


        /*
         * Move to previous day.
         */

        const [
            year,
            month,
            day
        ] =
            expectedDate
                .split("-")
                .map(Number);


        const previousDate =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );


        previousDate.setUTCDate(
            previousDate.getUTCDate() - 1
        );


        expectedDate =
            [
                previousDate.getUTCFullYear(),

                String(
                    previousDate.getUTCMonth() + 1
                ).padStart(2, "0"),

                String(
                    previousDate.getUTCDate()
                ).padStart(2, "0")

            ].join("-");
    }


    /* -----------------------------------------------------
       UPDATE TEAMMATE PLAYER DATA
    ----------------------------------------------------- */

    const {
        error: updateError
    } = await db
        .from("teammatePlayerData")
        .upsert(
            {
                playerId:
                    playerIdString,

                gamesplayed:
                    Number(
                        gamesPlayed
                    ),

                wins:
                    Number(
                        wins
                    ),

                streak:
                    Number(
                        streak
                    )
            },
            {
                onConflict:
                    "playerId"
            }
        );


    if (updateError) {

        console.error(
            "Teammate player data update error:",
            updateError
        );

        return;
    }


    console.log(
        "Teammate player stats updated:",
        {
            playerId:
                playerIdString,

            gamesPlayed,

            wins,

            streak
        }
    );
}


/* =========================================================
   TEAMMATE GLOBAL FUNCTIONS
========================================================= */

window.createTeammatePlayer =
    createTeammatePlayer;


window.teammatePlayerGames =
    teammatePlayerGames;


window.saveTeammatePlayerGame =
    saveTeammatePlayerGame;


window.updateTeammatePlayerData =
    updateTeammatePlayerData;