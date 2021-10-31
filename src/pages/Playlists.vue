<template>

  <div class="row">
        <q-card square class="q-pa-md shadow-0" style="background:none;">
          <q-card-actions class="q-px-sm">
            <q-btn
              unelevated
              color="light-blue-7"
              size="sm"
              class="full-width"
              label="Refresh"
              icon="refresh"
              @click="refresh()"
            />
          </q-card-actions>
        </q-card>
      </div>

    <q-list class="q-pa-md">
        <template v-if="loading">
          <div class="full-width row justify-center items-stretch content-center">
              <div class="col-auto self-center">
                <q-spinner
                  color="primary"
                  size="3em"
                  :thickness="10"
                />
              </div>
            </div>
          </template>
          
          <template v-else-if="items.length > 0">
            <template v-for="(menuItem, index) in items" :key="index">
            <q-item  :class="'style-' + ((index % 2) == 1)" class="q-pa-md">

              
               <q-item-section thumbnail>
                <img :src="menuItem.image" class="item-image q-pa-sm"  />
                {{image}}
              </q-item-section>
              
              
              <q-item-section>
                <q-item-label class="playlist-header" overline>{{menuItem.headline}}</q-item-label>
                <q-item-label>{{menuItem.single}}</q-item-label>
                <q-item-label caption>{{menuItem.image}}</q-item-label>
              </q-item-section>

              <q-item-section side top>
                <q-item-label caption>{{menuItem.label}}</q-item-label>
              </q-item-section>

             
            </q-item>
          </template>
          </template >
          
          <template v-else>
            <div class="full-width row justify-center items-stretch content-center">
              <div class="col-auto self-center">
                <q-btn color="primary" label="Go to login page" to="login" />
              </div>
            </div>
          </template>
    </q-list>    
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import { OAuthFunctionsKey, Spotify } from '../plugins/spotifyplugin'

interface ListItem {
  headline: string
  single: string
  text: string
  label: string
  image: string | undefined
}

export default defineComponent({
  name: 'Playlists',
  components: {  },

  setup () {
    const spotifyApi = inject<Spotify>(OAuthFunctionsKey)
     return {
       spotifyApi: spotifyApi
     }
  },

  data () {
    const empty: ListItem[] = []
    return {
      items: empty,
      loading: true
    }
  },

  activated() {
    console.log('activated')
  },

  async mounted() {
    console.log(JSON.stringify(this.$data))
    await this.refresh()
  },

  methods: {
    async refresh() {
      this.loading = true
      try {
        if (this.spotifyApi?.hasRefreshToken()) {
          const spotify = await this.spotifyApi.getSpotify()
          const playlists = await spotify.getUserPlaylists()
          this.items = playlists.items.map(itm => {
            return {
              headline: itm.name,
              single: itm.description ?? '',
              text: itm.description ?? '',
              label: '',
              image: itm.images.length > 0 ?  itm.images[0].url : undefined
            }
          })
        }
      } catch(e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    }
  }
  
});
</script>
