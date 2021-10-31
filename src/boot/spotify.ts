import { boot } from 'quasar/wrappers'
import  { SpotifyPlugin, SpotifyOAuthConfig } from '../plugins/spotifyplugin'
import * as configData from '../oauthconfig.json'

export default boot(({ app }) => {
  const config = configData as SpotifyOAuthConfig
  app.use(SpotifyPlugin, config)
});
