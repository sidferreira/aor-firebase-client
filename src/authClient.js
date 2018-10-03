/* globals localStorage */
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from './reference'
import firebase from 'firebase/app'
import 'firebase/database';
import 'firebase/auth';

const baseConfig = {
  userProfilePath: '/users/',
  userAdminProp: 'isAdmin',
  localStorageTokenName: 'aorFirebaseClientToken',
  handleAuthStateChange: async (auth, config) => {
    if (auth) {
      const user = auth.user;
      const snapshot = await firebase.database().ref(config.userProfilePath + user.uid).once('value')
      const profile = snapshot.val()

      if (profile && profile[config.userAdminProp]) {
//        const firebaseToken = await user.getIdToken()
//        let user = { auth, profile, firebaseToken }
//        localStorage.setItem(config.localStorageTokenName, firebaseToken)
        return user;
      } else {
        firebase.auth().signOut()
      }
    }
    localStorage.removeItem(config.localStorageTokenName);
//      throw new Error('sign_in_error');
    return false;
  }
}

export default (config = {}) => {
  config = {...baseConfig, ...config};

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig)
    firebase.auth().setPersistence(options.firebasePersistence);
  }

  if (firebase.auth().currentUser) {
    firebase.auth().currentUser.reload()
  }

  return async (type, params) => {
    if (type === AUTH_LOGOUT) {
      config.handleAuthStateChange(null, config).catch(() => { })
      return firebase.auth().signOut()
    }

    if (type === AUTH_CHECK) {
      await new Promise(r => firebase.auth().onAuthStateChanged(r));
      if (firebase.auth().currentUser) {
        await firebase.auth().currentUser.reload();
      }

      return !!firebase.auth().currentUser
    }

    if (type === AUTH_LOGIN) {
      const { username, password, alreadySignedIn } = params
      const auth = await firebase.auth().signInWithEmailAndPassword(username, password)
      return config.handleAuthStateChange(auth, config);
    }

    return false
  }
}
