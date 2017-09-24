/* globals localStorage */
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

const firebaseAuthCheck = async (auth, resolve, reject) => {
  if (auth) {
    try {
      // TODO make it a parameter
      const snapshot = firebase.database().ref('/users/' + auth.uid).once('value')
      const profile = snapshot.val()
      // TODO make it a parameter
      if (profile && profile.isAdmin) {
        const firebaseToken = auth.getIdToken()
        let user = {auth, profile, firebaseToken}
        localStorage.setItem('firebaseToken', firebaseToken)
        resolve(user)
      } else {
        firebase.auth().signOut()
        reject(new Error('Access Denied!'))
      }
    } catch (e) {
      reject(e)
    }
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

    return new Promise(async (resolve, reject) => {
      const auth = await firebase.auth().signInWithEmailAndPassword(username, password)
      firebaseAuthCheck(auth, resolve, reject)
    })
  }
  return Promise.resolve()
}
