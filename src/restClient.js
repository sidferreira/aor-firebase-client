import firebase from 'firebase'
import * as Methods from './methods'

import {
  GET_LIST,
  GET_ONE,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE
} from 'admin-on-rest'

/**
 * @param {string[]|Object[]} trackedResources Array of resource names or array of Objects containing name and
 * optional path properties (path defaults to name)
 * @param {Object} firebaseConfig Options Firebase configuration
 */

const BaseConfiguration = {
  initialQuerytimeout: 10000,
  timestampFieldNames: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
}

export default (firebaseConfig = {}, options = {}) => {
  options = Object.assign({}, BaseConfiguration, options)
  const { timestampFieldNames, trackedResources, initialQuerytimeout } = options

  const resourcesStatus = {}
  const resourcesReferences = {}
  const resourcesData = {}
  const resourcesPaths = {}
  const resourcesUploadFields = {}

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig)
  }

  /* Functions */
  const upload = options.upload || Methods.upload
  const save = options.save || Methods.save
  const del = options.del || Methods.del
  const getItemID = options.getItemID || Methods.getItemID
  const getOne = options.getOne || Methods.getOne
  const getMany = options.getMany || Methods.getMany

  const firebaseSaveFilter = options.firebaseSaveFilter ? options.firebaseSaveFilter : (data) => data
  const firebaseGetFilter = options.firebaseGetFilter ? options.firebaseGetFilter : (data) => data

  // Sanitize Resources
  trackedResources.map((resource, index) => {
    if (typeof resource === 'string') {
      resource = {
        name: resource,
        path: resource,
        uploadFields: []
      }
      trackedResources[index] = resource
    }

    const { name, path, uploadFields } = resource

    if (!resource.name) {
      throw new Error(`name is missing from resource ${resource}`)
    }
    resourcesUploadFields[name] = uploadFields || []
    resourcesPaths[name] = path || name
    resourcesData[name] = {}
  })

  const initializeResource = ({name}, resolve) => {
    let ref = resourcesReferences[name] = firebase.database().ref(resourcesPaths[name])

    ref.once('value', function (childSnapshot) {
      /** Uses "value" to fetch initial data. Avoid the AOR to show no results */
      if (childSnapshot.key === name) {
        const entries = childSnapshot.val() || {}
        resourcesData[name] = Object.keys(entries).map(key => firebaseGetFilter(entries[key], name))
      }
      Object.keys(resourcesData[name]).forEach(key => { resourcesData[name][key].id = key })
      resolve()
    })
    ref.on('child_added', function (childSnapshot) {
      resourcesData[name][childSnapshot.key] = firebaseGetFilter(childSnapshot.val(), name)
      resourcesData[name][childSnapshot.key].id = childSnapshot.key
    })

    ref.on('child_removed', function (oldChildSnapshot) {
      if (resourcesData[name][oldChildSnapshot.key]) { delete resourcesData[name][oldChildSnapshot.key] }
    })

    ref.on('child_changed', function (childSnapshot) {
      resourcesData[name][childSnapshot.key] = childSnapshot.val()
    })

    setTimeout(resolve, initialQuerytimeout)

    return true
  }

  trackedResources.map(resource => {
    resourcesStatus[resource.name] = new Promise(resolve => {
      if (resource.public) {
        initializeResource(resource, resolve)
      } else {
        firebase.auth().onAuthStateChanged(auth => {
          if (auth) {
            initializeResource(resource, resolve)
          }
        })
      }
    })
  })

  /**
   * @param {string} type Request type, e.g GET_LIST
   * @param {string} resourceName Resource name, e.g. "posts"
   * @param {Object} payload Request parameters. Depends on the request type
   * @returns {Promise} the Promise for a REST response
   */

  return (type, resourceName, params) => {
    return new Promise((resolve, reject) => {
      resourcesStatus[resourceName].then(() => {
        switch (type) {
          case GET_LIST:
          case GET_MANY:
          case GET_MANY_REFERENCE:
            getMany(params, resourceName, resourcesData[resourceName], resolve, reject)
            return

          case GET_ONE:
            getOne(params, resourceName, resourcesData[resourceName], resolve, reject)
            return

          case DELETE:
            const uploadFields = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName] : []
            del(params.id, resourceName, resourcesPaths[resourceName], uploadFields, resolve, reject)
            return

          case UPDATE:
          case CREATE:
            let itemId = getItemID(params, type, resourceName, resourcesPaths[resourceName], resourcesData[resourceName], resolve, reject)
            try {
              const uploads = resourcesUploadFields[resourceName]
                ? resourcesUploadFields[resourceName]
                  .map(field => upload(field, params.data, itemId, resourceName, resourcesPaths[resourceName]))
                : []
              const currentData = resourcesData[resourceName][itemId] || {}
              Promise.all(uploads).then(uploadResults => {
                save(itemId, params.data, currentData, resourceName, resourcesPaths[resourceName], firebaseSaveFilter, resolve, reject, uploadResults, type === CREATE, timestampFieldNames)
              })
            } catch (e) {
              reject(e)
            }

            return

          default:
            console.error('Undocumented method: ', type)
            return { data: [] }
        }
      })
    })
  }
}
