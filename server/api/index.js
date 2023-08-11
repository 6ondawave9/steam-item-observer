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
  password: '***',
  host: 'ep-cold-haze-44988210-pooler.eu-central-1.postgres.vercel-storage.com',
  port: 5432,
  database: 'verceldb',
  ssl: 'true'
})

app.get('/', async (req, res)=> {
  res.send('OK')
})

app.get('/createUser', async(req, res) => {
  const users = await pool.query('SELECT Ucode FROM users')
  let ucodes = []
  users.rows.forEach((el)=>{ucodes.push(el.ucode)})
  let code = `${randomInt()}`
  while (ucodes.indexOf(code) != -1) {
    code = `${randomInt()}`
  }
  pool.query(`INSERT INTO users (Ucode,Tgid,Tgtoken,Items) VALUES (${code},0,0,'[]')`)
  res.send(`${code}`)
})

app.post('/login', async(req, res) => {
  let code = req.body.code.replace(/[^+\d]/g, '')
  if (!code.length) {
    res.send(false)
    return
  }
  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${code} AND Tgid != 0`)
  results = results.rows
  if (results.length) {
    await tgValidate(code)
    res.send(true)
  } else {
    res.send(false)
  }
})

app.post('/tgValidate', async(req, res) => {
  let code = req.body.code
  let tgToken = +req.body.tgToken
  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${code} AND Tgtoken = ${tgToken}`)
  results = results.rows
  if (results.length) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.post('/getItems', async(req, res) => {
  let code = req.body.code
  let tgToken = +req.body.tgToken
  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${code} AND Tgtoken = ${tgToken}`)
  results = results.rows
  if (results.length) {
    res.send(JSON.parse(results[0].items))
  } else {
    res.send(false)
  }
})

app.post('/cahngeSettings', async(req, res) => {
  let user = req.body.user
  let type = req.body.type
  let value = req.body.value
  let name = req.body.name
  let quality = req.body.quality
  
  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)
  results = JSON.parse(results.rows[0].items)
  for (let i = 0; i < results.length; i++) {
    if (results[i].name == name && results[i].quality == quality) {
      results[i][type] = value

      results = JSON.stringify(results)
      await pool.query(`UPDATE users SET Items = '${results}' WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)

      res.sendStatus(200)

      return
    }
  }
})

app.post('/deleteItem', async(req, res)=>{
  let name = req.body.name
  let quality = req.body.quality
  let user = req.body.user
  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)
  results = JSON.parse(results.rows[0].items)
  for (let i = 0; i < results.length; i++) {
    if (results[i].name == name && results[i].quality == quality) {
      results.splice(i ,1)

      results = JSON.stringify(results)
      await pool.query(`UPDATE users SET Items = '${results}' WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)

      res.sendStatus(200)

      return
    }
  }
})

app.post('/addItem', async(req, res)=>{
  let name = req.body.name
  let quality = req.body.quality
  let user = req.body.user

  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)
  results = JSON.parse(results.rows[0].items)
  if (results.length) {
    for (let i = 0; i < results.length; i++) {
      if (results[i].name == name && results[i].quality == quality) {
        res.send(false)
        return
      }
    }
    const img = await getImg(name, quality)
    const actualPrice = await getActualPrice(name, quality)
    results.push({name: name, quality: quality, notifications: true, sendEqual: true, sendDifInCur: true, sendDifInPer: false, 
    actualPrice: actualPrice, lastPrice: 0, img: img,})
    results = JSON.stringify(results)
    await pool.query(`UPDATE users SET Items = '${results}' WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)
    res.send(true)
  } else {
    const img = await getImg(name, quality)
    const actualPrice = await getActualPrice(name, quality)
    results.push({name: name, quality: quality, notifications: true, sendEqual: true, sendDifInCur: true, sendDifInPer: false, 
    actualPrice: actualPrice, lastPrice: 0, img: img,})
    results = JSON.stringify(results)
    await pool.query(`UPDATE users SET Items = '${results}' WHERE Ucode = ${user.code} AND Tgtoken = ${+user.tgToken}`)
    res.send(true)
  }
})

app.get('/sendTest', async(req, res) => {
  updateItemsInfoAndSendMes()
  res.sendStatus(200)
})

//Bot
const TelegramBot = require('node-telegram-bot-api')
const token = '***'
const bot = new TelegramBot(token, { polling: true })

