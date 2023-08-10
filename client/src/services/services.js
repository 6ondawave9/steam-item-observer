import api from '@/services/api'
export default {
  createUser() {
    return api().get('createUser')
  },
  login(code) {
    return api().post('login', {code: code})
  },
  tgValidate(codeToLogin, tgToken){
    return api().post('tgValidate', {code: codeToLogin, tgToken: tgToken})
  },
  getItems(codeToLogin, tgToken){
    return api().post('getItems', {code: codeToLogin, tgToken: tgToken})
  },
  cahngeSettings(user, type, value, name, quality) {
    return api().post('cahngeSettings', {user: user, type: type, value: value, name: name, quality: quality})
  },
  deleteItem(user, name, quality) {
    return api().post('deleteItem', {user: user, name: name, quality: quality})
  },
  addItem(user, name, quality) {
    return api().post('addItem', {user: user, name: name, quality: quality})
  },
  //Dev
  sendTest() {
    return api().get('sendTest')
  },
  //
}