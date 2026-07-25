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



window.db = db;
window.createPlayer = createPlayer;
window.playerGames = playerGames;
window.updateGamesPlayed = updateGamesPlayed;
window.getEasternDateString = getEasternDateString;