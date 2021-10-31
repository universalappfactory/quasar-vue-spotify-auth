/**
 * executes the spotify authorization code flow
 * 
 * described here:
 * https://developer.spotify.com/documentation/general/guides/authorization/code-flow/
 * 
 * 
 * the classes are based on this example:
 * 
 * https://github.com/googlesamples/appauth-js-electron-sample
 * 
 */

import { AuthorizationRequest } from "@openid/appauth/built/authorization_request";
import {
  AuthorizationNotifier,
} from "@openid/appauth/built/authorization_request_handler";

import { NodeBasedHandler } from "@openid/appauth/built/node_support/node_request_handler";
import {
  BaseTokenRequestHandler,
  TokenRequestHandler
} from "@openid/appauth/built/token_request_handler";

import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest
} from "@openid/appauth/built/token_request";

import { NodeRequestor } from "@openid/appauth/built/node_support/node_requestor";
import { AuthorizationServiceConfiguration } from "@openid/appauth/built/authorization_service_configuration";
import { StringMap } from "@openid/appauth/built/types";
import {
  TokenResponse
} from "@openid/appauth/built/token_response";

import { EventEmitter } from "events"
import { AuthorizationResponse } from "@openid/appauth";

// the Node.js based HTTP client. 
const requestor = new NodeRequestor();

export interface ClientSettings {
  clientId: string
  redirectUri: string
  scope: string
  redirectPort: number
}

class NoCodeVerifierError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NoCodeVerifierError.prototype)
  }
}

class EmptyRefreshTokenError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EmptyRefreshTokenError.prototype)
  }
}

export class AuthStateEmitter extends EventEmitter {
  static ON_TOKEN_RESPONSE = "on_token_response";
}

export interface TokenData {
  refreshToken: string
  accessToken: string
}

interface AuthorizationRequstResponseData {
  response: AuthorizationResponse
  codeVerifyer: string
}


/**
 * executes the authorization request and exchanges the authorization code for an access token and refresh token
 */
class AuthorizationRequestFlow {

  private config: ClientSettings
  private static redirectPort: number = 1338
  private authorizationServiceConfiguration: AuthorizationServiceConfiguration;
  private tokenHandler: TokenRequestHandler;

  constructor(config: ClientSettings, authorizationServiceConfiguration: AuthorizationServiceConfiguration, tokenHandler: TokenRequestHandler) {
    this.config = config
    this.authorizationServiceConfiguration = authorizationServiceConfiguration
    this.tokenHandler = tokenHandler
  }

  private executeAuthorizationRequest(): Promise<AuthorizationRequstResponseData> {
    return new Promise<AuthorizationRequstResponseData>((resolve, reject) => {
      try {
        const notifier = new AuthorizationNotifier();

        const authorizationHandler = new NodeBasedHandler(AuthorizationRequestFlow.redirectPort)
        authorizationHandler.setAuthorizationNotifier(notifier);

        //listener for the authorization request
        notifier.setAuthorizationListener((request, response, error) => {
          console.log("Authorization request complete ", request, response, error);
          if (response) {
            
            let codeVerifier: string = '';
            if (request.internal && request.internal.code_verifier) {
              codeVerifier = request.internal.code_verifier;
            }
            
            if (codeVerifier.trim().length === 0) {
              throw new NoCodeVerifierError('code verifier must not be empty')
            }

            resolve({
              response: response,
              codeVerifyer: codeVerifier
            })
          }

          if (error) {
            console.error(error)
            reject(error)
          }
        });

        const request = new AuthorizationRequest({
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          scope: this.config.scope,
          response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
          state: undefined
        }, undefined, true);

        console.debug(JSON.stringify(request))
        authorizationHandler.performAuthorizationRequest(this.authorizationServiceConfiguration, request)
      } catch (e) {
        console.error(e)
        reject(e)
      }
    });
  }
  
  private requestAccessAndRefreshToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    
    return new Promise<TokenResponse>((resolve, reject) => {

      if (!this.authorizationServiceConfiguration) {
        console.error('Unknown authorizationServiceConfiguration');
        return reject('Unknown authorizationServiceConfiguration');
      }
  
      const extras: StringMap = {};
      extras.code_verifier = codeVerifier;
  
      // use the code to make the token request.
      let request = new TokenRequest({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
        code: code,
        refresh_token: undefined,
        extras: extras
      });
  
      return this.tokenHandler
        .performTokenRequest(this.authorizationServiceConfiguration, request)
        .then(response => {
          console.debug(`Refresh Token is ${response.refreshToken}`);
          console.debug(response)
          resolve(response)
        })
    })
  }

  async authorize(): Promise<TokenResponse> {
    const authorizationResponse = await this.executeAuthorizationRequest()
    const tokenData = await this.requestAccessAndRefreshToken(authorizationResponse.response.code, authorizationResponse.codeVerifyer)
    return tokenData
  }
}


