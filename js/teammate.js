/* =========================================================
   DAILY DIAMOND
   TEAMMATE CONNECTION
========================================================= */

"use strict";


/* =========================================================
   API
========================================================= */

const TEAMMATE_API =
    "https://statsapi.mlb.com/api/v1";


/* =========================================================
   GAME STATE
========================================================= */

let teammateStartPlayer = null;

let teammateEndPlayer = null;

let teammatePath = [];

let teammateGuesses = [];

let teammatePlayers = [];

let teammatePlayerCache = new Map();

let teammateTeamCache = new Map();

let teammateSearchTimeout = null;

let teammateLocked = false;

let teammateOutcome = null;

let teammateSelectedSearchIndex = -1;

let teammateInitialized = false;


/* =========================================================
   DOM
========================================================= */

const teammateSearch =
    document.getElementById("search");

const teammateDropdown =
    document.getElementById("dropdown");

const teammateBoard =
    document.getElementById("board");

const teammateMessage =
    document.getElementById("message");

const teammateGuessNumber =
    document.getElementById("guessNumber");

const teammateGameDate =
    document.getElementById("gameDate");

const teammateGameTitle =
    document.getElementById("gameTitle");

const teammateMenu =
    document.getElementById("menu");

const teammateMenuBtn =
    document.getElementById("menuBtn");

const teammateBackBtn =
    document.getElementById("backBtn");

const teammateGiveUpBtn =
    document.getElementById("giveUpBtn");

const teammateWinPopup =
    document.getElementById("winPopup");

const teammateWinTitle =
    document.getElementById("winTitle");

const teammateScoreStats =
    document.getElementById("scoreStats");

const teammateLeaderboardPopup =
    document.getElementById("leaderboardPopup");

const teammateLeaderboardBtn =
    document.getElementById("leaderboardBtn");

const teammateCloseLeaderboardBtn =
    document.getElementById("closeLeaderboardBtn");

const teammateShareResultsBtn =
    document.getElementById("shareResultsBtn");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setGameDate();

        setupEvents();

        renderLoadingBoard();

        await initializeTeammateGame();

    }
);


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    if (teammateSearch) {

        teammateSearch.addEventListener(
            "input",
            handleSearchInput
        );


        teammateSearch.addEventListener(
            "keydown",
            handleSearchKeyboard
        );

    }


    document.addEventListener(
        "click",
        handleDocumentClick
    );


    if (teammateMenuBtn) {

        teammateMenuBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                if (!teammateMenu) {
                    return;
                }

                teammateMenu.classList.toggle(
                    "hidden"
                );

            }
        );

    }


    if (teammateGiveUpBtn) {

        teammateGiveUpBtn.addEventListener(
            "click",
            giveUp
        );

    }


    if (teammateBackBtn) {

        teammateBackBtn.addEventListener(
            "click",
            () => {

                window.history.back();

            }
        );

    }


    if (teammateShareResultsBtn) {

        teammateShareResultsBtn.addEventListener(
            "click",
            shareResults
        );

    }


    if (teammateLeaderboardBtn) {

        teammateLeaderboardBtn.addEventListener(
            "click",
            openLeaderboard
        );

    }


    if (teammateCloseLeaderboardBtn) {

        teammateCloseLeaderboardBtn.addEventListener(
            "click",
            closeLeaderboard
        );

    }


    if (teammateLeaderboardPopup) {

        teammateLeaderboardPopup.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    teammateLeaderboardPopup
                ) {

                    closeLeaderboard();

                }

            }
        );

    }

}


/* =========================================================
   DATE
========================================================= */

function getEasternDateString() {

    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "America/New_York",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        );


    return formatter.format(
        new Date()
    );

}


function setGameDate() {

    if (!teammateGameDate) {
        return;
    }


    const date =
        getEasternDateString();


    const parts =
        date.split("-");


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    const day =
        Number(parts[2]);


    const display =
        new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );


    teammateGameDate.textContent =
        display;

}


/* =========================================================
   SEEDED RANDOM
========================================================= */

