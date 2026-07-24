// rating.js

document.addEventListener("DOMContentLoaded", () => {
    loadRatingLeaderboard();

    const backBtn = document.getElementById("backBtn");

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }
});


async function loadRatingLeaderboard() {

    const list = document.getElementById("ratingLeaderboardList");

    if (!list) return;

    list.innerHTML = "Loading...";


    const { data: players, error } = await db
        .from("playerData")
        .select("playerId, rating")
        .order("rating", { ascending: false });


    if (error) {
        console.error(error);
        list.innerHTML = "Failed to load leaderboard.";
        return;
    }


    list.innerHTML = "";


    for (const [index, player] of players
        .filter(player => player.playerId !== "andrew28r")
        .entries()) {


        // Load player games
        const { data: games, error: gameError } = await db
            .from("playerGames")
            .select("guessesNumber, hintClicks, win, completed")
            .eq("playerId", player.playerId);


        if (gameError) {
            console.error(gameError);
            continue;
        }


        const gamesPlayed = games.length;


        const gamesWon = games.filter(g =>
            g.win === true || g.win === "true"
        ).length;


        const gamesLost = games.filter(g =>
            (g.completed === true || g.completed === "true") &&
            (g.win === false || g.win === "false")
        ).length;


        const notFinished = games.filter(g =>
            (g.completed === false || g.completed === "false") &&
            (g.win === false || g.win === "false")
        ).length;


        const totalGuesses = games.reduce(
            (sum, g) => sum + Number(g.guessesNumber || 0),
            0
        );


        const totalHints = games.reduce(
            (sum, g) => sum + Number(g.hintClicks || 0),
            0
        );


        const avgGuesses = gamesPlayed
            ? (Number(totalGuesses) / gamesPlayed).toFixed(1)
            : "0.0";


        const avgHints = gamesPlayed
            ? (Number(totalHints) / gamesPlayed).toFixed(1)
            : "0.0";

        const row = document.createElement("div");

        row.className = "rating-row";


        row.innerHTML = `
            <span>${index + 1}</span>
            <span>${player.playerId}</span>
            <span>${Math.round(player.rating ?? 1000)}</span>
            <span>${gamesPlayed}</span>
            <span>${gamesWon}</span>
            <span>${gamesLost}</span>
            <span>${notFinished}</span>
            <span>${avgGuesses}</span>
            <span>${avgHints}</span>
        `;


        list.appendChild(row);
    }
}