<template>
  <div>
    <button v-if="loginState!='question'" @click="loginState='question'">Назад</button>

    <div v-if="loginState=='question'">
        <h2>У Вас есть аккаунт?</h2>
        <button @click="loginState='sing_in'">Войти</button>
        <button @click="()=>{loginState='sing_up'; createUser()}">Получить код</button>
    </div>

    <div v-if="loginState=='sing_in'">
        <h2>Введите Ваш код:</h2>
        <input type="text" v-model="codeToLogin">
        <button @click="login()">Войти</button>

        <div v-if="tgValidationState">
            <h2>Введите код от бота:</h2>
            <input type="text" v-model="tgToken">
            <button @click="tgValidate()">Войти</button>
        </div>

    </div>

    <div v-if="loginState=='sing_up'">
        <h2>Ваш код: <strong>{{ newCode }}</strong></h2>
        <h2>Напишите боту: /login {{ newCode }} для завершения регистрации</h2>
    </div>
  </div>
</template>

<script>
import services from '@/services/services'
export default {
    data() {
        return {
            loginState: 'question', //question, sing_in, sing_up
            newCode: '',
            codeToLogin: '',
            tgValidationState: false,
            tgToken: ''
        }
    },
    methods: {
        async createUser() {
            let resCheck = await services.createUser()
            this.newCode = resCheck.data
        },
        async login() {
            let resLogin = await services.login(this.codeToLogin)
            if (resLogin.data) {
                this.tgValidationState = true
            }
        },
        async tgValidate() {
            let resValidation = await services.tgValidate(this.codeToLogin, this.tgToken)
            if (resValidation.data) {
                this.$router.push({path:'/home', query: {user: this.codeToLogin, tgToken: this.tgToken}})
            }
        }
    }
}
</script>

<style>

</style>