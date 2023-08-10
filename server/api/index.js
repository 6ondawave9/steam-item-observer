const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('../config/config')
const app = express()
app.use(bodyParser.json())
app.use(cors())
app.listen(process.env.PORT || config.port,
  () => console.log(`Server started on port ${config.port}`))

app.get('/', async (req, res)=> {
  const TelegramBot = require('node-telegram-bot-api')
  const token = '2122949039:AAF3nM-32LTJSwqBvKUbddt8LMOjWooYWK8'
  const bot = new TelegramBot(token, { polling: true })
  bot.sendMessage(298332074, 'Hello from prod!')
  res.send('App is kinda working')
})