function teammateSeedFromDate(dateString) {

    let hash = 0;


    for (
        let i = 0;
        i < dateString.length;
        i++
    ) {

        hash =
            ((hash << 5) - hash) +
            dateString.charCodeAt(i);

        hash |= 0;

    }


    return Math.abs(hash);

}


function seededRandom(seed) {

    const x =
        Math.sin(seed) * 10000;


    return (
        x -
        Math.floor(x)
    );

}


/* =========================================================
   SEEDED SHUFFLE
========================================================= */

function seededShuffle(
    array,
    seed
) {

    const result =
        [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const random =
            seededRandom(
                seed + i
            );


        const j =
            Math.floor(
                random * (i + 1)
            );


        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }


    return result;

}


/* =========================================================
   DAILY PLAYER POOL
========================================================= */

const TEAMMATE_DAILY_PLAYERS = [

    110987, // Albert Pujols
    115732, // Mike Trout
    112526, // Miguel Cabrera
    121474, // Justin Verlander
    114777, // Max Scherzer
    118162, // Clayton Kershaw
    112391, // Zack Greinke
    115629, // Carlos Beltran
    120074, // Freddie Freeman
    121578, // Mookie Betts
    518692, // Bryce Harper
    519317, // Nolan Arenado
    592206, // Paul Goldschmidt
    543685, // Manny Machado
    592450, // Jose Altuve
    457759, // Justin Upton
    434378, // Robinson Cano
    519203  // Andrew McCutchen

];


/* =========================================================
   INITIALIZE GAME
========================================================= */

async function initializeTeammateGame() {

    try {

        teammateGameTitle.textContent =
            "Teammate Connection";


        const date =
            getEasternDateString();


        const seed =
            teammateSeedFromDate(
                date
            );


        const uniqueIds =
            [
                ...new Set(
                    TEAMMATE_DAILY_PLAYERS
                )
            ];


        const shuffledIds =
            seededShuffle(
                uniqueIds,
                seed
            );


        showMessage(
            "Loading today's connection...",
            false
        );


        const loadedPlayers =
            [];


        /*
         * Load player information.
         */

        for (
            const id of shuffledIds
        ) {

            const player =
                await getPlayer(id);


            if (player) {

                loadedPlayers.push(
                    player
                );

            }

        }


        if (
            loadedPlayers.length < 2
        ) {

            throw new Error(
                "Unable to load enough players."
            );

        }


        /*
         * Find a pair that actually
         * has a teammate connection.
         */

        const foundPair =
            await findDailyPair(
                loadedPlayers
            );


        if (!foundPair) {

            throw new Error(
                "Could not find a valid teammate connection."
            );

        }


        teammateStartPlayer =
            foundPair.start;


        teammateEndPlayer =
            foundPair.end;


        teammatePath = [

            teammateStartPlayer,

            null,

            teammateEndPlayer

        ];


        teammateGuesses = [];


        teammateLocked = false;

        teammateOutcome = null;


        renderBoard();

        updateGuessCount();


        /*
         * Enable search only after
         * the game is ready.
         */

        if (teammateSearch) {

            teammateSearch.disabled =
                false;

            teammateSearch.focus();

        }


        clearMessage();


        teammateInitialized =
            true;

    }
    catch (error) {

        console.error(
            "Teammate game failed:",
            error
        );


        showMessage(
            "Unable to load today's game.",
            true
        );


        if (teammateSearch) {

            teammateSearch.disabled =
                true;

        }

    }

}


/* =========================================================
   FIND DAILY PAIR
========================================================= */

async function findDailyPair(
    players
) {

    /*
     * Try pairs in deterministic order.
     *
     * This guarantees that everyone receives
     * the same pair on the same date.
     */

    for (
        let i = 0;
        i < players.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < players.length;
            j++
        ) {

            const playerA =
                players[i];


            const playerB =
                players[j];


            const connected =
                await werePlayersTeammates(
                    playerA.id,
                    playerB.id
                );


            if (connected) {

                return {

                    start:
                        playerA,

                    end:
                        playerB

                };

            }

        }

    }


    return null;

}


/* =========================================================
   GET PLAYER
========================================================= */

