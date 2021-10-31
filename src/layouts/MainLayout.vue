<template>
  <q-layout view="hHh lpR fFf">

    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Spotify OAuth Flow Example
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" overlay elevated>
      <!-- drawer content -->
      <q-list >
            <template v-for="(menuItem, index) in menuList" :key="index">
              <q-item clickable :to="menuItem.path" :active="menuItem.label === 'Outbo'" v-ripple>
                <q-item-section avatar>
                  <q-icon :name="menuItem.icon" />
                </q-item-section>
                <q-item-section>
                  {{ menuItem.label }}
                </q-item-section>
              </q-item>
              <q-separator :key="'sep' + index"  v-if="menuItem.separator" />
            </template>
          </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>


<script lang="ts">

const menuList = [
  {
    icon: 'list',
    label: 'Playlists',
    separator: true,
    path: '/'
  },
  {
    icon: 'login',
    label: 'Spotify Login',
    separator: false,
    path: 'login'
  },
  
];

import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'MainLayout',

  components: {
    //EssentialLink
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const $q = useQuasar()
    $q.dark.set(true) // or false or "auto"

    return {
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      menuList
    }
  }
})
</script>