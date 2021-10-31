import { Plugin, App } from 'vue'
import { InjectionKey } from 'vue';
import  SpotifyWebApi from 'spotify-web-api-js';
import { LocalStorage } from 'quasar'

interface OAuthAuthorizationProvider {
    executeAuthorization (clientId: string, scope: string): Promise<TokenData>
    performWithFreshTokens(): Promise<string>
    getTokenData(): TokenData | undefined
    initializeWithRefreshToken(clientId: string, scope: string, refreshToken: string): void
    flush(): void
}

declare global {
    interface Window { OAuth: OAuthAuthorizationProvider; }
}

class AuthorizationProviderNotSetError extends Error {
    constructor(message: string) {
      super(message);
      Object.setPrototypeOf(this, AuthorizationProviderNotSetError.prototype)
    }
  }

export interface Spotify {
    executeAuthorization(): Promise<TokenData | undefined>
    getSpotify(): Promise<SpotifyWebApi.SpotifyWebApiJs>
    hasRefreshToken(): boolean
    getRefreshToken(): string | undefined
    clearToken(): void
}

export const OAuthFunctionsKey: InjectionKey<Spotify> = Symbol('SpotifyApi');

export class SpotifyOAuthConfig {

    private _clientId: string
    public get clientId (): string {
        return this._clientId
    }

    private _redirectPort: number
    public get redirectPort (): number {
        return this._redirectPort
    }

    private _scopes: Array<string>
    public get scopes (): Array<string> {
        return this._scopes
    }
    
    constructor(clientId: string, redirectPort: number, scopes: Array<string>) {
        this._clientId = clientId
        this._redirectPort = redirectPort
        this._scopes = scopes
    }
}

interface TokenData {
    refreshToken: string
    accessToken: string
}

class SpotifyApiProvider implements Spotify {

    private _config: SpotifyOAuthConfig
    private _spotify: SpotifyWebApi.SpotifyWebApiJs;
    private static RefreshTokenStorageKey = 'spotify.refreshtoken'
    
    constructor(config: SpotifyOAuthConfig) {
        this._config = config
        this._spotify = new SpotifyWebApi()
    }

    async executeAuthorization (): Promise<TokenData | undefined> {
        const parameters = {
            response_type: 'code',
            client_id: this._config.clientId,
            scope: this._config.scopes.join(' '),
            redirect_uri: `http://localhost/callback:${this._config.redirectPort}`,
        }

        if (window.OAuth) {
            const tokenData = await window.OAuth.executeAuthorization(parameters.client_id, parameters.scope)
            this.storeRefreshToken(tokenData)
            return tokenData
        } else {
            throw new AuthorizationProviderNotSetError('The window does not have an oauth authorization provider')
        }
    }

    /**
     * @returns a SpotifyWebApi.SpotifyWebApiJs with a valid refresh token
     */
    async getSpotify() : Promise<SpotifyWebApi.SpotifyWebApiJs> {
        const token = await window.OAuth.performWithFreshTokens()
        this._spotify.setAccessToken(token)
        return this._spotify
    }

    storeRefreshToken(tokenData: TokenData | undefined = undefined) {
        tokenData = tokenData ? tokenData :  window.OAuth.getTokenData()
        if (tokenData) {
            LocalStorage.set(SpotifyApiProvider.RefreshTokenStorageKey, tokenData.refreshToken)
        }
    }

    getRefreshToken() : string | undefined {
        const item = LocalStorage.getItem(SpotifyApiProvider.RefreshTokenStorageKey)
        console.log('getRefreshToken')
        console.log(JSON.stringify(item))
        if (item) {
            return item as string
        }
    }

    hasRefreshToken() : boolean {
        const tokenData = this.getRefreshToken()
        return tokenData !== undefined
    }

    initialize(): void {
        const refreshToken = this.getRefreshToken()
        if (refreshToken) {
            const scope = this._config.scopes.join(' ')
            window.OAuth.initializeWithRefreshToken(this._config.clientId, scope, refreshToken)
        }
    }

    clearToken(): void {
        LocalStorage.remove(SpotifyApiProvider.RefreshTokenStorageKey)
        window.OAuth.flush()
    }
}

export const SpotifyPlugin : Plugin = {
    install (app: App, options: SpotifyOAuthConfig) {

        app.config.globalProperties.$spotifyConfig = options;
        
        const apiProvider = new SpotifyApiProvider(options)
        apiProvider.initialize()
        app.provide(OAuthFunctionsKey, apiProvider)
    }
}