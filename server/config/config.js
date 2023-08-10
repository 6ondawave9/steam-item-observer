module.exports = {
  port: 8081,
  dbURL: 'mongodb://127.0.0.1:27017',
  dbName: 'SteamItemObserver', //Название коллекции БД
  collectionName: 'Users', //Название коллекции
  updateTime: 24*60*60*1000, //Промежуток отправки уведомления в ms
}