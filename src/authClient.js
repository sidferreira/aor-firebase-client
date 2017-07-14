/* globals localStorage */
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

function firebaseAuthCheck (auth, resolve, reject) {
  if (auth) {
    // TODO make it a parameter
    firebase.database().ref('/users/' + auth.uid).once('value')
    .then(function (snapshot) {
      const profile = snapshot.val()
      // TODO make it a parameter
      if (profile && profile.isAdmin) {
        auth.getIdToken().then((firebaseToken) => {
          let user = {auth, profile, firebaseToken}

          // TODO improve this! Save it on redux or something
          localStorage.setItem('firebaseToken', firebaseToken)
          resolve(user)
        })
        .catch(err => {
          reject(err)
        })
      } else {
        firebase.auth().signOut()
        reject(new Error('Access Denied!'))
      }
    })
    .catch(err => {
      reject(err)
    })
  } else {
    reject(new Error('Login failed!'))
  }
}

export default (type, params) => {
  if (type === AUTH_LOGOUT) {
    return firebase.auth().signOut()
  }
  if (type === AUTH_CHECK) {
    return new Promise((resolve, reject) => {
      if (firebase.auth().currentUser) {
        resolve()
      } else {
        reject(new Error('User not found'))
      }
    })
  }
  if (type === AUTH_LOGIN) {
    const { username, password } = params

    return new Promise((resolve, reject) => {
      firebase.auth().signInWithEmailAndPassword(username, password)
      .then(auth => firebaseAuthCheck(auth, resolve, reject))
      .catch(e => reject(new Error('User not found')))
    })
  }
  return Promise.resolve()
}