export class SpotifyAuth {
  private static _instance: SpotifyAuth | null

  private config: ClientSettings
  private authorizationServiceConfiguration: AuthorizationServiceConfiguration;
  private tokenHandler: TokenRequestHandler;
  private initialRefreshToken: string | undefined
  private currentAccessTokenResponse: TokenResponse | undefined;

  private constructor(config: ClientSettings, initialRefreshToken: string | undefined = undefined) {
    this.config = config

    this.authorizationServiceConfiguration = new AuthorizationServiceConfiguration({
      authorization_endpoint: "https://accounts.spotify.com/authorize",
      token_endpoint: "https://accounts.spotify.com/api/token",
      revocation_endpoint: '',
    });

    this.tokenHandler = new BaseTokenRequestHandler(requestor);
    this.initialRefreshToken = initialRefreshToken
  }

  private async authorize() : Promise<TokenData> {
    const authorizationFlow = new AuthorizationRequestFlow(this.config, this.authorizationServiceConfiguration, this.tokenHandler)
    const response = await authorizationFlow.authorize()
    
    if (!response.refreshToken) {
      throw new EmptyRefreshTokenError('the refreshToken must not be empty') 
    }
    
    this.currentAccessTokenResponse = response
    return {
      refreshToken: response.refreshToken,
      accessToken: response.accessToken
    }
  }

  static getConfig(clientId: string, scope: string) : ClientSettings {

    return {
      clientId: clientId,
      redirectUri: 'http://127.0.0.1:1338/callback',
      redirectPort: 1338,
      scope: scope
    }
  }

  static executeAuthorization(clientId: string, scope: string): Promise<TokenData> {

      console.log('executeAuthorization')
      if (this._instance == null) {
        const config = SpotifyAuth.getConfig(clientId, scope)
        this._instance = new SpotifyAuth(config)
      }

      return this._instance.authorize()
  }

  static performRequest(): Promise<string> {
    if (!this._instance) {
      console.error('current instance not set')
      return Promise.resolve('')
    }
    return this._instance.performWithFreshTokens()
  }

  static getTokenData(): TokenData | undefined {
    if (this._instance) {
      return this._instance.getCurrentTokenData()
    }
  }

  static initialize(clientId: string, scope: string, refreshToken: string) {
    if (!this._instance) {
      console.log(JSON.stringify(refreshToken))
      const config = this.getConfig(clientId, scope)
      this._instance = new SpotifyAuth(config, refreshToken)
    }
  }

  static flush() {
    if (this._instance) {
      return this._instance.clearSettings()
    }
  }

  clearSettings(): void {
    this.currentAccessTokenResponse = undefined
    this.initialRefreshToken = undefined
  }

  /**
   * you can use this function to ensure always having a valid refresh token
   */
  performWithFreshTokens(): Promise<string> {
    
    if (!this.authorizationServiceConfiguration) {
      console.error("Unknown authorizationServiceConfiguration");
      return Promise.reject("Unknown service configuration");
    }

    if (this.currentAccessTokenResponse && this.currentAccessTokenResponse.isValid()) {
      // accessToken is still valid, do nothing
      return Promise.resolve(this.currentAccessTokenResponse.accessToken);
    }

    console.log(this.currentAccessTokenResponse)
    console.log(this.initialRefreshToken)

    const refreshToken = this.currentAccessTokenResponse ? this.currentAccessTokenResponse.refreshToken : this.initialRefreshToken
    if (!refreshToken || refreshToken.trim().length === 0) {
      console.warn("Missing refreshToken.");
      return Promise.reject("Missing refreshToken.");
    }

    let request = new TokenRequest({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      grant_type: GRANT_TYPE_REFRESH_TOKEN,
      code: undefined,
      refresh_token: refreshToken,
      extras: undefined
    });

    return this.tokenHandler
      .performTokenRequest(this.authorizationServiceConfiguration, request)
      .then(response => {
        this.currentAccessTokenResponse = response;
        return response.accessToken;
      });
  }

  private getCurrentTokenData(): TokenData | undefined {
    if (this.currentAccessTokenResponse && this.currentAccessTokenResponse.refreshToken) {
      return {
        accessToken: this.currentAccessTokenResponse.accessToken,
        refreshToken: this.currentAccessTokenResponse.refreshToken
      }
    }
  }
}