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

  /** TODO Move this to the Redux Store */
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

  trackedResources.map(resource => {
    if (typeof resource === 'object') {
      if (!resource.name) {
        throw new Error(`name is missing from resource ${resource}`)
      }

      const name = resource.name
      const path = resource.path || resource.name
      const uploadFields = resource.uploadFields || []

      // Check path ends with name so the initial children can be loaded from on 'value' below.
      const pattern = path.indexOf('/') >= 0 ? `/${name}$` : `${name}$`
      if (!path.match(pattern)) {
        throw new Error(`path ${path} must match ${pattern}`)
      }

      resourcesUploadFields[name] = uploadFields
      resourcesPaths[name] = path || name
      resource = name
    } else {
      resourcesPaths[resource] = resource
    }

    resourcesData[resource] = {}
    resourcesStatus[resource] = new Promise(resolve => {
      let ref = resourcesReferences[resource] = firebase.database().ref(resourcesPaths[resource])

      ref.on('value', function (childSnapshot) {
        /** Uses "value" to fetch initial data. Avoid the AOR to show no results */
        console.log(childSnapshot.val())
        if (childSnapshot.key === resource) { resourcesData[resource] = childSnapshot.val() || [] }
        Object.keys(resourcesData[resource]).forEach(key => { resourcesData[resource][key].id = key })
        resolve()
      })
      ref.on('child_added', function (childSnapshot) {
        resourcesData[resource][childSnapshot.key] = childSnapshot.val()
        resourcesData[resource][childSnapshot.key].id = childSnapshot.key
      })

      ref.on('child_removed', function (oldChildSnapshot) {
        console.log('child_removed', resource, oldChildSnapshot.key)
        if (resourcesData[resource][oldChildSnapshot.key]) { delete resourcesData[resource][oldChildSnapshot.key] }
      })

      ref.on('child_changed', function (childSnapshot) {
        resourcesData[resource][childSnapshot.key] = childSnapshot.val()
      })

      setTimeout(resolve, initialQuerytimeout)
    })

    return true
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
        console.log(`Resource ${resourceName} got a ${type}`)
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
                save(itemId, params.data, currentData, resourceName, resourcesPaths[resourceName], resolve, reject, uploadResults, type === CREATE, timestampFieldNames)
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