async function getPlayer(
    playerId
) {

    if (
        teammatePlayerCache.has(
            playerId
        )
    ) {

        return teammatePlayerCache.get(
            playerId
        );

    }


    try {

        const response =
            await fetch(
                `${TEAMMATE_API}/people/${playerId}`
            );


        if (!response.ok) {

            return null;

        }


        const data =
            await response.json();


        if (
            !data.people ||
            !data.people.length
        ) {

            return null;

        }


        const raw =
            data.people[0];


        const player = {

            id:
                raw.id,

            name:
                raw.fullName ||
                `${raw.firstName || ""} ${raw.lastName || ""}`.trim(),

            firstName:
                raw.firstName || "",

            lastName:
                raw.lastName || "",

            birthDate:
                raw.birthDate || null,

            primaryPosition:
                raw.primaryPosition?.abbreviation ||
                raw.primaryPosition?.name ||
                "",

            raw

        };


        teammatePlayerCache.set(
            playerId,
            player
        );


        return player;

    }
    catch (error) {

        console.error(
            "Player fetch error:",
            error
        );


        return null;

    }

}


/* =========================================================
   PLAYER SEARCH
========================================================= */

async function searchPlayers(
    value
) {

    const query =
        value.trim();


    if (
        query.length < 2
    ) {

        teammatePlayers = [];

        teammateSelectedSearchIndex =
            -1;

        hideDropdown();

        return;

    }


    try {

        const response =
            await fetch(
                `${TEAMMATE_API}/people/search?names=${encodeURIComponent(query)}`
            );


        if (!response.ok) {

            hideDropdown();

            return;

        }


        const data =
            await response.json();


        const people =
            Array.isArray(data.people)
                ? data.people
                : [];


        const results =
            people
                .filter(
                    person =>
                        person &&
                        person.id
                )
                .map(
                    person => ({

                        id:
                            person.id,

                        name:
                            person.fullName ||
                            `${person.firstName || ""} ${person.lastName || ""}`.trim(),

                        firstName:
                            person.firstName || "",

                        lastName:
                            person.lastName || "",

                        primaryPosition:
                            person.primaryPosition?.abbreviation ||
                            person.primaryPosition?.name ||
                            "",

                        birthDate:
                            person.birthDate || null,

                        raw:
                            person

                    })
                );


        /*
         * Remove duplicate IDs.
         */

        const seen =
            new Set();


        teammatePlayers =
            results.filter(
                player => {

                    if (
                        seen.has(
                            player.id
                        )
                    ) {

                        return false;

                    }


                    seen.add(
                        player.id
                    );


                    return true;

                }
            );


        /*
         * Never display players already
         * present in the connection.
         */

        teammatePlayers =
            teammatePlayers.filter(
                player => {

                    if (
                        teammateStartPlayer &&
                        player.id ===
                        teammateStartPlayer.id
                    ) {

                        return false;

                    }


                    if (
                        teammateEndPlayer &&
                        player.id ===
                        teammateEndPlayer.id
                    ) {

                        return false;

                    }


                    return !teammatePath.some(
                        existing =>
                            existing &&
                            existing.id ===
                            player.id
                    );

                }
            );


        teammatePlayers =
            teammatePlayers.slice(
                0,
                8
            );


        teammateSelectedSearchIndex =
            -1;


        renderDropdown();

    }
    catch (error) {

        console.error(
            "Player search error:",
            error
        );


        hideDropdown();

    }

}


/* =========================================================
   SEARCH INPUT
========================================================= */

function handleSearchInput(
    event
) {

    if (teammateLocked) {
        return;
    }


    const value =
        event.target.value;


    clearTimeout(
        teammateSearchTimeout
    );


    teammateSearchTimeout =
        setTimeout(
            () => {

                searchPlayers(
                    value
                );

            },
            200
        );

}


/* =========================================================
   SEARCH KEYBOARD
========================================================= */

