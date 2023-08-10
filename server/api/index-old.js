const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('../config/config')
const app = express()
app.use(bodyParser.json())
app.use(cors())
const {MongoClient} = require('mongodb')
const mongoClient = new MongoClient(config.dbURL)
app.listen(process.env.PORT || config.port,
  () => console.log(`Server started on port ${config.port}`))
  mongoClient.connect()
  const collection = mongoClient.db(config.dbName).collection(config.collectionName)

app.get('/', async (req, res)=> {
  res.send('App is kinda working')
})

app.get('/createUser', async(req, res) => {
  let check = true
  let code
  while (check) {
    code = `${randomInt()}`
    const results = await collection.find({uCode: code}).toArray()
    if (results.length) {
        check = true
    } else {
        check = false
    }
  }
  await collection.insertOne({uCode: code, tgId: '', tgToken: '', items: []})
  res.send(`${code}`)
})

app.post('/login', async(req, res) => {
  let code = req.body.code
  const results = await collection.find({uCode: code, tgId: {$ne: ''}}).toArray()
  if (results.length) {
    tgValidate(code)
    res.send(true)
  } else {
    res.send(false)
  }
})

app.post('/tgValidate', async(req, res) => {
  let code = req.body.code
  let tgToken = +req.body.tgToken
  const results = await collection.find({uCode: code, 'tgToken': tgToken}).toArray()
  if (results.length) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.post('/getItems', async(req, res) => {
  let code = req.body.code
  let tgToken = +req.body.tgToken
  const results = await collection.find({uCode: code, 'tgToken': tgToken}).toArray()
  if (results.length) {
    res.send(results[0].items)
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
  let id = name+quality
  
  const results = await collection.updateOne({uCode: user.code, tgToken: +user.tgToken, items: {$elemMatch: {'name': name, 'quality': quality}}}, {$set: {["items.$."+type]: value}})
  // const results = await collection.updateOne({uCode: user.code, tgToken: +user.tgToken, $and: [{"items.name": name}, {"items.quality": quality}]}, {$set: {["items.$."+type]: value}})
  // const results = await collection.updateOne({uCode: user.code, tgToken: +user.tgToken, "items.id": id}, {$set: {["items.$."+type]: value}})
  res.sendStatus(200)
})

app.post('/deleteItem', async(req, res)=>{
  let name = req.body.name
  let quality = req.body.quality
  let user = req.body.user
  collection.updateOne({uCode: user.code, tgToken: +user.tgToken}, {$pull: {items: {'name': name, 'quality': quality}}})
  res.sendStatus(200)
})

app.post('/addItem', async(req, res)=>{
  let name = req.body.name
  let quality = req.body.quality
  let user = req.body.user
  const result = await collection.find({uCode: user.code, tgToken: +user.tgToken, items: {$elemMatch:{name: name, quality: quality}}}).toArray()
  const img = await getImg(name, quality)
  const actualPrice = await getActualPrice(name, quality)
  if (!result.length) {
    collection.updateOne({uCode: user.code, tgToken: +user.tgToken}, {$push: {items: {'name': name, 'quality': quality, 'notifications': true, 'sendEqual': true, 'sendDifInCur': true, 'sendDifInPer': false, 
    'actualPrice': actualPrice, 'lastPrice': 0, 'img': img,
    }}})
    res.send(true)
  } else {
    res.send(false)
  }
})


app.get('/sendTest', async(req, res) => {
  updateItemsInfoAndSendMes()
  res.sendStatus(200)
})

//Bot
const TelegramBot = require('node-telegram-bot-api')
const token = '2122949039:AAF3nM-32LTJSwqBvKUbddt8LMOjWooYWK8'
const bot = new TelegramBot(token, { polling: true })

async function updateItemsInfoAndSendMes() {//возможно имеет смысл пересмотреть логику и слать не "всем сразу"
  
  const results = await collection.find({tgId: {$ne: ''}, items: {$exists : true}}).toArray()
  results.forEach(async user=>{
    let items = user.items
    let mesToSend = ''
    counter = 0
    for (let i = 0; i < items.length; i++) { //есть ли смысл делать опрос предметов по которым нет нотификации???

      const name = items[i].name
      const quality = items[i].quality //(БЕЗ СКОБОК!!!)
      
      const ready = quality ? `${name} (${quality})` : `${name}` //строка в формате AK47 | Asiimov (Factory new)
      const uri = 'https://steamcommunity.com/market/priceoverview/?country=ru&currency=5&appid=730&market_hash_name=';
      const url = encodeURI(uri+ready); //ссылка для получения инфо
      
      // const url = 'https://www.random.org/integers/?num=1&min=1&max=5&col=1&base=10&format=plain&rnd=new'
      let newPrice = await getActualPrice(name, quality)
      counter++
      items[i].lastPrice = items[i].actualPrice
      items[i].actualPrice = newPrice
      collection.updateOne({uCode: user.uCode}, {$set: {items: items}})
      mesToSend+=oneMes(items[i], quality)
      if (counter == items.length && mesToSend) {
          bot.sendMessage(user.tgId, mesToSend)
      }
    }
  })
}
updateItemsInfoAndSendMes()
setInterval(updateItemsInfoAndSendMes, config.updateTime)

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
  const result = await collection.find({uCode: code}).toArray()
  let chatId = result[0].tgId
  await collection.updateOne({uCode: code}, {$set: {tgToken: tgToken}})
  bot.sendMessage(chatId, `<code>${tgToken}</code>`, {parse_mode: 'HTML'})
}

bot.onText(/\/login (.+)/, async(msg, match) => {
	const chatId = msg.chat.id
	const code = match[1]
  const results = await collection.find({uCode: code, tgId: ''}).toArray()
  if (results.length) {
    collection.updateOne({uCode: code}, { $set: {tgId: chatId}})
    bot.sendMessage(chatId, `Code linked successfully!`)
  } else {
    bot.sendMessage(chatId, `No such a user!`)
  }
})

bot.onText(/\/unlink/, async(msg) => {
	const chatId = msg.chat.id
  const results = await collection.find({tgId: chatId}).toArray()
  if (results.length) {
    collection.updateOne({tgId: chatId}, { $set: {"tgId": ''}})
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