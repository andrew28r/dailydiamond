/* =========================================================
   DAILY DIAMOND
   TEAMMATE CONNECTION
   GAME GENERATOR + SOLUTION PATH
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
   SEASON CONFIG
========================================================= */

const TEAMMATE_MIN_SEASON = 1990;

const TEAMMATE_MAX_SEASON = 2025;


/* =========================================================
   GENERATOR CACHE
========================================================= */

let teammatePlayerCache =
    new Map();

let teammateTeamCache =
    new Map();

let teammateSeasonPlayerCache =
    new Map();

let teammateCareerCache =
    new Map();

let teammateHeadshotCache =
    new Map();

let teammateTeamSeasonPlayerCache =
    new Map();


/* =========================================================
   GENERATED PAIR STATE
========================================================= */

let teammateGeneratedStartPlayer =
    null;

let teammateGeneratedEndPlayer =
    null;

let teammateGeneratedSolutionPath =
    [];


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
   TEAM-SEASON PLAYERS
========================================================= */

async function getTeamSeasonPlayers(
    teamId,
    season
) {

    if (
        !teamId ||
        !season
    ) {

        return [];

    }


    const cacheKey =
        `${teamId}-${season}`;


    if (
        teammateTeamSeasonPlayerCache.has(
            cacheKey
        )
    ) {

        return teammateTeamSeasonPlayerCache.get(
            cacheKey
        );

    }


    try {

        const url =
            `${TEAMMATE_API}/teams/${teamId}/roster` +
            `?season=${season}` +
            `&rosterType=fullRoster` +
            `&hydrate=person`;


        const response =
            await fetch(
                url
            );


        if (!response.ok) {

            console.warn(
                `Could not load team roster: ${teamId}, ${season}`
            );


            teammateTeamSeasonPlayerCache.set(
                cacheKey,
                []
            );


            return [];

        }


        const data =
            await response.json();


        const roster =
            Array.isArray(
                data.roster
            )
                ? data.roster
                : [];


        const players =
            roster
                .map(
                    entry =>
                        entry?.person
                            ? entry.person
                            : entry
                )
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


        const unique =
            [];


        const seen =
            new Set();


        for (
            const player of players
        ) {

            if (
                seen.has(
                    player.id
                )
            ) {

                continue;

            }


            seen.add(
                player.id
            );


            unique.push(
                player
            );

        }


        teammateTeamSeasonPlayerCache.set(
            cacheKey,
            unique
        );


        return unique;

    }
    catch (error) {

        console.error(
            `Team roster error for ${teamId}-${season}:`,
            error
        );


        teammateTeamSeasonPlayerCache.set(
            cacheKey,
            []
        );


        return [];

    }

}


/* =========================================================
   GET ALL TEAMMATES
========================================================= */

async function getAllTeammates(
    playerId
) {

    if (!playerId) {

        return [];

    }


    const teams =
        await getPlayerTeams(
            playerId
        );


    if (
        !teams.length
    ) {

        return [];

    }


    const teamSeasonResults =
        await Promise.all(
            teams.map(
                teamSeason =>
                    getTeamSeasonPlayers(
                        teamSeason.teamId,
                        teamSeason.year
                    )
            )
        );


    const teammates =
        new Map();


    for (
        const players of teamSeasonResults
    ) {

        for (
            const player of players
        ) {

            if (
                !player ||
                !player.id
            ) {

                continue;

            }


            if (
                Number(player.id) ===
                Number(playerId)
            ) {

                continue;

            }


            teammates.set(
                Number(player.id),
                player
            );

        }

    }


    return Array.from(
        teammates.values()
    );

}


/* =========================================================
   FIND SHORTEST SOLUTION PATH
========================================================= */

