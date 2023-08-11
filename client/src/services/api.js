import axios from 'axios'
export default () => {
  return axios.create({
    baseURL: 'https://steam-item-observer-server.vercel.app/'
  })
}