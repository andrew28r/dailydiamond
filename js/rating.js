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
    const list = document.getElementById("leaderboardList");

    if (!list) return;

    list.innerHTML = "Loading...";

    const { data, error } = await db
        .from("playerData")
        .select("playerId, rating")
        .order("rating", { ascending: false });

    if (error) {
        console.error(error);
        list.innerHTML = "Failed to load leaderboard.";
        return;
    }

    list.innerHTML = "";

    data
        .filter(player => player.playerId !== "andrew28r")
        .forEach((player, index) => {
            const row = document.createElement("div");
            row.className = "leaderboard-row";

            row.innerHTML = `
                <span>${index + 1}</span>
                <span>${player.playerId}</span>
                <span>${Math.round(player.rating ?? 1000)}</span>
            `;

            list.appendChild(row);
        });
}
