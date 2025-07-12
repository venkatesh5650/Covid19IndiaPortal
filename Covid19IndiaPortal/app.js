const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

// DATABASE INITIALIZATION

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

// LOGIN THE USER

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// AUTHENTICATION OF TOKEN (MIDLLEWARE FUNCTION)

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

// GET THE LIST OF STATES

app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      state_id as stateId,
      state_name as stateName,
      population
    FROM
      state
    ORDER BY
      state_id;`
  const statesArray = await db.all(getStatesQuery)
  response.send(statesArray)
})

// GET THE SPECIFIC STATE BASED ON STATEID
//Path: /states/:stateId/
//Method: GET

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT
      state_id as stateId,
      state_name as stateName,
      population
    FROM
      state
    WHERE state_id='${stateId}';`
  const stateArray = await db.get(getStateQuery)
  response.send(stateArray)
})

//Path: /districts/
//Create a district in district table(API4)

app.post('/districts/', authenticateToken, async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
    INSERT INTO
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
        '${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
         ${deaths}
      );`

  await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

//API5

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `
    SELECT
      district_id as districtId,
      district_name as districtName,
      state_id as stateId,
      cases,
      cured,
      active,
      deaths
    FROM
      district
    WHERE district_id='${districtId}';`
    const districtArray = await db.get(getDistrictQuery)
    response.send(districtArray)
  },
)

// Path: /districts/:districtId/ API6

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`
    await db.run(deleteDistrictQuery)

    response.send('District Removed')
  },
)

// Path: /districts/:districtId/(API7)

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
         state_id=${stateId},
         cases=${cases},
         cured=${cured},
         active=${active},
         deaths=${deaths}
    WHERE
      district_id = ${districtId};`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//Path: /states/:stateId/stats/(API8)

app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params

    const getStateQuery = `
    SELECT
      sum(cases) as totalCases,
      sum(cured) as totalCured,
      sum(active) as totalActive,
      sum(deaths) as totalDeaths
    FROM
      state
    JOIN
      district
    ON state.state_id=district.state_id
    WHERE state.state_id='${stateId}';`
    const stateArray = await db.get(getStateQuery)
    response.send(stateArray)
  },
)

module.exports = app
