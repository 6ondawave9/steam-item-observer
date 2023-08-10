<template>
  <div>
    <!-- Dev -->
    <!-- <button @click="test()">Send notification</button> -->
    <!---->
    <button @click="exit()">Exit</button>
    <button @click="addItem(newItemName, newItemQuality)">Add</button>

    <br>
    <br>
    <input type="text" v-model="newItemName">
    <select v-model="newItemQuality">
        <option value="Factory New">Factory New</option>
        <option value="Minimal Wear">Minimal Wear</option>
        <option value="Field-Tested">Field-Tested</option>
        <option value="Well-Worn">Well-Worn</option>
        <option value="Battle-Scarred">Battle-Scarred</option>
        <option value="">None</option>
    </select>

    <h2>Home</h2>
    <img v-if="!items.length" :src="loader">
    <div class="item-container" v-for="el in items" :key="el">
        <div style="text-align: center; width: 300px;">
            <a target="_blank" :href="'https://steamcommunity.com/market/listings/730/'+encodeURI(el.quality ? `${el.name} (${el.quality})` : `${el.name}`)">{{ el.name }} {{ el.quality?'('+el.quality+')':'' }}</a><br>{{el.actualPrice+' руб.' }}
        </div>
            <div style="display: flex; align-items: center;">
            🔔 <input :disabled="el.name == 'loading'" class="UIKV-switch" @change="(e)=>{updateSettings(e.target.id, e.target.checked, e.target.getAttribute('name'), e.target.getAttribute('quality'))}" id="notifications" :name="el.name" :quality="el.quality" :checked="el.notifications" type="checkbox">
            ⚖️ <input :disabled="el.name == 'loading'" class="UIKV-switch" @change="(e)=>{updateSettings(e.target.id, e.target.checked, e.target.getAttribute('name'), e.target.getAttribute('quality'))}" id="sendEqual" :name="el.name" :quality="el.quality" :checked="el.sendEqual" type="checkbox">
            💸 <input :disabled="el.name == 'loading'" class="UIKV-switch" @change="(e)=>{updateSettings(e.target.id, e.target.checked, e.target.getAttribute('name'), e.target.getAttribute('quality'))}" id="sendDifInCur" :name="el.name" :quality="el.quality" :checked="el.sendDifInCur" type="checkbox">
            📊 <input :disabled="el.name == 'loading'" class="UIKV-switch" @change="(e)=>{updateSettings(e.target.id, e.target.checked, e.target.getAttribute('name'), e.target.getAttribute('quality'))}" id="sendDifInPer" :name="el.name" :quality="el.quality" :checked="el.sendDifInPer" type="checkbox">
            <div style="cursor: pointer; margin-left: 15px;" :name="el.name" :quality="el.quality" @click="(e)=>{deleteItem(e.target.getAttribute('name'), e.target.getAttribute('quality'))}">🗑️</div>
        </div>
        <div class="item-container-img" style="display: flex; justify-content: center; height: 110px; width: 150px;"><img style="height: 110px;" :src="el.img ? el.img : loader"></div>
    </div>
  </div>
</template>
<script>
import services from '@/services/services'
export default {
    data() {
        return {
            loader: 'https://i.gifer.com/origin/b4/b4d657e7ef262b88eb5f7ac021edda87.gif',
            user: '',
            items: [],
            imgs: {},
            newItemName: '',
            newItemQuality: ''
        }
    },
    methods: {
        updateSettings(targetId, checked, name, quality) {
            services.cahngeSettings(this.user, targetId, checked, name, quality)
        },
        async deleteItem(name, quality) {
            let indexOfItemToDelete = this.items.findIndex(el => el.name == name && el.quality == quality)
            if (indexOfItemToDelete) {
                this.items.splice(indexOfItemToDelete, 1)
            }
            await services.deleteItem(this.user, name, quality)
            let items = await services.getItems(this.user.code, this.user.tgToken)
            this.items = items.data
        },
        async addItem(name, quality) {
            this.newItemName = ''
            this.newItemQuality = ''
            this.items.push({
                actualPrice: 'loading',
                img: '',
                lastPrice: 'loading',
                name: 'loading',
                notifications: true,
                quality: 'loading',
                sendDifInCur: true,
                sendDifInPer: false,
                sendEqual: true
            })
            await services.addItem(this.user, name, quality)
            let items = await services.getItems(this.user.code, this.user.tgToken)
            this.items = items.data
        },
        //Dev
        test() {
            services.sendTest()
        },
        //Dev
        exit() {
            this.$router.push('/')
        }
    },
    async mounted(){
        this.user = {
            code: this.$route.query.user,
            tgToken: this.$route.query.tgToken
        }
        let resValidation = await services.tgValidate(this.user.code, this.user.tgToken)
        if (!resValidation.data) {
            this.$router.push('/')
        }
        let items = await services.getItems(this.user.code, this.user.tgToken)
        this.items = items.data
    }
}
</script>

<style>
:root {
    --light-color: #D3E4F2;
    --dark-color: #6B98BD;
}
.UIKV-switch {
    margin-right: 10px;
    -webkit-appearance: none;
    appearance: none;
    width: 35px;
    height: 18px;
    background-color: var(--light-color);
    border-radius: 25px;
    transition: all 0.3s;
    cursor: pointer;
    position: relative;
}
.UIKV-switch::after{
    content: '';
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: #fff;
    position: absolute;
    top: 50%;
    left: 30%;
    transform: translate(-50%, -50%);
    transition: all 0.3s;

}
.UIKV-switch:checked{
    background: var(--dark-color);
}
.UIKV-switch:checked::after{
    left: 70%;
}
.item-container {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
}
@media (max-width: 600px) {
    .item-container {
        flex-direction: column;
        margin-bottom: 16px;
    }
    .item-container-img {
        order: -1;
    }
}
</style>