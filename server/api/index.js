const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('../config/config')
const app = express()
app.use(bodyParser.json())
app.use(cors())
app.listen(process.env.PORT || config.port,
  () => console.log(`Server started on port ${config.port}`))

const Pool = require('pg').Pool
const pool = new Pool({
  user: 'default',
  password: 'LEC4Ic7hPWRJ',
  host: 'ep-cold-haze-44988210-pooler.eu-central-1.postgres.vercel-storage.com',
  port: 5432,
  database: 'verceldb',
  ssl: 'true'
})

app.get('/', async (req, res)=> {
  res.send('App is kinda working!')
})

app.get('/Ucodes', async (req, res)=> {
  const Ucodes = await pool.query('SELECT * FROM users')
  res.json(Ucodes.rows)
})

//Bot
const TelegramBot = require('node-telegram-bot-api')
const token = '2122949039:AAF3nM-32LTJSwqBvKUbddt8LMOjWooYWK8'
const bot = new TelegramBot(token, { polling: true })
bot.sendMessage(298332074, 'Hello')