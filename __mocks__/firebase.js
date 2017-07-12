'use strict';

const firebase = jest.genMockFromModule('firebase')

let currentUser = false

firebase.auth = () => {
  return {
    signOut: () => new Promise(resolve => {
      currentUser = false
      resolve()
    }),
    signInWithEmailAndPassword: (u, p) => new Promise((resolve, reject) => {
      if (u === p) {
        resolve({
          uid: 'validUser'
        })
      } else {
        reject()
      }
    }),
    currentUser
  }
}