async function updateItemsInfoAndSendMes() {//возможно имеет смысл пересмотреть логику и слать не "всем сразу"
  
  let results = await pool.query(`SELECT * FROM users WHERE Tgid != 0 AND Items != '[]'`)
  results = results.rows
  results.forEach(async user=>{
    let items = JSON.parse(user.items)
    let mesToSend = ''
    counter = 0
    for (let i = 0; i < items.length; i++) { //есть ли смысл делать опрос предметов по которым нет нотификации???

      const name = items[i].name
      const quality = items[i].quality //(БЕЗ СКОБОК!!!)
      
      let newPrice = await getActualPrice(name, quality)
      counter++
      items[i].lastPrice = items[i].actualPrice
      items[i].actualPrice = newPrice

      pool.query(`UPDATE users SET Items = '${JSON.stringify(items)}' WHERE Ucode = ${user.ucode}`)

      mesToSend+=oneMes(items[i], quality)
      if (counter == items.length && mesToSend) {
          bot.sendMessage(user.tgid, mesToSend)
      }
    }
  })
}
// updateItemsInfoAndSendMes()
// setInterval(updateItemsInfoAndSendMes, config.updateTime)

function oneMes(item, quality) {
  if (item.notifications) {
    if (+item.actualPrice > +item.lastPrice) {
      return `📈 Предмет "${item.name}${quality?' ('+quality+')':''}" вырос в цене!\n${item.lastPrice} руб. ➡️ ${item.actualPrice} руб.${item.sendDifInCur?'\n+'+(Number(item.actualPrice)-Number(item.lastPrice)).toFixed(2)+'руб.':''}${item.sendDifInPer?'\n+'+String(Math.round(Number(item.actualPrice)/Number(item.lastPrice)*100-100))+'%':''}`+'\n------------------------------------------\n'
    } else if (+item.actualPrice < +item.lastPrice) {
      return `📉 Предмет "${item.name}${quality?' ('+quality+')':''}" упал в цене!\n${item.lastPrice} руб. ➡️ ${item.actualPrice} руб.${item.sendDifInCur?'\n-'+(Number(item.lastPrice)-Number(item.actualPrice)).toFixed(2)+'руб.':''}${item.sendDifInPer?'\n-'+String(Math.round(100-(Number(item.actualPrice)*100/Number(item.lastPrice))))+'%':''}`+'\n------------------------------------------\n'
    } else if(item.sendEqual) {
      return `📍 Предмет "${item.name}${quality?' ('+quality+')':''}" не поменялся в цене!\nЦена: ${item.actualPrice} руб.`+'\n------------------------------------------\n'
    } else {
      return ''
    }
  } else {
    return ''
  }
}

async function tgValidate(code) {
  let tgToken = randomInt()
  let result = await pool.query(`SELECT * FROM users WHERE Ucode = ${code}`)
  result = result.rows
  let chatId = result[0].tgid
  await pool.query(`UPDATE users SET Tgtoken = ${tgToken} WHERE Ucode = ${code}`)
  bot.sendMessage(chatId, `<code>${tgToken}</code>`, {parse_mode: 'HTML'})
}

bot.onText(/\/login (.+)/, async(msg, match) => {
	const chatId = msg.chat.id
	const code = match[1]

  let results = await pool.query(`SELECT * FROM users WHERE Ucode = ${code} AND Tgid = 0`)
  results = results.rows

  if (results.length) {

    pool.query(`UPDATE users SET Tgid = ${chatId} WHERE Ucode = ${code}`)

    bot.sendMessage(chatId, `Code linked successfully!`)
  } else {
    bot.sendMessage(chatId, `No such a user!`)
  }
})

bot.onText(/\/unlink/, async(msg) => {
	const chatId = msg.chat.id

  let results = await pool.query(`SELECT * FROM users WHERE Tgid = ${chatId}`)
  results = results.rows

  if (results.length) {

    pool.query(`UPDATE users SET Tgid = 0 WHERE Tgid = ${chatId}`)

    bot.sendMessage(chatId, `Code unlinked successfully!`)
  } else {
    bot.sendMessage(chatId, `No such a user!`)
  }
})

//Tools
function randomInt(min = 10_000, max = 99_999) {
  let rand = min - 0.5 + Math.random() * (max - min + 1)
  return Math.round(rand)
}

async function getImg(name, quality) {
  let url = 'https://csgobackpack.net/api/GetItemPrice/?currency=RUB&id='+encodeURI(`${name}${quality?' ('+quality+')':''}`)+'&time=7&icon=1'
  const axios = require('axios');
  try {
    let response = await axios.get(url)
    console.log(response)
    if (response.data.success == 'false') {throw new Error}
    else {return response.data.icon}
  } catch (e) {
    console.log(`\x1b[33mGetImgError: item (${name})\x1b[0m`)
    return undefined
  }
}

async function getActualPrice(name, quality) {
  const ready = quality ? `${name} (${quality})` : `${name}` //строка в формате AK47 | Asiimov (Factory new)
  const uri = 'https://steamcommunity.com/market/priceoverview/?country=ru&currency=5&appid=730&market_hash_name=';
  const url = encodeURI(uri+ready); //ссылка для получения инфо
  const axios = require('axios');
  try {
    const response = await axios.get(url)
    return +response.data.lowest_price.split(' ')[0].replace(/,/, '.') //цена в формате 1234.56
  } catch(e){
    console.log(`\x1b[33mGetPriceError: item (${name})\x1b[0m`)
    return undefined
  }
}