function handleSearchKeyboard(
    event
) {

    if (
        event.key === "Escape"
    ) {

        hideDropdown();

        return;

    }


    if (
        !teammatePlayers.length
    ) {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

        }

        return;

    }


    if (
        event.key === "ArrowDown"
    ) {

        event.preventDefault();


        teammateSelectedSearchIndex =
            Math.min(
                teammateSelectedSearchIndex + 1,
                teammatePlayers.length - 1
            );


        highlightDropdownItem();

        return;

    }


    if (
        event.key === "ArrowUp"
    ) {

        event.preventDefault();


        teammateSelectedSearchIndex =
            Math.max(
                teammateSelectedSearchIndex - 1,
                0
            );


        highlightDropdownItem();

        return;

    }


    if (
        event.key === "Enter"
    ) {

        event.preventDefault();


        const selected =
            teammatePlayers[
                teammateSelectedSearchIndex >= 0
                    ? teammateSelectedSearchIndex
                    : 0
            ];


        if (selected) {

            selectPlayer(
                selected
            );

        }

    }

}


/* =========================================================
   HIGHLIGHT SEARCH ITEM
========================================================= */

function highlightDropdownItem() {

    if (!teammateDropdown) {
        return;
    }


    const items =
        teammateDropdown.querySelectorAll(
            ".item"
        );


    items.forEach(
        (item, index) => {

            item.classList.toggle(
                "selected",
                index ===
                teammateSelectedSearchIndex
            );

        }
    );

}


/* =========================================================
   RENDER DROPDOWN
========================================================= */

function renderDropdown() {

    if (!teammateDropdown) {
        return;
    }

    teammateDropdown.innerHTML = "";

    if (!teammatePlayers.length) {
        teammateDropdown.style.display = "none";
        return;
    }

    teammatePlayers.forEach((player, index) => {

        const item =
            document.createElement("div");

        item.className = "item";


        /* -----------------------------------------
           MLB PLAYER HEADSHOT
        ----------------------------------------- */

        const headshot =
            document.createElement("img");

        headshot.src =
            getHeadshot(player.id);

        headshot.className =
            "dropdown-headshot";

        headshot.alt =
            player.name;


        /*
         * Same MLB default/template headshot
         * used by your other Daily Diamond game.
         */

        headshot.onerror = () => {

            headshot.onerror = null;

            headshot.src =
                "https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/default/headshot/0/current";

        };


        /* -----------------------------------------
           PLAYER NAME
        ----------------------------------------- */

        const name =
            document.createElement("span");

        name.textContent =
            player.name;


        /* -----------------------------------------
           BUILD DROPDOWN ITEM
        ----------------------------------------- */

        item.appendChild(
            headshot
        );

        item.appendChild(
            name
        );


        /* -----------------------------------------
           SELECT PLAYER
        ----------------------------------------- */

        item.addEventListener(
            "click",
            () => {

                selectPlayer(
                    player
                );

            }
        );


        teammateDropdown.appendChild(
            item
        );

    });


    teammateDropdown.style.display =
        "block";

}


/* =========================================================
   SELECT PLAYER
========================================================= */

