const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Returns a list of all the players in the player table (API1)

app.get('/players/', async (request, response) => {
  const getPlayersQuery = `
    SELECT
      player_id as playerId,
      player_name as playerName
    FROM
      player_details;`
  const playersArray = await db.all(getPlayersQuery)
  response.send(playersArray)
})

//Returns a specific player based on the player ID (API2)

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayersQuery = `
    SELECT
      player_id as playerId,
      player_name as playerName
    FROM
      player_details
    WHERE 
      player_id=${playerId};`

  const playersArray = await db.get(getPlayersQuery)
  response.send(playersArray)
})

//Updates the details of a specific player based on the player ID (API3)

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const playerDetails = request.body
  const {playerName} = playerDetails
  const updatePlayerQuery = `
    UPDATE
      player_details
    SET
      player_name='${playerName}'
    WHERE
      player_id = ${playerId};`
  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

//Returns the match details of a specific match(API4)

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `
    SELECT
      match_id as matchId,
      match,
      year
    FROM
      match_details
    WHERE 
      match_id=${matchId};`

  const matchArray = await db.get(getMatchQuery)
  response.send(matchArray)
})

//Returns a list of all the matches of a player(API5)

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getPlayersQuery = `
    SELECT
      md.match_id as matchId,
      match,
      year
    FROM
      player_match_score as pms
    NATURAL JOIN
      match_details as md
    WHERE 
      player_id=${playerId};`

  const playersArray = await db.all(getPlayersQuery)
  response.send(playersArray)
})

//Returns a list of players of a specific match(APIT6)

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getPlayersQuery = `
    SELECT
      pd.player_id as playerId,
      pd.player_name as playerName 
    FROM
      player_details as pd
    JOIN
      player_match_score as pms
    ON
      pd.player_id=pms.player_id
    
    WHERE 
      match_id=${matchId};`

  const playersArray = await db.all(getPlayersQuery)
  response.send(playersArray)
})

//Returns the statistics of the total score, fours, sixes
// of a specific player based on the player ID (API7)

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getStatsQuery = `
    SELECT
      pd.player_id as playerId,
      pd.player_name as playerName,
      sum(pms.score) as totalScore,
      sum(pms.fours) as totalFours,
      sum(pms.sixes) as totalSixes
    FROM
      player_details as pd
    INNER JOIN
      player_match_score as pms
    ON
      pd.player_id=pms.player_id
    WHERE 
      pd.player_id=${playerId}
    GROUP BY
      pd.player_id
    ;`

  const playersArray = await db.get(getStatsQuery)
  response.send(playersArray)
})

module.exports = app
