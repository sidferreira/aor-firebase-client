'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)

exports.blockNewUsers = functions.auth.user().onCreate(event => {
  const uid = event.data.uid
  if (uid !== 'XGkiu6ivvibaPHm8rbp6QX0jLk52' && uid !== 'kRA5YgiSGqMUxPkBoMSB2gJWF4p1') {
    admin.auth().deleteUser(uid)
      .then(function () {
        console.log('Successfully deleted user')
        return true
      })
      .catch(function (error) {
        console.log('Error deleting user:', error)
        return false
      })
  }
  return false
})