async function findTeammateSolutionPath(
    startPlayerId,
    endPlayerId
) {

    const startId =
        Number(
            startPlayerId
        );


    const endId =
        Number(
            endPlayerId
        );


    if (
        !startId ||
        !endId ||
        startId === endId
    ) {

        return null;

    }


    const startPlayer =
        teammateGeneratedStartPlayer &&
        Number(
            teammateGeneratedStartPlayer.id
        ) === startId
            ? teammateGeneratedStartPlayer
            : await getPlayer(startId);


    const endPlayer =
        teammateGeneratedEndPlayer &&
        Number(
            teammateGeneratedEndPlayer.id
        ) === endId
            ? teammateGeneratedEndPlayer
            : await getPlayer(endId);


    if (
        !startPlayer ||
        !endPlayer
    ) {

        return null;

    }


    let currentLevel = [

        {

            player:
                startPlayer,

            path: [
                startPlayer
            ]

        }

    ];


    const visited =
        new Set();


    visited.add(
        startId
    );


    let connectionLevel =
        1;


    while (
        currentLevel.length
    ) {

        console.log(
            `Searching solution level ${connectionLevel} with ${currentLevel.length} nodes.`
        );


        const solutions = [];


        const endChecks =
            await Promise.all(

                currentLevel.map(
                    async node => {

                        if (
                            Number(
                                node.player.id
                            ) === endId
                        ) {

                            return true;

                        }


                        return await werePlayersTeammates(
                            node.player.id,
                            endId
                        );

                    }
                )

            );


        for (
            let i = 0;
            i < currentLevel.length;
            i++
        ) {

            if (
                endChecks[i]
            ) {

                const node =
                    currentLevel[i];


                const solution =
                    [

                        ...node.path,

                        endPlayer

                    ];


                solutions.push(
                    solution
                );

            }

        }


        if (
            solutions.length
        ) {

            console.log(
                `Found ${solutions.length} solution(s) at connection level ${connectionLevel}.`
            );


            for (
                const solution of solutions
            ) {

                console.log(
                    "Solution:",
                    solution
                        .map(
                            player =>
                                player.name
                        )
                        .join(
                            " → "
                        )
                );

            }


            return solutions;

        }


        const nextLevelResults =
            await Promise.all(

                currentLevel.map(
                    async node => {

                        const teammates =
                            await getAllTeammates(
                                node.player.id
                            );


                        return {

                            node,

                            teammates

                        };

                    }
                )

            );


        const nextLevel = [];


        const nextLevelSeen =
            new Set();


        for (
            const result of nextLevelResults
        ) {

            const node =
                result.node;


            for (
                const teammate of result.teammates
            ) {

                const teammateId =
                    Number(
                        teammate.id
                    );


                if (
                    !teammateId ||
                    teammateId === endId
                ) {

                    if (
                        teammateId === endId
                    ) {

                        if (
                            !visited.has(
                                endId
                            )
                        ) {

                            visited.add(
                                endId
                            );


                            nextLevel.push({

                                player:
                                    endPlayer,

                                path: [

                                    ...node.path,

                                    endPlayer

                                ]

                            });

                        }

                    }


                    continue;

                }


                if (
                    visited.has(
                        teammateId
                    )
                ) {

                    continue;

                }


                if (
                    nextLevelSeen.has(
                        teammateId
                    )
                ) {

                    continue;

                }


                nextLevelSeen.add(
                    teammateId
                );


                nextLevel.push({

                    player:
                        teammate,

                    path: [

                        ...node.path,

                        teammate

                    ]

                });

            }

        }


        for (
            const node of nextLevel
        ) {

            const id =
                Number(
                    node.player.id
                );


            visited.add(
                id
            );

        }


        currentLevel =
            nextLevel;


        connectionLevel++;


        console.log(
            `Next solution level contains ${currentLevel.length} nodes.`
        );

    }


    console.warn(
        `No teammate solution found from ${startId} to ${endId}.`
    );


    return null;

}


/* =========================================================
   SOLUTION SERIALIZATION
========================================================= */

function serializeTeammateSolutionPath(
    paths
) {

    if (
        !Array.isArray(paths)
    ) {

        return [];

    }


    return paths
        .filter(
            path =>
                Array.isArray(path) &&
                path.length
        )
        .map(
            path =>
                path
                    .filter(
                        player =>
                            player &&
                            player.id
                    )
                    .map(
                        player => ({

                            id:
                                Number(
                                    player.id
                                ),

                            name:
                                String(
                                    player.name ||
                                    ""
                                )

                        })
                    )
        )
        .filter(
            path =>
                path.length
        );

}


/* =========================================================
   SOLUTION RESTORATION
========================================================= */

function restoreTeammateSolutionPath(
    solutionPath
) {

    if (
        !Array.isArray(solutionPath)
    ) {

        return [];

    }


    if (
        solutionPath.length &&
        !Array.isArray(
            solutionPath[0]
        )
    ) {

        return [

            solutionPath
                .filter(
                    player =>
                        player &&
                        player.id
                )
                .map(
                    player => ({

                        id:
                            Number(
                                player.id
                            ),

                        name:
                            String(
                                player.name ||
                                ""
                            )

                    })
                )

        ];

    }


    return solutionPath
        .filter(
            path =>
                Array.isArray(path) &&
                path.length
        )
        .map(
            path =>
                path
                    .filter(
                        player =>
                            player &&
                            player.id
                    )
                    .map(
                        player => ({

                            id:
                                Number(
                                    player.id
                                ),

                            name:
                                String(
                                    player.name ||
                                    ""
                                )

                        })
                    )
        )
        .filter(
            path =>
                path.length
        );

}


/* =========================================================
   SAVE SOLUTION PATH
========================================================= */

