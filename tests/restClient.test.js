/* globals jest, test, expect, jasmine, debugger */

import {
  GET_LIST,
  GET_ONE,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE
} from 'admin-on-rest'

import firebase from 'firebase'

import { RestClient } from '../src'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000

debugger;

process.on('unhandledRejection', (reason) => {
    console.log('Reason: ' + reason);
})

const firebaseConfig = {
  apiKey: 'AIzaSyAwoZ5Ph6Hx3-DplWzaouqUOnu4lNKeAFQ',
  authDomain: 'aor-firebase-client.firebaseapp.com',
  databaseURL: 'https://aor-firebase-client.firebaseio.com',
  projectId: 'aor-firebase-client',
  storageBucket: 'aor-firebase-client.appspot.com',
  messagingSenderId: '1092760245154'
}

const client = RestClient(['posts', 'profiles'], firebaseConfig)

test('RestClient is defined', () => {
  expect(RestClient).toBeDefined()
})

test('RestClient Get Posts', () => {
  client(GET_LIST, 'posts', {}).then(data => {
    expect(data).toBeDefined()
    expect(data.length).toBeDefined()
    expect(data.length).toBeGreaterThan(1)
  })
})

test('RestClient Get Posts From User 1', () => {
  client(GET_LIST, 'posts', { filters: { userId: 1 } }).then(data => {
    expect(data).toBeDefined()
    expect(data.length).toBeDefined()
    expect(data.length).toBe(10)
  })
})

test('RestClient Get Posts With Text', () => {
  client(GET_LIST, 'posts', { filters: { q: 'vero' } }).then(data => {
    expect(data).toBeDefined()
    expect(data.length).toBeDefined()
    expect(data.length).toBe(10)
  })
})

test('RestClient Get Posts With Impossible Text', () => {
  client(GET_LIST, 'posts', { filters: { q: 'thisisaveryimpossibletext' } }).then(data => {
    expect(data).toBeDefined()
    expect(data.length).toBe(0)
  })
})

describe('RestClient trackedResources', () => {
  test('rejects objects without a name', () => {
    expect(() => {
      RestClient([{notName: 'posts'}])
    }).toThrow()
  })
  test('accepts objects with a name', () => {
    const client = RestClient([{name: 'posts'}])
    return client(GET_ONE, 'posts', { id: 1 }).then(data => {
      expect(data).toBeDefined()
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe('1')
    })
  })
  test.only('accepts objects with a name and path', () => {
    const client = RestClient([{name: 'posts', path: '/posts'}])
    return client(GET_ONE, 'posts', { id: 1 }).then(data => {
      expect(data).toBeDefined()
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe('1')
    })
  })
  test('rejects paths that do not end with the name', () => {
    expect(() => {
      RestClient([{name: 'posts', path: 'path/to/not_posts'}])
    }).toThrow()
  })
})
