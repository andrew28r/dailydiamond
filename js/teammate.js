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
   GAME REQUIREMENTS
========================================================= */

const TEAMMATE_MIN_CAREER_GAMES = 300;

const TEAMMATE_SEASON_PLAYER_LIMIT = 2000;

const TEAMMATE_REQUIRE_HEADSHOT = true;

const TEAMMATE_ELIGIBILITY_BATCH_SIZE = 15;

const TEAMMATE_ELIGIBLE_PLAYER_LIMIT = 100;


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

let teammateSeasonPlayerCache = new Map();

let teammateCareerCache = new Map();

let teammateHeadshotCache = new Map();

let teammateSearchTimeout = null;

let teammateLocked = false;

let teammateOutcome = null;

let teammateSelectedSearchIndex = -1;

let teammateInitialized = false;

let teammateCheckingGuess = false;


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
   SEASON CONFIG
========================================================= */

const TEAMMATE_MIN_SEASON = 1990;

const TEAMMATE_MAX_SEASON = 2025;


/* =========================================================
   DATE
========================================================= */

const teammateParams =
    new URLSearchParams(
        window.location.search
    );


let teammateSelectedDate =
    teammateParams.get("date") ||
    getEasternDateString();


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

    const [
        year,
        month,
        day
    ] =
        teammateSelectedDate.split("-");

    teammateGameDate.textContent =
        `${month}/${day}/${year}`;

}


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

                window.location.href =
                    "indexTeammates.html";

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
   DATABASE
========================================================= */

async function loadSavedTeammatePlayerGame() {

    if (
        typeof window.teammatePlayerGames !==
        "function"
    ) {

        console.error(
            "teammatePlayerGames() is missing from database.js"
        );

        return null;

    }


    try {

        return await window.teammatePlayerGames(
            teammateSelectedDate
        );

    }
    catch (error) {

        console.error(
            "Failed to load saved Teammate player game:",
            error
        );

        return null;

    }

}


/* =========================================================
   SAVE GAME
========================================================= */