async function selectPlayer(
    player
) {

    if (
        teammateLocked ||
        !teammateInitialized
    ) {

        return;

    }


    if (
        !player ||
        !player.id
    ) {

        return;

    }


    hideDropdown();


    if (teammateSearch) {

        teammateSearch.value =
            "";

    }


    /*
     * End Player cannot be guessed.
     */

    if (
        teammateEndPlayer &&
        player.id ===
        teammateEndPlayer.id
    ) {

        showMessage(
            "The End Player is automatically checked.",
            true
        );

        return;

    }


    /*
     * Start Player cannot be guessed.
     */

    if (
        teammateStartPlayer &&
        player.id ===
        teammateStartPlayer.id
    ) {

        showMessage(
            "You already have that player.",
            true
        );

        return;

    }


    /*
     * No duplicate guesses.
     */

    if (
        teammatePath.some(
            existing =>
                existing &&
                existing.id ===
                player.id
        )
    ) {

        showMessage(
            "You already used that player.",
            true
        );

        return;

    }


    const currentPlayer =
        getCurrentConnectionPlayer();


    if (!currentPlayer) {

        return;

    }


    /*
     * Count every submitted guess.
     */

    teammateGuesses.push({

        player,

        correct: false,

        intermediate: false

    });


    updateGuessCount();


    showMessage(
        "Checking teammate connection...",
        false
    );


    /*
     * Check whether the guess connects
     * to the current player.
     */

    const connectsToCurrent =
        await werePlayersTeammates(
            currentPlayer.id,
            player.id
        );


    if (!connectsToCurrent) {

        showMessage(
            `${player.name} was not a teammate of ${currentPlayer.name}.`,
            true
        );


        return;

    }


    /*
     * Check whether the guessed player
     * connects directly to the End Player.
     */

    showMessage(
        "Connection found. Checking the End Player...",
        false
    );


    const connectsToEnd =
        await werePlayersTeammates(
            player.id,
            teammateEndPlayer.id
        );


    /*
     * =====================================================
     * DIRECT WIN
     *
     * Start
     *   ↓
     * Guess
     *   ↓
     * End
     * =====================================================
     */

    if (connectsToEnd) {

        const lastGuess =
            teammateGuesses[
                teammateGuesses.length - 1
            ];


        lastGuess.correct =
            true;


        lastGuess.intermediate =
            false;


        const blankIndex =
            teammatePath.findIndex(
                item =>
                    item === null
            );


        if (
            blankIndex >= 0
        ) {

            teammatePath.splice(
                blankIndex,
                1,
                player
            );

        }


        teammateLocked =
            true;


        teammateOutcome =
            "win";


        renderBoard();


        showMessage(
            `${player.name} connects ${currentPlayer.name} to ${teammateEndPlayer.name}!`,
            false
        );


        showResult();


        return;

    }


    /*
     * =====================================================
     * CORRECT INTERMEDIATE PLAYER
     *
     * Start
     *   ↓
     * Guess
     *   ↓
     * Blank
     *   ↓
     * End
     * =====================================================
     */

    const lastGuess =
        teammateGuesses[
            teammateGuesses.length - 1
        ];


    lastGuess.correct =
        true;


    lastGuess.intermediate =
        true;


    const blankIndex =
        teammatePath.findIndex(
            item =>
                item === null
        );


    if (
        blankIndex >= 0
    ) {

        teammatePath.splice(
            blankIndex,
            1,
            player,
            null
        );

    }
    else {

        const endIndex =
            teammatePath.findIndex(
                item =>
                    item &&
                    item.id ===
                    teammateEndPlayer.id
            );


        if (
            endIndex >= 0
        ) {

            teammatePath.splice(
                endIndex,
                0,
                player,
                null
            );

        }

    }


    renderBoard();


    showMessage(
        `${player.name} connects to ${currentPlayer.name}. Keep going!`,
        false
    );

}


/* =========================================================
   CURRENT PLAYER
========================================================= */

function getCurrentConnectionPlayer() {

    if (!teammateStartPlayer) {
        return null;
    }


    /*
     * Walk backwards until we find the last
     * actual player before the End Player.
     */

    for (
        let i = teammatePath.length - 1;
        i >= 0;
        i--
    ) {

        const player =
            teammatePath[i];


        if (
            !player
        ) {

            continue;

        }


        if (
            teammateEndPlayer &&
            player.id ===
            teammateEndPlayer.id
        ) {

            continue;

        }


        return player;

    }


    return teammateStartPlayer;

}


/* =========================================================
   TEAMMATE CHECK
========================================================= */

async function werePlayersTeammates(
    playerAId,
    playerBId
) {

    if (
        !playerAId ||
        !playerBId
    ) {

        return false;

    }


    if (
        playerAId === playerBId
    ) {

        return false;

    }


    const [
        teamsA,
        teamsB
    ] =
    await Promise.all([

        getPlayerTeams(
            playerAId
        ),

        getPlayerTeams(
            playerBId
        )

    ]);


    if (
        !teamsA.length ||
        !teamsB.length
    ) {

        return false;

    }


    const teamSet =
        new Set();


    for (
        const item of teamsA
    ) {

        teamSet.add(
            `${item.teamId}-${item.year}`
        );

    }


    return teamsB.some(
        item =>
            teamSet.has(
                `${item.teamId}-${item.year}`
            )
    );

}


/* =========================================================
   GET PLAYER TEAMS
========================================================= */

