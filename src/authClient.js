/* globals localStorage */
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

const baseConfig = {
  userProfilePath: '/users/',
  userAdminProp: 'isAdmin',
  localStorageTokenName: 'aorFirebaseClientToken',
  handleAuthStateChange: async (auth, config) => {
    if (auth) {
      const snapshot = await firebase.database().ref(config.userProfilePath + auth.uid).once('value')
      const profile = snapshot.val()
      if (profile && profile[config.userAdminProp]) {
        const firebaseToken = auth.getIdToken()
        let user = { auth, profile, firebaseToken }
        localStorage.setItem(config.localStorageTokenName, firebaseToken)
        return user
      } else {
        firebase.auth().signOut()
        localStorage.removeItem(config.localStorageTokenName)
        throw new Error('sign_in_error')
      }
    } else {
      localStorage.removeItem(config.localStorageTokenName)
      throw new Error('sign_in_error')
    }
  }
}

export default (config = {}) => {
  config = {...baseConfig, ...config}

  firebase.auth().onAuthStateChanged(auth => config.handleAuthStateChange(auth, config).catch(() => {}))

  return async (type, params) => {
    if (type === AUTH_LOGOUT) {
      config.handleAuthStateChange(null, config).catch(() => { })
      return firebase.auth().signOut()
    }
    if (type === AUTH_CHECK) {
      return new Promise((resolve, reject) => {
        const timeout = (!firebase.auth().currentUser && localStorage.getItem(config.localStorageTokenName)) ? 1000 : 100
        setTimeout(() => {
          if (firebase.auth().currentUser) {
            resolve(true)
          } else {
            reject(new Error('sign_in_error'))
          }
        }, timeout)
      })
    }
    if (type === AUTH_LOGIN) {
      const { username, password } = params
      const auth = await firebase.auth().signInWithEmailAndPassword(username, password)
      return config.handleAuthStateChange(auth, config)
    }
    return true
  }
}