async function saveTeammateProgress(
    win = false,
    completed = false
) {

    if (
        typeof window.saveTeammatePlayerGame !==
        "function"
    ) {

        console.error(
            "saveTeammatePlayerGame() is missing from database.js"
        );

        return null;

    }


    const completedSameDay =
        completed === true &&
        teammateSelectedDate ===
            getEasternDateString();


    try {

        return await window.saveTeammatePlayerGame(
            teammateSelectedDate,
            teammateGuesses,
            win,
            completed,
            completedSameDay
        );

    }
    catch (error) {

        console.error(
            "Teammate progress save failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   RESTORE SAVED GAME
========================================================= */

function restoreSavedTeammateGame(
    savedGame
) {

    teammatePath = [

        teammateStartPlayer,

        null,

        teammateEndPlayer

    ];


    teammateGuesses = [];


    if (
        savedGame &&
        Array.isArray(
            savedGame.guesses
        )
    ) {

        teammateGuesses =
            savedGame.guesses.map(
                guess => {

                    return {

                        player: {

                            id:
                                Number(
                                    guess.playerId
                                ),

                            name:
                                guess.playerName ||
                                ""

                        },

                        correct:
                            guess.correct === true ||
                            guess.correct === "true",

                        intermediate:
                            guess.intermediate === true ||
                            guess.intermediate === "true"

                    };

                }
            );

    }


    /*
     * Rebuild the connection path.
     */

    for (
        const guess of teammateGuesses
    ) {

        if (
            !guess.correct ||
            !guess.player ||
            !guess.player.id
        ) {

            continue;

        }


        const blankIndex =
            teammatePath.findIndex(
                player =>
                    player === null
            );


        if (
            blankIndex < 0
        ) {

            break;

        }


        teammatePath.splice(
            blankIndex,
            1,
            guess.player
        );


        if (
            guess.intermediate
        ) {

            teammatePath.splice(
                blankIndex + 1,
                0,
                null
            );

        }

    }


    if (
        savedGame &&
        (
            savedGame.completed === true ||
            savedGame.completed === "true"
        )
    ) {

        teammateLocked = true;

        teammateOutcome =
            (
                savedGame.win === true ||
                savedGame.win === "true"
            )
                ? "win"
                : "giveup";

    }
    else {

        teammateLocked = false;

        teammateOutcome = null;

    }


    updateGuessCount();

}


/* =========================================================
   DAILY GAME
========================================================= */

async function loadTeammateDailyGame() {

    const {
        data,
        error
    } =
        await db
        .from("teammateGames")
        .select("*")
        .eq(
            "date",
            teammateSelectedDate
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Teammate daily game load error:",
            error
        );

        throw error;

    }


    /*
     * Existing game.
     *
     * This is always the source of truth once
     * a daily game exists in Supabase.
     */

    if (data) {

        console.log(
            "Existing teammate game loaded:",
            data
        );


        teammateStartPlayer =
            createDailyPlayerObject(
                data.startPlayerId,
                data.startPlayerName,
                data.startPlayerInfo
            );


        teammateEndPlayer =
            createDailyPlayerObject(
                data.endPlayerId,
                data.endPlayerName,
                data.endPlayerInfo
            );


        /*
         * Remember this pair locally too.
         *
         * If the database row is deleted later,
         * the next generation can avoid this pair.
         */

        rememberGeneratedPair(
            data.startPlayerId,
            data.endPlayerId
        );


        return;

    }


    /*
     * No game exists.
     *
     * Generate a new one.
     */

    console.log(
        "Creating teammate game for:",
        teammateSelectedDate
    );


    /*showMessage(
        "Finding eligible MLB players...",
        false
    );*/


    const baseSeed =
        teammateSeedFromDate(
            teammateSelectedDate
        );


    /*
     * Every time the database row has been deleted
     * and the game is regenerated, increase the local
     * generation number.
     */

    const generation =
        getGenerationNumber();


    /*
     * The date determines the base game.
     *
     * The generation number changes the actual
     * candidate ordering when a puzzle is regenerated.
     */

    const generationSeed =
        baseSeed +
        (
            generation *
            104729
        );


    const startSeason =
        getSeededSeason(
            baseSeed
        );


    const endSeason =
        getSeededSeason(
            baseSeed + 7919
        );


    console.log(
        "Selected teammate seasons:",
        {
            startSeason,
            endSeason,
            generation
        }
    );


    /*
     * Load the season player lists.
     */

    const [
        startSeasonPlayers,
        endSeasonPlayers
    ] =
        await Promise.all([

            getSeasonPlayers(
                startSeason
            ),

            getSeasonPlayers(
                endSeason
            )

        ]);


    if (
        !startSeasonPlayers.length ||
        !endSeasonPlayers.length
    ) {

        throw new Error(
            "Unable to load MLB players."
        );

    }


    /*
     * Filter candidates by CAREER games
     * and real headshot availability.
     */

    /*showMessage(
        "Checking career game totals...",
        false
    );*/


    const eligibleStartPlayers =
        await getEligiblePlayers(
            startSeasonPlayers,
            generationSeed + 101
        );


    const eligibleEndPlayers =
        await getEligiblePlayers(
            endSeasonPlayers,
            generationSeed + 202
        );


    console.log(
        "Eligible players:",
        {
            start:
                eligibleStartPlayers.length,

            end:
                eligibleEndPlayers.length
        }
    );


    if (
        eligibleStartPlayers.length < 2 ||
        eligibleEndPlayers.length < 2
    ) {

        throw new Error(
            "Not enough players with 300+ career games and valid headshots."
        );

    }


    /*showMessage(
        "Finding today's connection...",
        false
    );*/


    /*
     * Load the previously generated pair from
     * localStorage, if there is one.
     */

    const previousPair =
        getPreviousGeneratedPair();


    const foundPair =
        await findDailyNonTeammatePair(
            eligibleStartPlayers,
            eligibleEndPlayers,
            generationSeed,
            previousPair
        );


    if (!foundPair) {

        throw new Error(
            "Could not find a valid teammate connection."
        );

    }


    console.log(
        "Selected teammate connection:",
        {
            start:
                foundPair.start.name,

            end:
                foundPair.end.name,

            generation
        }
    );


    /*
     * Save the daily puzzle.
     */

    const {
        data: insertedGame,
        error: insertError
    } =
        await db
        .from("teammateGames")
        .insert({

            date:
                teammateSelectedDate,

            startPlayerId:
                foundPair.start.id,

            startPlayerName:
                foundPair.start.name,

            startPlayerInfo:
                foundPair.start.raw,

            endPlayerId:
                foundPair.end.id,

            endPlayerName:
                foundPair.end.name,

            endPlayerInfo:
                foundPair.end.raw

        })
        .select()
        .single();


    /*
     * Another user may have created
     * the same daily puzzle.
     */

    if (insertError) {

        if (
            insertError.code ===
            "23505"
        ) {

            const {
                data: existingGame,
                error: reloadError
            } =
                await db
                .from("teammateGames")
                .select("*")
                .eq(
                    "date",
                    teammateSelectedDate
                )
                .single();


            if (reloadError) {

                throw reloadError;

            }


            teammateStartPlayer =
                createDailyPlayerObject(
                    existingGame.startPlayerId,
                    existingGame.startPlayerName,
                    existingGame.startPlayerInfo
                );


            teammateEndPlayer =
                createDailyPlayerObject(
                    existingGame.endPlayerId,
                    existingGame.endPlayerName,
                    existingGame.endPlayerInfo
                );


            rememberGeneratedPair(
                existingGame.startPlayerId,
                existingGame.endPlayerId
            );


            return;

        }


        console.error(
            "Teammate daily game insert error:",
            insertError
        );

        throw insertError;

    }


    /*
     * Successfully created today's game.
     */

    teammateStartPlayer =
        createDailyPlayerObject(
            insertedGame.startPlayerId,
            insertedGame.startPlayerName,
            insertedGame.startPlayerInfo
        );


    teammateEndPlayer =
        createDailyPlayerObject(
            insertedGame.endPlayerId,
            insertedGame.endPlayerName,
            insertedGame.endPlayerInfo
        );


    rememberGeneratedPair(
        insertedGame.startPlayerId,
        insertedGame.endPlayerId
    );


    console.log(
        "Created teammate daily game:",
        insertedGame
    );

}



/* =========================================================
   PRE-POPULATE NEXT 3 DAYS
========================================================= */

async function populateUpcomingTeammateGames() {

    try {

        const baseDate =
            new Date(
                `${teammateSelectedDate}T12:00:00`
            );


        for (
            let offset = 0;
            offset < 3;
            offset++
        ) {

            const date =
                new Date(
                    baseDate
                );


            date.setDate(
                baseDate.getDate() + offset
            );


            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                );


            const dateString =
                `${year}-${month}-${day}`;


            /*
             * Never overwrite an existing game.
             */

            const {
                data: existingGame,
                error: checkError
            } =
                await db
                .from("teammateGames")
                .select("date")
                .eq(
                    "date",
                    dateString
                )
                .maybeSingle();


            if (checkError) {

                console.error(
                    `Could not check Teammate game for ${dateString}:`,
                    checkError
                );

                continue;

            }


            if (existingGame) {

                console.log(
                    `Teammate game already exists for ${dateString}.`
                );

                continue;

            }


            console.log(
                `Pre-populating Teammate game for ${dateString}...`
            );


            await generateTeammateGameForDate(
                dateString
            );

        }

    }
    catch (error) {

        console.error(
            "Upcoming Teammate game population failed:",
            error
        );

    }

}


/* =========================================================
   GENERATE GAME FOR SPECIFIC DATE
========================================================= */

async function generateTeammateGameForDate(
    dateString
) {

    /*
     * Double-check that another user/browser hasn't
     * already created the game.
     */

    const {
        data: existingGame,
        error: existingError
    } =
        await db
        .from("teammateGames")
        .select("date")
        .eq(
            "date",
            dateString
        )
        .maybeSingle();


    if (existingError) {

        throw existingError;

    }


    if (existingGame) {

        console.log(
            `Game already exists for ${dateString}.`
        );

        return existingGame;

    }


    const baseSeed =
        teammateSeedFromDate(
            dateString
        );


    const generation =
        getGenerationNumberForDate(
            dateString
        );


    const generationSeed =
        baseSeed +
        (
            generation *
            104729
        );


    const startSeason =
        getSeededSeason(
            baseSeed
        );


    const endSeason =
        getSeededSeason(
            baseSeed + 7919
        );


    console.log(
        `Generating ${dateString}:`,
        {
            startSeason,
            endSeason,
            generation
        }
    );


    /*
     * Load both season player pools.
     */

    const [
        startSeasonPlayers,
        endSeasonPlayers
    ] =
        await Promise.all([

            getSeasonPlayers(
                startSeason
            ),

            getSeasonPlayers(
                endSeason
            )

        ]);


    if (
        !startSeasonPlayers.length ||
        !endSeasonPlayers.length
    ) {

        throw new Error(
            `Unable to load MLB players for ${dateString}.`
        );

    }


    /*
     * Find players with 300+ career games
     * and valid MLB headshots.
     */

    const [
        eligibleStartPlayers,
        eligibleEndPlayers
    ] =
        await Promise.all([

            getEligiblePlayers(
                startSeasonPlayers,
                generationSeed + 101
            ),

            getEligiblePlayers(
                endSeasonPlayers,
                generationSeed + 202
            )

        ]);


    if (
        eligibleStartPlayers.length < 2 ||
        eligibleEndPlayers.length < 2
    ) {

        throw new Error(
            `Not enough eligible players for ${dateString}.`
        );

    }


    /*
     * Check the previously generated pair for THIS DATE.
     */

    const previousPair =
        getPreviousGeneratedPairForDate(
            dateString
        );


    const foundPair =
        await findDailyNonTeammatePair(
            eligibleStartPlayers,
            eligibleEndPlayers,
            generationSeed,
            previousPair
        );


    if (!foundPair) {

        throw new Error(
            `Could not find a valid teammate connection for ${dateString}.`
        );

    }


    /*
     * Insert the game.
     */

    const {
        data: insertedGame,
        error: insertError
    } =
        await db
        .from("teammateGames")
        .insert({

            date:
                dateString,

            startPlayerId:
                foundPair.start.id,

            startPlayerName:
                foundPair.start.name,

            startPlayerInfo:
                foundPair.start.raw,

            endPlayerId:
                foundPair.end.id,

            endPlayerName:
                foundPair.end.name,

            endPlayerInfo:
                foundPair.end.raw

        })
        .select()
        .single();


    /*
     * If somebody else created it at the same time,
     * use their game instead.
     */

    if (insertError) {

        if (
            insertError.code ===
            "23505"
        ) {

            const {
                data: existingAfterInsert,
                error: reloadError
            } =
                await db
                .from("teammateGames")
                .select("*")
                .eq(
                    "date",
                    dateString
                )
                .single();


            if (reloadError) {

                throw reloadError;

            }


            console.log(
                `Another client created ${dateString} first.`
            );


            return existingAfterInsert;

        }


        throw insertError;

    }


    rememberGeneratedPairForDate(
        dateString,
        insertedGame.startPlayerId,
        insertedGame.endPlayerId
    );


    console.log(
        `Successfully created Teammate game for ${dateString}:`,
        insertedGame.startPlayerName,
        "→",
        insertedGame.endPlayerName
    );


    return insertedGame;

}


/* =========================================================
   DATE-SPECIFIC GENERATION STORAGE
========================================================= */

function getGenerationNumberForDate(
    dateString
) {

    const key =
        `teammateGeneration_${dateString}`;


    let generation = 0;


    try {

        const stored =
            localStorage.getItem(
                key
            );


        if (
            stored !== null
        ) {

            generation =
                Number(
                    stored
                );

        }


        if (
            !Number.isFinite(
                generation
            )
        ) {

            generation = 0;

        }


        localStorage.setItem(
            key,
            String(
                generation
            )
        );

    }
    catch (error) {

        console.warn(
            `Unable to read generation for ${dateString}:`,
            error
        );

    }


    return generation;

}


function getPreviousGeneratedPairForDate(
    dateString
) {

    try {

        const stored =
            localStorage.getItem(
                `teammatePreviousPair_${dateString}`
            );


        if (!stored) {

            return null;

        }


        const pair =
            JSON.parse(
                stored
            );


        if (
            !pair ||
            !pair.startId ||
            !pair.endId
        ) {

            return null;

        }


        return {

            startId:
                Number(
                    pair.startId
                ),

            endId:
                Number(
                    pair.endId
                )

        };

    }
    catch (error) {

        console.warn(
            `Unable to read previous pair for ${dateString}:`,
            error
        );

        return null;

    }

}


function rememberGeneratedPairForDate(
    dateString,
    startId,
    endId
) {

    if (
        !startId ||
        !endId
    ) {

        return;

    }


    try {

        localStorage.setItem(

            `teammatePreviousPair_${dateString}`,

            JSON.stringify({

                startId:
                    Number(
                        startId
                    ),

                endId:
                    Number(
                        endId
                    )

            })

        );

    }
    catch (error) {

        console.warn(
            `Unable to remember pair for ${dateString}:`,
            error
        );

    }

}
/* =========================================================
   GENERATION STORAGE
========================================================= */

function getGenerationStorageKey() {

    return (
        `teammateGeneration_${teammateSelectedDate}`
    );

}


function getPreviousPairStorageKey() {

    return (
        `teammatePreviousPair_${teammateSelectedDate}`
    );

}


function getGenerationNumber() {

    const key =
        getGenerationStorageKey();


    let generation = 0;


    try {

        const stored =
            localStorage.getItem(
                key
            );


        if (
            stored !== null
        ) {

            generation =
                Number(
                    stored
                );

        }


        if (
            !Number.isFinite(
                generation
            )
        ) {

            generation = 0;

        }


        /*
         * If no game has ever been generated in this
         * browser, generation 0 is used.
         *
         * If a previous pair exists but the database
         * row is gone, this is a regeneration.
         */

        const previousPair =
            localStorage.getItem(
                getPreviousPairStorageKey()
            );


        if (
            previousPair &&
            generation === 0
        ) {

            generation = 1;

        }


        localStorage.setItem(
            key,
            String(
                generation
            )
        );

    }
    catch (error) {

        console.warn(
            "Unable to read Teammate generation:",
            error
        );

    }


    return generation;

}


function getPreviousGeneratedPair() {

    try {

        const stored =
            localStorage.getItem(
                getPreviousPairStorageKey()
            );


        if (!stored) {

            return null;

        }


        const pair =
            JSON.parse(
                stored
            );


        if (
            !pair ||
            !pair.startId ||
            !pair.endId
        ) {

            return null;

        }


        return {

            startId:
                Number(
                    pair.startId
                ),

            endId:
                Number(
                    pair.endId
                )

        };

    }
    catch (error) {

        console.warn(
            "Unable to read previous Teammate pair:",
            error
        );

        return null;

    }

}


function rememberGeneratedPair(
    startId,
    endId
) {

    if (
        !startId ||
        !endId
    ) {

        return;

    }


    try {

        localStorage.setItem(
            getPreviousPairStorageKey(),
            JSON.stringify({

                startId:
                    Number(
                        startId
                    ),

                endId:
                    Number(
                        endId
                    )

            })
        );

    }
    catch (error) {

        console.warn(
            "Unable to remember Teammate pair:",
            error
        );

    }

}


/* =========================================================
   DAILY PLAYER OBJECT
========================================================= */

function createDailyPlayerObject(
    id,
    name,
    info
) {

    return {

        id:
            Number(id),

        name:
            name || "",

        ...(info || {})

    };

}


/* =========================================================
   GET SEASON PLAYERS
========================================================= */

async function getSeasonPlayers(
    season
) {

    if (
        teammateSeasonPlayerCache.has(
            season
        )
    ) {

        return teammateSeasonPlayerCache.get(
            season
        );

    }


    try {

        const url =
            `${TEAMMATE_API}/sports/1/players` +
            `?season=${season}`;


        const response =
            await fetch(
                url
            );


        if (!response.ok) {

            throw new Error(
                `Season request failed: ${response.status}`
            );

        }


        const data =
            await response.json();


        const rawPlayers =
            Array.isArray(
                data.people
            )
                ? data.people
                : [];


        const players =
            rawPlayers
                .filter(
                    player =>
                        player &&
                        player.id &&
                        player.fullName
                )
                .map(
                    player =>
                        normalizePlayer(
                            player
                        )
                );


        const seen =
            new Set();


        const unique =
            players.filter(
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


        const shuffled =
            seededShuffle(
                unique,
                season * 37
            );


        const limited =
            shuffled.slice(
                0,
                TEAMMATE_SEASON_PLAYER_LIMIT
            );


        teammateSeasonPlayerCache.set(
            season,
            limited
        );


        console.log(
            `Loaded ${limited.length} players for ${season}`
        );


        return limited;

    }
    catch (error) {

        console.error(
            `Season ${season} player fetch error:`,
            error
        );


        teammateSeasonPlayerCache.set(
            season,
            []
        );


        return [];

    }

}


/* =========================================================
   NORMALIZE PLAYER
========================================================= */

function normalizePlayer(
    raw
) {

    return {

        id:
            Number(
                raw.id
            ),

        name:
            raw.fullName ||
            `${raw.firstName || ""} ${raw.lastName || ""}`
                .trim(),

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

}


/* =========================================================
   GET ELIGIBLE PLAYERS
========================================================= */

async function getEligiblePlayers(
    players,
    seed
) {

    const shuffled =
        seededShuffle(
            players,
            seed
        );


    const eligible =
        [];


    for (
        let i = 0;
        i < shuffled.length;
        i += TEAMMATE_ELIGIBILITY_BATCH_SIZE
    ) {

        if (
            eligible.length >=
            TEAMMATE_ELIGIBLE_PLAYER_LIMIT
        ) {

            break;

        }


        const batch =
            shuffled.slice(
                i,
                i +
                TEAMMATE_ELIGIBILITY_BATCH_SIZE
            );


        const results =
            await Promise.all(
                batch.map(
                    async player => {

                        const career =
                            await getCareerStats(
                                player.id
                            );


                        if (
                            !career
                        ) {

                            return null;

                        }


                        if (
                            career.gamesPlayed <
                            TEAMMATE_MIN_CAREER_GAMES
                        ) {

                            return null;

                        }


                        /*
                         * Start and End players MUST have
                         * a real MLB player headshot.
                         */

                        if (
                            TEAMMATE_REQUIRE_HEADSHOT
                        ) {

                            const validHeadshot =
                                await hasValidHeadshot(
                                    player.id
                                );


                            if (
                                !validHeadshot
                            ) {

                                return null;

                            }

                        }


                        return {

                            ...player,

                            careerGames:
                                career.gamesPlayed,

                            careerInnings:
                                career.inningsPitched

                        };

                    }
                )
            );


        for (
            const player of results
        ) {

            if (
                player
            ) {

                eligible.push(
                    player
                );

            }


            if (
                eligible.length >=
                TEAMMATE_ELIGIBLE_PLAYER_LIMIT
            ) {

                break;

            }

        }

        /*
        showMessage(
            `Checking eligible players... ${eligible.length} found`,
            false
        );*/

    }


    return eligible;

}


/* =========================================================
   CAREER STATS
========================================================= */

async function getCareerStats(
    playerId
) {

    if (
        teammateCareerCache.has(
            playerId
        )
    ) {

        return teammateCareerCache.get(
            playerId
        );

    }


    try {

        const hittingURL =
            `${TEAMMATE_API}/people/${playerId}/stats` +
            `?stats=career` +
            `&group=hitting`;


        const pitchingURL =
            `${TEAMMATE_API}/people/${playerId}/stats` +
            `?stats=career` +
            `&group=pitching`;


        const [
            hittingResponse,
            pitchingResponse
        ] =
            await Promise.all([

                fetch(
                    hittingURL
                ),

                fetch(
                    pitchingURL
                )

            ]);


        let gamesPlayed = 0;

        let inningsPitched = 0;


        if (
            hittingResponse.ok
        ) {

            const data =
                await hittingResponse.json();


            const stats =
                extractCareerStat(
                    data
                );


            gamesPlayed =
                Math.max(
                    gamesPlayed,
                    stats.gamesPlayed
                );

        }


        if (
            pitchingResponse.ok
        ) {

            const data =
                await pitchingResponse.json();


            const stats =
                extractCareerStat(
                    data
                );


            gamesPlayed =
                Math.max(
                    gamesPlayed,
                    stats.gamesPlayed
                );


            inningsPitched =
                stats.inningsPitched;

        }


        const result = {

            gamesPlayed,

            inningsPitched

        };


        teammateCareerCache.set(
            playerId,
            result
        );


        return result;

    }
    catch (error) {

        console.error(
            `Career stats error for ${playerId}:`,
            error
        );


        teammateCareerCache.set(
            playerId,
            null
        );


        return null;

    }

}


/* =========================================================
   EXTRACT CAREER STAT
========================================================= */

function extractCareerStat(
    data
) {

    let gamesPlayed = 0;

    let inningsPitched = 0;


    if (
        !data ||
        !Array.isArray(
            data.stats
        )
    ) {

        return {

            gamesPlayed: 0,

            inningsPitched: 0

        };

    }


    for (
        const statGroup of data.stats
    ) {

        if (
            !Array.isArray(
                statGroup.splits
            )
        ) {

            continue;

        }


        for (
            const split of statGroup.splits
        ) {

            const stat =
                split.stat || {};


            const gp =
                Number(
                    stat.gamesPlayed ??
                    stat.games ??
                    0
                );


            const ip =
                parseInnings(
                    stat.inningsPitched
                );


            if (
                Number.isFinite(
                    gp
                )
            ) {

                gamesPlayed =
                    Math.max(
                        gamesPlayed,
                        gp
                    );

            }


            if (
                Number.isFinite(
                    ip
                )
            ) {

                inningsPitched =
                    Math.max(
                        inningsPitched,
                        ip
                    );

            }

        }

    }


    return {

        gamesPlayed,

        inningsPitched

    };

}


/* =========================================================
   FIND DAILY PAIR
========================================================= */

async function findDailyNonTeammatePair(
    startPlayers,
    endPlayers,
    seed,
    excludedPair = null
) {

    const shuffledStart =
        seededShuffle(
            startPlayers,
            seed + 101
        );


    const shuffledEnd =
        seededShuffle(
            endPlayers,
            seed + 202
        );


    /*
     * Check up to 60 candidates on each side.
     *
     * This gives us up to 3,600 possible pairs.
     */

    const maxStart =
        Math.min(
            60,
            shuffledStart.length
        );


    const maxEnd =
        Math.min(
            60,
            shuffledEnd.length
        );


    let checks = 0;


    for (
        let i = 0;
        i < maxStart;
        i++
    ) {

        const start =
            shuffledStart[i];


        for (
            let j = 0;
            j < maxEnd;
            j++
        ) {

            const end =
                shuffledEnd[j];


            /*
             * Do not allow the same pair that was
             * generated previously.
             *
             * We also reject the reversed combination
             * just in case the same players are available
             * on both sides.
             */

            if (
                excludedPair &&
                (
                    (
                        start.id ===
                        excludedPair.startId &&

                        end.id ===
                        excludedPair.endId
                    )
                    ||
                    (
                        start.id ===
                        excludedPair.endId &&

                        end.id ===
                        excludedPair.startId
                    )
                )
            ) {

                continue;

            }


            /*
             * Start and End must be different players.
             */

            if (
                start.id ===
                end.id
            ) {

                continue;

            }


            checks++;


            const wereTeammates =
                await werePlayersTeammates(
                    start.id,
                    end.id
                );


            /*
             * We want Start and End to NOT
             * directly be teammates.
             */

            if (
                wereTeammates
            ) {

                continue;

            }


            return {

                start,

                end

            };

        }

    }


    console.warn(
        `Unable to find pair after ${checks} checks.`
    );


    return null;

}


/* =========================================================
   PLAYER
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


        const player =
            normalizePlayer(
                data.people[0]
            );


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
   TEAM HISTORY
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


        const hittingURL =
            `${TEAMMATE_API}/people/${playerId}/stats` +
            `?stats=yearByYear` +
            `&group=hitting` +
            `&hydrate=team`;


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

                fetch(
                    hittingURL
                ),

                fetch(
                    pitchingURL
                )

            ]);


        if (
            hittingResponse.ok
        ) {

            const data =
                await hittingResponse.json();


            extractTeamSplits(
                data,
                allTeams
            );

        }


        if (
            pitchingResponse.ok
        ) {

            const data =
                await pitchingResponse.json();


            extractTeamSplits(
                data,
                allTeams
            );

        }


        /*
         * Merge duplicate team/year records.
         */

        const merged =
            new Map();


        for (
            const item of allTeams
        ) {

            const key =
                `${item.teamId}-${item.year}`;


            if (
                !merged.has(
                    key
                )
            ) {

                merged.set(
                    key,
                    {
                        year:
                            item.year,

                        teamId:
                            item.teamId,

                        gamesPlayed:
                            item.gamesPlayed,

                        inningsPitched:
                            item.inningsPitched
                    }
                );

            }
            else {

                const existing =
                    merged.get(
                        key
                    );


                existing.gamesPlayed =
                    Math.max(
                        existing.gamesPlayed,
                        item.gamesPlayed
                    );


                existing.inningsPitched =
                    Math.max(
                        existing.inningsPitched,
                        item.inningsPitched
                    );

            }

        }


        const result =
            Array.from(
                merged.values()
            );


        teammateTeamCache.set(
            playerId,
            result
        );


        return result;

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
        const statGroup of data.stats
    ) {

        if (
            !Array.isArray(
                statGroup.splits
            )
        ) {

            continue;

        }


        for (
            const split of statGroup.splits
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
                !year ||
                !teamId
            ) {

                continue;

            }


            const gamesPlayed =
                Number(
                    split.stat?.gamesPlayed ??
                    split.stat?.games ??
                    0
                );


            const inningsPitched =
                parseInnings(
                    split.stat?.inningsPitched
                );


            result.push({

                year,

                teamId,

                gamesPlayed:
                    Number.isFinite(
                        gamesPlayed
                    )
                        ? gamesPlayed
                        : 0,

                inningsPitched:
                    Number.isFinite(
                        inningsPitched
                    )
                        ? inningsPitched
                        : 0

            });

        }

    }

}


