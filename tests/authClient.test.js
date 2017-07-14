/* globals jest, test, expect, jasmine, debugger */

import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

import { AuthClient } from '../src'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000

debugger;

const firebaseConfig = {
  apiKey: 'AIzaSyAwoZ5Ph6Hx3-DplWzaouqUOnu4lNKeAFQ',
  authDomain: 'aor-firebase-client.firebaseapp.com',
  databaseURL: 'https://aor-firebase-client.firebaseio.com',
  projectId: 'aor-firebase-client',
  storageBucket: 'aor-firebase-client.appspot.com',
  messagingSenderId: '1092760245154'
}

firebase.initializeApp(firebaseConfig)

test('AuthClient is defined', () => {
  expect(AuthClient).toBeDefined()
})

test('AuthClient from Non Admin Fails', async () => {
  return expect(AuthClient(AUTH_LOGIN, 
  	{ username: 'is_not_admin@aor-firebase-client.nu', password: 'is_not_admin' })).rejects.toBeDefined()
})

test('AuthClient from Admin Succedes', async () => {
  return expect(AuthClient(AUTH_LOGIN, 
  	{ username: 'is_admin@aor-firebase-client.nu', password: 'is_admin' })).resolves.toBeDefined()
})