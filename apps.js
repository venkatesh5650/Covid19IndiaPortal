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
      const payload = {username: username}
      let jwtToken = jwt.sign(payload, 'secretKey')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Incorrect password')
    }
  }
})

const authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"]
  if (authHeader !== undefined){
    jwtToken=authHeader.split(" ")[1]
    if (jwtToken !== undefined){
        jwt.verify(jwtToken,"secretKey", async (error,payload) {
          if (error){
            response.status(400)
            response.send("Invalid Jwt Token")
          }
          else{
            request.username=payload.username
            next()
          }
        })
    }
    else{
      response.status(400)
      response.send("Invalid JWT token")
    }
  }
}