/* =========================================================
   INNINGS PARSER
========================================================= */

function parseInnings(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;

    }


    const text =
        String(
            value
        ).trim();


    if (
        !text
    ) {

        return 0;

    }


    /*
     * MLB notation:
     *
     * 12.1 = 12 1/3 innings
     * 12.2 = 12 2/3 innings
     */

    if (
        text.includes(".")
    ) {

        const parts =
            text.split(".");


        const whole =
            Number(
                parts[0]
            );


        const fraction =
            Number(
                parts[1]
            );


        if (
            Number.isFinite(
                whole
            ) &&
            Number.isFinite(
                fraction
            )
        ) {

            if (
                fraction === 1
            ) {

                return whole + 1 / 3;

            }


            if (
                fraction === 2
            ) {

                return whole + 2 / 3;

            }


            return whole +
                fraction / 10;

        }

    }


    const parsed =
        Number(
            text
        );


    return Number.isFinite(
        parsed
    )
        ? parsed
        : 0;

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
        playerAId ===
        playerBId
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


    /*
     * A teammate connection exists when
     * both players appeared for the same
     * MLB team in the same season.
     */

    for (
        const playerASeason of teamsA
    ) {

        const matchingSeason =
            teamsB.find(
                playerBSeason =>

                    playerBSeason.teamId ===
                        playerASeason.teamId &&

                    playerBSeason.year ===
                        playerASeason.year
            );


        if (
            matchingSeason
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   SEARCH
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
            Array.isArray(
                data.people
            )
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
                    person =>
                        normalizePlayer(
                            person
                        )
                );


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
         * Do not allow Start, End,
         * or already-used players.
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

    if (
        teammateLocked ||
        teammateCheckingGuess
    ) {

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
        event.key ===
        "Escape"
    ) {

        hideDropdown();

        return;

    }


    if (
        !teammatePlayers.length
    ) {

        if (
            event.key ===
            "Enter"
        ) {

            event.preventDefault();

        }

        return;

    }


    if (
        event.key ===
        "ArrowDown"
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
        event.key ===
        "ArrowUp"
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
        event.key ===
        "Enter"
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
   HIGHLIGHT SEARCH
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
        (
            item,
            index
        ) => {

            item.classList.toggle(
                "selected",
                index ===
                teammateSelectedSearchIndex
            );

        }
    );

}


