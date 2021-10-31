<template>
    <q-page
    class="window-height window-width row justify-center bg-image"
  >
    <div class="fit column  justify-start items-start content-center q-pa-md">

      <template v-if="hint.trim().length > 0">
      <div class="row">
        <div class="q-markdown--note q-markdown--note--warning">
          {{hint}}
        </div>
      </div>
      </template>
      
      <template v-if="refreshToken.trim().length > 0">
      <div class="row">
        
        <div class="q-markdown--note q-markdown--note--info" style="max-width: 80%">
          <p>Refresh Token:</p>
          <p class="ellipsis"> {{refreshToken}} </p>
        </div>
      </div>
    </template>

    <template v-if="accessToken.trim().length > 0">
      <div class="row">
        <p>Access Token:</p><br/>
        <div class="q-markdown--note q-markdown--note--info">
          {{accessToken}}
        </div>
      </div>
    </template>

    <div class="q-pa-md">
      <q-ajax-bar
        ref="bar"
        position="bottom"
        color="accent"
        size="10px"
        skip-hijack
      />
      <q-btn color="primary" class=" q-mr-sm" label="Sign in with spotify" @click="executeAuthorization()" />
      <q-btn color="primary" label="Clear Token" @click="clearToken()" />
    </div>
    </div>
  </q-page>
</template>

<style src="@quasar/quasar-ui-qmarkdown/dist/index.css"></style>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import { OAuthFunctionsKey, Spotify } from '../plugins/spotifyplugin'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'Login',
  components: { 
   },

   setup() {
     const spotifyAuth = inject<Spotify>(OAuthFunctionsKey)
     const quasar = useQuasar()

     return {
       spotifyAuth: spotifyAuth,
       quasar: quasar
     }
   },

   data () {
    const text = 'You do not have a refresh token. Please sign in with spotify.'

    return {
      hint: text,
      refreshToken: '',
      accessToken: ''
    }
  },

  mounted() {
    this.updateToken()
  }, 

  methods: {
    async executeAuthorization() {
      try {
        const data = await this.spotifyAuth?.executeAuthorization()
        console.debug(JSON.stringify(data))
        this.refreshToken = data?.refreshToken ?? ''
        this.accessToken = data?.accessToken ?? ''

        await this.$router.push('/')
      } catch(e) {
        console.error(e)
        if (e instanceof Error) {
          const msg = e.message ?? ''
          this.quasar.notify({message: msg, position: 'top', type: 'negative'})
        }
      }
    },

    updateToken() {
      const token = this.spotifyAuth?.getRefreshToken()
      if (token) {
        this.hint = 'You already have a refresh token.'
      }
      this.refreshToken = token ?? ''      
    },

    clearToken() {
      this.spotifyAuth?.clearToken()
      this.updateToken()
    }
  }
  
});
</script>
