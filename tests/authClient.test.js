/* globals jest, test, expect */

//import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import { AuthClient } from '../src'

test('AuthClient is defined', () => {
  expect(AuthClient).toBeDefined()
})