async function saveTeammateSolutionPath(
    date,
    path
) {

    const serialized =
        serializeTeammateSolutionPath(
            path
        );


    if (
        !serialized.length
    ) {

        console.error(
            "Cannot save empty Teammate solution path."
        );


        return null;

    }


    const {
        data,
        error
    } =
        await db
        .from("teammateGames")
        .update({

            solutionPath:
                serialized

        })
        .eq(
            "date",
            date
        )
        .select()
        .single();


    if (error) {

        console.error(
            "Failed to save Teammate solution path:",
            error
        );


        return null;

    }


    console.log(
        "Teammate solution path saved:",
        serialized
    );


    return data;

}


/* =========================================================
   ENSURE SOLUTION PATH
========================================================= */

async function ensureTeammateSolutionPath(
    dailyGame
) {

    if (
        !dailyGame
    ) {

        return [];

    }


    if (
        Array.isArray(
            dailyGame.solutionPath
        ) &&
        dailyGame.solutionPath.length
    ) {

        const existingPath =
            restoreTeammateSolutionPath(
                dailyGame.solutionPath
            );


        if (
            existingPath.length
        ) {

            teammateGeneratedSolutionPath =
                existingPath;


            return existingPath;

        }

    }


    console.log(
        "No saved Teammate solutionPath. Finding shortest solution..."
    );


    teammateGeneratedStartPlayer =
        createDailyPlayerObject(
            dailyGame.startPlayerId,
            dailyGame.startPlayerName,
            dailyGame.startPlayerInfo
        );


    teammateGeneratedEndPlayer =
        createDailyPlayerObject(
            dailyGame.endPlayerId,
            dailyGame.endPlayerName,
            dailyGame.endPlayerInfo
        );


    const solution =
        await findTeammateSolutionPath(
            dailyGame.startPlayerId,
            dailyGame.endPlayerId
        );


    if (
        !solution ||
        !solution.length
    ) {

        throw new Error(
            "Could not find a solution path for today's Teammate game."
        );

    }


    teammateGeneratedSolutionPath =
        solution;


    await saveTeammateSolutionPath(
        dailyGame.date,
        solution
    );


    return solution;

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


    return (
        `https://img.mlbstatic.com/mlb-photos/image/upload/` +
        `w_213,q_auto:best/` +
        `v1/people/${playerId}/headshot/67/current`
    );

}


/* =========================================================
   HEADSHOT VALIDATION
========================================================= */

function hasValidHeadshot(
    playerId
) {

    if (!playerId) {

        return Promise.resolve(
            false
        );

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

                    if (
                        finished
                    ) {

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
   GENERATION STORAGE
========================================================= */

function getGenerationStorageKey(
    dateString
) {

    return (
        `teammateGeneration_${dateString}`
    );

}


function getPreviousPairStorageKey(
    dateString
) {

    return (
        `teammatePreviousPair_${dateString}`
    );

}


function getGenerationNumberForDate(
    dateString
) {

    const key =
        getGenerationStorageKey(
            dateString
        );


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
                getPreviousPairStorageKey(
                    dateString
                )
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

            getPreviousPairStorageKey(
                dateString
            ),

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
            `Unable to remember previous pair for ${dateString}:`,
            error
        );

    }

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
   GENERATE GAME FOR SPECIFIC DATE
========================================================= */

async function generateTeammateGameForDate(
    dateString
) {

    const {
        data: existingGame,
        error: existingError
    } =
        await db
        .from("teammateGames")
        .select("*")
        .eq(
            "date",
            dateString
        )
        .maybeSingle();


    if (existingError) {

        throw existingError;

    }


    if (existingGame) {

        if (
            !Array.isArray(
                existingGame.solutionPath
            ) ||
            !existingGame.solutionPath.length
        ) {

            await ensureTeammateSolutionPath(
                existingGame
            );

        }


        console.log(
            `Game already exists for ${dateString}.`
        );


        return existingGame;

    }


    const generationSeed =
        Math.floor(
            Math.random() *
            2147483647
        );


    const seasonRange =
        TEAMMATE_MAX_SEASON -
        TEAMMATE_MIN_SEASON +
        1;


    const startSeason =
        TEAMMATE_MIN_SEASON +
        Math.floor(
            Math.random() *
            seasonRange
        );


    const endSeason =
        TEAMMATE_MIN_SEASON +
        Math.floor(
            Math.random() *
            seasonRange
        );


    console.log(
        `Generating NEW Teammate game for ${dateString}:`,
        {
            startSeason,
            endSeason,
            generationSeed
        }
    );


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


    console.log(
        `Selected NEW teammate connection for ${dateString}:`,
        {
            start:
                foundPair.start.name,

            end:
                foundPair.end.name,

            generationSeed
        }
    );


    teammateGeneratedStartPlayer =
        foundPair.start;


    teammateGeneratedEndPlayer =
        foundPair.end;


    console.log(
        `Finding solution for ${dateString}:`,
        foundPair.start.name,
        "→",
        foundPair.end.name
    );


    const solution =
        await findTeammateSolutionPath(
            foundPair.start.id,
            foundPair.end.id
        );


    if (
        !solution ||
        !solution.length
    ) {

        throw new Error(
            `Could not find a solution for ${dateString}.`
        );

    }


    teammateGeneratedSolutionPath =
        solution;


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
                foundPair.end.raw,

            solutionPath:
                serializeTeammateSolutionPath(
                    solution
                )

        })
        .select()
        .single();


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


            if (
                Array.isArray(
                    existingAfterInsert.solutionPath
                ) &&
                existingAfterInsert.solutionPath.length
            ) {

                teammateGeneratedSolutionPath =
                    restoreTeammateSolutionPath(
                        existingAfterInsert.solutionPath
                    );

            }
            else {

                await ensureTeammateSolutionPath(
                    existingAfterInsert
                );

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
        `Successfully created NEW Teammate game for ${dateString}:`,
        insertedGame.startPlayerName,
        "→",
        insertedGame.endPlayerName
    );


    console.log(
        "Solution:",
        solution
            .map(
                player =>
                    player.name
            )
            .join(
                " → "
            )
    );


    return insertedGame;

}


