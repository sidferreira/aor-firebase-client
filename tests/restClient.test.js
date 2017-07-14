/* globals jest, test, expect, jasmine, debugger */

import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

import { RestClient } from '../src'

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

const client = RestClient(firebaseConfig, ['posts'])

test('RestClient is defined', () => {
  expect(RestClient).toBeDefined()
})