/* =========================================================
   DROPDOWN
========================================================= */

function renderDropdown() {

    if (!teammateDropdown) {
        return;
    }


    teammateDropdown.innerHTML =
        "";


    if (
        !teammatePlayers.length
    ) {

        teammateDropdown.style.display =
            "none";

        return;

    }


    teammatePlayers.forEach(
        player => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "item";


            const headshot =
                document.createElement(
                    "img"
                );


            headshot.src =
                getHeadshot(
                    player.id
                );


            headshot.className =
                "dropdown-headshot";


            headshot.alt =
                player.name;


            headshot.onerror =
                () => {

                    headshot.onerror =
                        null;


                    headshot.src =
                        getGenericHeadshot();

                };


            const name =
                document.createElement(
                    "span"
                );


            name.textContent =
                player.name;


            item.appendChild(
                headshot
            );


            item.appendChild(
                name
            );


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

        }
    );


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
        !teammateInitialized ||
        teammateCheckingGuess
    ) {

        return;

    }


    if (
        !player ||
        !player.id
    ) {

        return;

    }


    teammateCheckingGuess =
        true;


    hideDropdown();


    if (teammateSearch) {

        teammateSearch.value =
            "";

        teammateSearch.disabled =
            true;

    }


    try {

        if (
            teammateEndPlayer &&
            player.id ===
            teammateEndPlayer.id
        ) {

            /*showMessage(
                "The End Player is automatically checked.",
                true
            );*/

            return;

        }


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


        const newGuess = {

            player,

            correct: false,

            intermediate: false

        };


        teammateGuesses.push(
            newGuess
        );


        updateGuessCount();


        /*showMessage(
            "Checking teammate connection...",
            false
        );*/


        /*
         * Check current player -> guess.
         */

        const connectsToCurrent =
            await werePlayersTeammates(
                currentPlayer.id,
                player.id
            );


        if (
            !connectsToCurrent
        ) {

            await saveTeammateProgress(
                false,
                false
            );


            showMessage(
                `${player.name} was not a teammate of ${currentPlayer.name}.`,
                true
            );


            return;

        }


        /*
         * Check guess -> End.
         */

        /*showMessage(
            "Connection found. Checking the End Player...",
            false
        );*/


        const connectsToEnd =
            await werePlayersTeammates(
                player.id,
                teammateEndPlayer.id
            );


        /*
         * DIRECT WIN
         */

        if (
            connectsToEnd
        ) {

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


            await saveTeammateProgress(
                true,
                true
            );


            renderBoard();

            updateGuessCount();


            /*showMessage(
                `${player.name} connects ${currentPlayer.name} to ${teammateEndPlayer.name}!`,
                false
            );*/


            showResult();


            return;

        }


        /*
         * CORRECT INTERMEDIATE
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


        await saveTeammateProgress(
            false,
            false
        );


        renderBoard();

        updateGuessCount();


        /*showMessage(
            `${player.name} connects to ${currentPlayer.name}. Keep going!`,
            false
        );*/

    }
    finally {

        teammateCheckingGuess =
            false;


        if (
            !teammateLocked &&
            teammateSearch
        ) {

            teammateSearch.disabled =
                false;

            teammateSearch.focus();

        }

    }

}


