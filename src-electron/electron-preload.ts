/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 */

const { contextBridge } = require('electron')
import { SpotifyAuth, TokenData } from './spotifyauthflow'

contextBridge.exposeInMainWorld('OAuth', {
   executeAuthorization: (clientId: string, scope: string) => {
      return SpotifyAuth.executeAuthorization(clientId, scope)
   },
   performWithFreshTokens: () => {
     return SpotifyAuth.performRequest()
   },
   getTokenData: () => {
     return SpotifyAuth.getTokenData()
   },
   
   initializeWithRefreshToken(clientId: string, scope: string, refreshToken: string): void {
    SpotifyAuth.initialize(clientId, scope, refreshToken)
   },
   flush: () => {
     SpotifyAuth.flush()
   }
 })