/* =========================================================
   PRE-POPULATE UPCOMING GAMES
========================================================= */

async function populateUpcomingTeammateGames(
    baseDateString,
    numberOfDays = 5
) {

    try {

        const baseDate =
            new Date(
                `${baseDateString}T12:00:00`
            );


        for (
            let offset = 0;
            offset < numberOfDays;
            offset++
        ) {

            const date =
                new Date(
                    baseDate
                );


            date.setDate(
                baseDate.getDate() +
                offset
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
   LOAD DAILY GAME
========================================================= */

async function loadTeammateDailyGameForDate(
    dateString
) {

    const {
        data,
        error
    } =
        await db
        .from("teammateGames")
        .select("*")
        .eq(
            "date",
            dateString
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Teammate daily game load error:",
            error
        );


        throw error;

    }


    if (data) {

        teammateGeneratedStartPlayer =
            createDailyPlayerObject(
                data.startPlayerId,
                data.startPlayerName,
                data.startPlayerInfo
            );


        teammateGeneratedEndPlayer =
            createDailyPlayerObject(
                data.endPlayerId,
                data.endPlayerName,
                data.endPlayerInfo
            );


        if (
            Array.isArray(
                data.solutionPath
            ) &&
            data.solutionPath.length
        ) {

            teammateGeneratedSolutionPath =
                restoreTeammateSolutionPath(
                    data.solutionPath
                );

        }
        else {

            teammateGeneratedSolutionPath =
                await ensureTeammateSolutionPath(
                    data
                );

        }


        rememberGeneratedPairForDate(
            dateString,
            data.startPlayerId,
            data.endPlayerId
        );


        return data;

    }


    return await generateTeammateGameForDate(
        dateString
    );

}


/* =========================================================
   GENERATOR API
========================================================= */

window.TeammateGenerator = {

    generateGame:
        generateTeammateGameForDate,

    loadGame:
        loadTeammateDailyGameForDate,

    populateUpcoming:
        populateUpcomingTeammateGames,

    findSolution:
        findTeammateSolutionPath,

    ensureSolution:
        ensureTeammateSolutionPath,

    getPlayer:
        getPlayer,

    getPlayerTeams:
        getPlayerTeams,

    getAllTeammates:
        getAllTeammates,

    wereTeammates:
        werePlayersTeammates,

    serializeSolution:
        serializeTeammateSolutionPath,

    restoreSolution:
        restoreTeammateSolutionPath

};


/* =========================================================
   AUTOMATIC GENERATOR TRIGGER
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            const now =
                new Date();


            const year =
                now.getFullYear();


            const month =
                String(
                    now.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    now.getDate()
                ).padStart(
                    2,
                    "0"
                );


            const dateString =
                `${year}-${month}-${day}`;


            console.log(
                "=============================================="
            );


            console.log(
                "TEAMMATE GENERATOR STARTED"
            );


            console.log(
                `Base date: ${dateString}`
            );


            console.log(
                "Checking/populating 5 days..."
            );


            console.log(
                "=============================================="
            );


            await populateUpcomingTeammateGames(
                dateString,
                5
            );


            console.log(
                "=============================================="
            );


            console.log(
                "TEAMMATE GENERATOR COMPLETE"
            );


            console.log(
                "=============================================="
            );

        }
        catch (error) {

            console.error(
                "=============================================="
            );


            console.error(
                "TEAMMATE GENERATOR FAILED"
            );


            console.error(
                error
            );


            console.error(
                "=============================================="
            );

        }

    }
);