/* =========================================================
   CURRENT CONNECTION PLAYER
========================================================= */

function getCurrentConnectionPlayer() {

    if (
        !teammateStartPlayer
    ) {

        return null;

    }


    for (
        let i =
            teammatePath.length - 1;

        i >= 0;

        i--
    ) {

        const player =
            teammatePath[i];


        if (!player) {

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
   RENDER BOARD
========================================================= */

function renderBoard() {

    if (!teammateBoard) {
        return;
    }


    teammateBoard.innerHTML =
        "";


    for (
        let i = 0;
        i < teammatePath.length;
        i++
    ) {

        const player =
            teammatePath[i];


        if (!player) {

            const blank =
                document.createElement(
                    "div"
                );


            blank.className =
                "teammate-row blank-player";


            blank.innerHTML = `

                <div class="blank-player-content">
                    Guess Teammate
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


        let rowClass =
            "guess-player";


        let label =
            "";


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


        const row =
            document.createElement(
                "div"
            );


        row.className =
            `teammate-row ${rowClass}`;


        const playerWrapper =
            document.createElement(
                "div"
            );


        playerWrapper.className =
            "teammate-player";


        const headshot =
            document.createElement(
                "img"
            );


        headshot.className =
            "teammate-headshot";


        headshot.src =
            getHeadshot(
                player.id
            );


        headshot.alt =
            player.name;


        headshot.onerror =
            () => {

                headshot.onerror =
                    null;


                headshot.src =
                    getGenericHeadshot();

            };


        const info =
            document.createElement(
                "div"
            );


        info.className =
            "teammate-player-info";


        const name =
            document.createElement(
                "div"
            );


        name.className =
            "teammate-player-name";


        name.textContent =
            player.name;


        info.appendChild(
            name
        );


        playerWrapper.appendChild(
            headshot
        );


        playerWrapper.appendChild(
            info
        );


        row.appendChild(
            playerWrapper
        );


        if (label) {

            const labelElement =
                document.createElement(
                    "div"
                );


            labelElement.className =
                "teammate-row-label";


            labelElement.textContent =
                label;


            row.appendChild(
                labelElement
            );

        }


        teammateBoard.appendChild(
            row
        );


        if (
            i <
            teammatePath.length - 1
        ) {

            appendArrow();

        }

    }

}


/* =========================================================
   ARROW
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
   HEADSHOT
========================================================= */

function getHeadshot(
    playerId
) {

    if (!playerId) {
        return "";
    }


    /*
     * IMPORTANT:
     *
     * This URL does NOT include:
     *
     * d_people:generic:headshot
     *
     * The generator therefore does not intentionally
     * request a generic fallback when checking a player.
     */

    return (
        `https://img.mlbstatic.com/mlb-photos/image/upload/` +
        `w_213,q_auto:best/` +
        `v1/people/${playerId}/headshot/67/current`
    );

}


/* =========================================================
   GENERIC HEADSHOT
========================================================= */

function getGenericHeadshot() {

    return (
        "https://img.mlbstatic.com/mlb-photos/image/upload/" +
        "d_people:generic:headshot:67:current.png/" +
        "w_213,q_auto:best/" +
        "v1/people/0/headshot/67/current"
    );

}


/* =========================================================
   HEADSHOT VALIDATION
========================================================= */

function hasValidHeadshot(
    playerId
) {

    if (!playerId) {
        return Promise.resolve(false);
    }


    if (
        teammateHeadshotCache.has(
            playerId
        )
    ) {

        return Promise.resolve(
            teammateHeadshotCache.get(
                playerId
            )
        );

    }


    return new Promise(
        resolve => {

            const image =
                new Image();


            let finished =
                false;


            const finish =
                valid => {

                    if (finished) {
                        return;
                    }


                    finished =
                        true;


                    teammateHeadshotCache.set(
                        playerId,
                        valid
                    );


                    resolve(
                        valid
                    );

                };


            image.onload =
                () => {

                    finish(
                        true
                    );

                };


            image.onerror =
                () => {

                    /*
                     * Missing MLB headshots are expected.
                     * Do not log anything to the console.
                     */

                    finish(
                        false
                    );

                };


            image.src =
                getHeadshot(
                    playerId
                );

        }
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
                Start
            </div>

        </div>


        <div class="teammate-connection-arrow">
            ↓
        </div>


        <div class="teammate-row blank-player">

            <div class="blank-player-content">
                Guess Teammate
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
                End
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


    teammateMessage.classList.add(
        error
            ? "teammate-error"
            : "teammate-success"
    );

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
        event.target !==
            teammateSearch
    ) {

        hideDropdown();

    }


    if (
        teammateMenu &&
        teammateMenuBtn &&
        !teammateMenu.contains(
            event.target
        ) &&
        event.target !==
            teammateMenuBtn
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

async function giveUp() {

    if (
        teammateLocked ||
        teammateCheckingGuess
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


    if (
        teammateSearch
    ) {

        teammateSearch.disabled =
            true;

    }


    hideDropdown();


    await saveTeammateProgress(
        false,
        true
    );


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

        teammateWinTitle.textContent =
            teammateOutcome === "win"
                ? "You Win!"
                : "You Gave Up!";

    }


    const correctConnections =
        teammateGuesses.filter(
            guess =>
                guess.correct
        ).length;


    if (
        teammateScoreStats
    ) {

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

    }


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


    text +=
        teammateOutcome === "win"
            ? "\nResult: 🟩"
            : "\nResult: ⬛";


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


            /*showMessage(
                "Results copied!",
                false
            );*/


            return;

        }


        window.prompt(
            "Copy your results:",
            text
        );

    }
    catch (error) {

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
   SEEDED RANDOM
========================================================= */

function teammateSeedFromDate(
    dateString
) {

    let hash = 0;


    for (
        let i = 0;
        i < dateString.length;
        i++
    ) {

        hash =
            (
                (hash << 5) -
                hash
            ) +
            dateString.charCodeAt(i);


        hash |= 0;

    }


    return Math.abs(
        hash
    );

}


/* =========================================================
   SEEDED RANDOM
========================================================= */

function seededRandom(
    seed
) {

    const x =
        Math.sin(seed) *
        10000;


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
        let i =
            result.length - 1;

        i > 0;

        i--
    ) {

        const random =
            seededRandom(
                seed + i
            );


        const j =
            Math.floor(
                random *
                (i + 1)
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
   SEEDED SEASON
========================================================= */

function getSeededSeason(
    seed
) {

    const numberOfSeasons =
        TEAMMATE_MAX_SEASON -
        TEAMMATE_MIN_SEASON +
        1;


    const index =
        Math.floor(
            seededRandom(seed) *
            numberOfSeasons
        );


    return (
        TEAMMATE_MIN_SEASON +
        index
    );

}


/* =========================================================
   INITIALIZE GAME
========================================================= */

async function initializeTeammateGame() {

    try {

        if (teammateGameTitle) {

            //teammateGameTitle.textContent =
              //  "Teammate Connection";

        }

        /*
        showMessage(
            "Loading today's connection...",
            false
        );*/


        await loadTeammateDailyGame();


        /*
        * Today's game is loaded first so the user
        * does not have to wait for future games.
        */

        const savedGame =
            await loadSavedTeammatePlayerGame();


        /*
        * Populate today + the next two days in the
        * background. Existing games are never replaced.
        */

        populateUpcomingTeammateGames()
            .catch(
                error => {

                    console.error(
                        "Background Teammate game generation failed:",
                        error
                    );

                }
            );


        if (savedGame) {

            restoreSavedTeammateGame(
                savedGame
            );

        }
        else {

            teammatePath = [

                teammateStartPlayer,

                null,

                teammateEndPlayer

            ];


            teammateGuesses = [];


            teammateLocked =
                false;


            teammateOutcome =
                null;

        }


        renderBoard();

        updateGuessCount();


        if (
            teammateLocked
        ) {

            if (teammateSearch) {

                teammateSearch.disabled =
                    true;

            }


            hideDropdown();

            clearMessage();

            teammateInitialized =
                true;


            showResult();

        }
        else {

            if (teammateSearch) {

                teammateSearch.disabled =
                    false;

            }


            clearMessage();

        }


        teammateInitialized =
            true;


        if (
            teammateSearch &&
            !teammateLocked
        ) {

            teammateSearch.focus();

        }


        console.log(
            "Teammate game loaded:",
            {
                date:
                    teammateSelectedDate,

                start:
                    teammateStartPlayer,

                end:
                    teammateEndPlayer,

                guesses:
                    teammateGuesses.length,

                completed:
                    teammateLocked,

                outcome:
                    teammateOutcome
            }
        );

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