async function getPlayerTeams(
    playerId
) {

    if (
        teammateTeamCache.has(
            playerId
        )
    ) {

        return teammateTeamCache.get(
            playerId
        );

    }


    try {

        const allTeams =
            [];


        /*
         * Hitting history.
         */

        const hittingURL =
            `${TEAMMATE_API}/people/${playerId}/stats` +
            `?stats=yearByYear` +
            `&group=hitting` +
            `&hydrate=team`;


        /*
         * Pitching history.
         */

        const pitchingURL =
            `${TEAMMATE_API}/people/${playerId}/stats` +
            `?stats=yearByYear` +
            `&group=pitching` +
            `&hydrate=team`;


        const [
            hittingResponse,
            pitchingResponse
        ] =
        await Promise.all([

            fetch(hittingURL),

            fetch(pitchingURL)

        ]);


        if (
            hittingResponse.ok
        ) {

            const hittingData =
                await hittingResponse.json();


            extractTeamSplits(
                hittingData,
                allTeams
            );

        }


        if (
            pitchingResponse.ok
        ) {

            const pitchingData =
                await pitchingResponse.json();


            extractTeamSplits(
                pitchingData,
                allTeams
            );

        }


        /*
         * Remove duplicate
         * team/year combinations.
         */

        const unique =
            [];


        const seen =
            new Set();


        for (
            const item of allTeams
        ) {

            const key =
                `${item.teamId}-${item.year}`;


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);


            unique.push(
                item
            );

        }


        teammateTeamCache.set(
            playerId,
            unique
        );


        return unique;

    }
    catch (error) {

        console.error(
            "Team history error:",
            error
        );


        teammateTeamCache.set(
            playerId,
            []
        );


        return [];

    }

}


/* =========================================================
   EXTRACT TEAM SPLITS
========================================================= */

function extractTeamSplits(
    data,
    result
) {

    if (
        !data ||
        !Array.isArray(
            data.stats
        )
    ) {

        return;

    }


    for (
        const stat of data.stats
    ) {

        if (
            !Array.isArray(
                stat.splits
            )
        ) {

            continue;

        }


        for (
            const split of stat.splits
        ) {

            const year =
                Number(
                    split.season
                );


            const teamId =
                Number(
                    split.team?.id
                );


            if (
                year &&
                teamId
            ) {

                result.push({

                    year,

                    teamId

                });

            }

        }

    }

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

    if (!teammateBoard) {
        return;
    }

    teammateBoard.innerHTML = "";

    for (
        let i = 0;
        i < teammatePath.length;
        i++
    ) {

        const player =
            teammatePath[i];


        /* =========================================
           BLANK PLAYER
        ========================================== */

        if (!player) {

            const blank =
                document.createElement("div");

            blank.className =
                "teammate-row blank-player";

            blank.innerHTML = `

                <div class="blank-player-content">
                    Blank Player
                </div>

            `;

            teammateBoard.appendChild(
                blank
            );


            if (
                i <
                teammatePath.length - 1
            ) {

                appendArrow();

            }

            continue;

        }


        /* =========================================
           DETERMINE PLAYER TYPE
        ========================================== */

        let rowClass =
            "guess-player";

        let label =
            "";


        /* -----------------------------------------
           START
        ----------------------------------------- */

        if (
            teammateStartPlayer &&
            player.id ===
            teammateStartPlayer.id
        ) {

            rowClass =
                "start-player";

            label =
                "Start";

        }


        /* -----------------------------------------
           END
        ----------------------------------------- */

        else if (
            teammateEndPlayer &&
            player.id ===
            teammateEndPlayer.id
        ) {

            rowClass =
                "end-player";

            label =
                "End";

        }


        /* =========================================
           ROW
        ========================================== */

        const row =
            document.createElement("div");

        row.className =
            `teammate-row ${rowClass}`;


        /* =========================================
           PLAYER
        ========================================== */

        const playerWrapper =
            document.createElement("div");

        playerWrapper.className =
            "teammate-player";


        /* =========================================
           HEADSHOT
        ========================================== */

        const headshot =
            document.createElement("img");

        headshot.className =
            "teammate-headshot";

        headshot.src =
            getHeadshot(player.id);

        headshot.alt =
            player.name;


        /*
         * Same MLB default/template headshot
         * as the other Daily Diamond game.
         */

        headshot.onerror = () => {

            headshot.onerror = null;

            headshot.src =
                "https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/default/headshot/0/current";

        };


        /* =========================================
           PLAYER INFO
        ========================================== */

        const info =
            document.createElement("div");

        info.className =
            "teammate-player-info";


        const name =
            document.createElement("div");

        name.className =
            "teammate-player-name";

        name.textContent =
            player.name;

/*
        const subtext =
            document.createElement("div");

        subtext.className =
            "teammate-player-subtext";

        subtext.textContent =
            getPlayerSubtext(player);
        */

        info.appendChild(
            name
        );
/*
        info.appendChild(
            subtext
        );
*/

        playerWrapper.appendChild(
            headshot
        );

        playerWrapper.appendChild(
            info
        );


        /* =========================================
           LABEL
           
           ONLY START AND END GET A LABEL.
           GUESSED PLAYERS HAVE NOTHING.
        ========================================== */

        if (label) {

            const labelElement =
                document.createElement("div");

            labelElement.className =
                "teammate-row-label";

            labelElement.textContent =
                label;

            row.appendChild(
                playerWrapper
            );

            row.appendChild(
                labelElement
            );

        }
        else {

            row.appendChild(
                playerWrapper
            );

        }


        teammateBoard.appendChild(
            row
        );


        /* =========================================
           ARROW
        ========================================== */

        if (
            i <
            teammatePath.length - 1
        ) {

            appendArrow();

        }

    }

}


