import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_CHECK } from 'admin-on-rest'
import firebase from 'firebase'

function firebaseAuthCheck(auth, resolve, reject) {
  if (auth) {
    //TODO make it a parameter
    firebase.database().ref('/users/' + auth.uid).once('value')
    .then(function (snapshot) {
      const profile = snapshot.val()
      //TODO make it a parameter
      if (profile.isAdmin) {
        auth.getToken().then((accessToken) => {
          let user = {auth, profile, accessToken}

          //TODO improve this! Save it on redux or something
          localStorage.setItem('accessToken', accessToken)
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

export const authClient = (type, params) => {
  if (type === AUTH_LOGOUT) {
    return firebase.auth().signOut();
  }
  if (type === AUTH_CHECK) {
    return new Promise((resolve, reject) => {
      if (firebase.auth().currentUser) {
        resolve()
      } else {
        reject()
      }
    })
  }
  if (type === AUTH_LOGIN) {
    const { username, password } = params;

    return new Promise((resolve, reject) => {
      firebase.auth().signInWithEmailAndPassword(username, password)
      .then(auth => firebaseAuthCheck(auth, resolve, reject))
      .catch(err => reject(err))
    })
  }
  return Promise.resolve();
}
