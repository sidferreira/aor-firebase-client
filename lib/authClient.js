'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _adminOnRest = require('admin-on-rest');

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* globals localStorage */
function firebaseAuthCheck(auth, resolve, reject) {
  if (auth) {
    // TODO make it a parameter
    _firebase2.default.database().ref('/users/' + auth.uid).once('value').then(function (snapshot) {
      var profile = snapshot.val();
      // TODO make it a parameter
      if (profile && profile.isAdmin) {
        auth.getIdToken().then(function (firebaseToken) {
          var user = { auth: auth, profile: profile, firebaseToken: firebaseToken

            // TODO improve this! Save it on redux or something
          };localStorage.setItem('firebaseToken', firebaseToken);
          resolve(user);
        }).catch(function (err) {
          reject(err);
        });
      } else {
        _firebase2.default.auth().signOut();
        reject(new Error('Access Denied!'));
      }
    }).catch(function (err) {
      reject(err);
    });
  } else {
    reject(new Error('Login failed!'));
  }
}

exports.default = function (type, params) {
  if (type === _adminOnRest.AUTH_LOGOUT) {
    return _firebase2.default.auth().signOut();
  }
  if (type === _adminOnRest.AUTH_CHECK) {
    return new Promise(function (resolve, reject) {
      if (_firebase2.default.auth().currentUser) {
        resolve();
      } else {
        reject(new Error('User not found'));
      }
    });
  }
  if (type === _adminOnRest.AUTH_LOGIN) {
    var username = params.username,
        password = params.password;


    return new Promise(function (resolve, reject) {
      _firebase2.default.auth().signInWithEmailAndPassword(username, password).then(function (auth) {
        return firebaseAuthCheck(auth, resolve, reject);
      }).catch(function (e) {
        return reject(new Error('User not found'));
      });
    });
  }
  return Promise.resolve();
};