/* =========================================================
   APPEND ARROW
========================================================= */

function appendArrow() {

    const arrow =
        document.createElement(
            "div"
        );


    arrow.className =
        "teammate-connection-arrow";


    arrow.textContent =
        "↓";


    teammateBoard.appendChild(
        arrow
    );

}


/* =========================================================
   PLAYER SUBTEXT
========================================================= */
/*
function getPlayerSubtext(
    player
) {

    if (
        player.primaryPosition
    ) {

        return player.primaryPosition;

    }


    return "MLB Player";

}
*/
function getPlayerSubtext(player) {
    return "";
}

/* =========================================================
   HEADSHOT
========================================================= */

function getHeadshot(playerId){

  return (
    `https://img.mlbstatic.com/mlb/images/players/head_shot/${playerId}.jpg`
  );

}


/* =========================================================
   LOADING BOARD
========================================================= */

function renderLoadingBoard() {

    if (!teammateBoard) {
        return;
    }


    teammateBoard.innerHTML = `

        <div class="teammate-row start-player">

            <div class="teammate-player">

                <div class="teammate-player-info">

                    <div class="teammate-player-name">
                        Loading...
                    </div>

                </div>

            </div>

            <div class="teammate-row-label">
                Start Player
            </div>

        </div>


        <div class="teammate-connection-arrow">
            ↓
        </div>


        <div class="teammate-row blank-player">

            <div class="blank-player-content">
                Blank Player
            </div>

        </div>


        <div class="teammate-connection-arrow">
            ↓
        </div>


        <div class="teammate-row end-player">

            <div class="teammate-player">

                <div class="teammate-player-info">

                    <div class="teammate-player-name">
                        Loading...
                    </div>

                </div>

            </div>

            <div class="teammate-row-label">
                End Player
            </div>

        </div>

    `;

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    text,
    error = false
) {

    if (!teammateMessage) {
        return;
    }


    teammateMessage.textContent =
        text;


    teammateMessage.className =
        "message";


    if (error) {

        teammateMessage.classList.add(
            "teammate-error"
        );

    }
    else {

        teammateMessage.classList.add(
            "teammate-success"
        );

    }

}


/* =========================================================
   CLEAR MESSAGE
========================================================= */

function clearMessage() {

    if (
        teammateMessage
    ) {

        teammateMessage.textContent =
            "";


        teammateMessage.className =
            "message";

    }

}


/* =========================================================
   HIDE DROPDOWN
========================================================= */

function hideDropdown() {

    if (
        teammateDropdown
    ) {

        teammateDropdown.style.display =
            "none";

    }


    teammateSelectedSearchIndex =
        -1;

}


/* =========================================================
   DOCUMENT CLICK
========================================================= */

function handleDocumentClick(
    event
) {

    if (
        teammateDropdown &&
        !teammateDropdown.contains(
            event.target
        ) &&
        event.target !== teammateSearch
    ) {

        hideDropdown();

    }


    if (
        teammateMenu &&
        teammateMenuBtn &&
        !teammateMenu.contains(
            event.target
        ) &&
        event.target !== teammateMenuBtn
    ) {

        teammateMenu.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   GUESS COUNT
========================================================= */

function updateGuessCount() {

    if (
        teammateGuessNumber
    ) {

        teammateGuessNumber.textContent =
            teammateGuesses.length;

    }

}


/* =========================================================
   GIVE UP
========================================================= */

function giveUp() {

    if (
        teammateLocked
    ) {

        return;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to give up?"
        );


    if (!confirmed) {

        return;

    }


    teammateLocked =
        true;


    teammateOutcome =
        "giveup";


    if (
        teammateMenu
    ) {

        teammateMenu.classList.add(
            "hidden"
        );

    }


    if (teammateSearch) {

        teammateSearch.disabled =
            true;

    }


    hideDropdown();


    showResult();

}


/* =========================================================
   RESULT
========================================================= */

function showResult() {

    if (
        !teammateWinPopup
    ) {

        return;

    }


    if (
        teammateWinTitle
    ) {

        if (
            teammateOutcome ===
            "win"
        ) {

            teammateWinTitle.textContent =
                "You Win!";

        }
        else {

            teammateWinTitle.textContent =
                "You Gave Up!";

        }

    }


    const correctConnections =
        teammateGuesses.filter(
            guess =>
                guess.correct
        ).length;


    teammateScoreStats.innerHTML = `

        <div class="score-row">

            <span>
                Connections:
            </span>

            <strong>
                ${correctConnections}
            </strong>

        </div>


        <div class="score-row">

            <span>
                Guesses:
            </span>

            <strong>
                ${teammateGuesses.length}
            </strong>

        </div>

    `;


    teammateWinPopup.style.display =
        "block";

}


/* =========================================================
   SHARE
========================================================= */

async function shareResults() {

    const path =
        teammatePath
            .filter(
                player =>
                    player
            )
            .map(
                player =>
                    player.name
            );


    let text =
        "Daily Diamond - Teammate Connection\n\n";


    text +=
        path.join(
            " → "
        );


    text +=
        `\n\nGuesses: ${teammateGuesses.length}`;


    if (
        teammateOutcome ===
        "win"
    ) {

        text +=
            "\nResult: 🟩";

    }
    else {

        text +=
            "\nResult: ⬛";

    }


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "Daily Diamond - Teammate Connection",

                text

            });

            return;

        }


        if (
            navigator.clipboard
        ) {

            await navigator.clipboard.writeText(
                text
            );


            showMessage(
                "Results copied!",
                false
            );


            return;

        }


        window.prompt(
            "Copy your results:",
            text
        );

    }
    catch (error) {

        /*
         * User cancelling native share
         * should not show an error.
         */

        if (
            error?.name ===
            "AbortError"
        ) {

            return;

        }


        window.prompt(
            "Copy your results:",
            text
        );

    }

}


/* =========================================================
   LEADERBOARD
========================================================= */

function openLeaderboard() {

    if (
        !teammateLeaderboardPopup
    ) {

        return;

    }


    teammateLeaderboardPopup.style.display =
        "flex";


    renderLeaderboard();

}


function closeLeaderboard() {

    if (
        teammateLeaderboardPopup
    ) {

        teammateLeaderboardPopup.style.display =
            "none";

    }

}


/* =========================================================
   LEADERBOARD
   Placeholder for future Daily Diamond
   leaderboard integration.
========================================================= */

function renderLeaderboard() {

    const list =
        document.getElementById(
            "leaderboardList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <div class="leaderboard-empty">

            Leaderboard data will appear here.

        </div>

    `;

}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.shareResults =
    shareResults;


window.openLeaderboard =
    openLeaderboard;


window.closeLeaderboard =
    closeLeaderboard;


window.giveUp =
    giveUp;