import firebase from 'firebase'

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
 * @param {Object} firebaseConfig Optiona Firebase configuration
 */

const timestampFieldNames = {
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}

export const methodUpload = async (fieldName, submitedData, id, resourceName, resourcePath) => {
  const file = submitedData[fieldName] ? submitedData[fieldName][0].rawFile : {}
  const result = {}
  if (file && file.name) {
    const ref = firebase.storage().ref().child(`${resourcePath}/${id}/${fieldName}`)
    const snapshot = await ref.put(file)
    result[fieldName] = [{}]
    result[fieldName][0].uploadedAt = Date.now()
    result[fieldName][0].src = snapshot.downloadURL.split('?').shift() + '?alt=media'
    return result
  }
  return false
}

export const methodSave = async (id, newData, currentData, resourceName, resourcePath, resolve, reject, uploadResults) => {
  try {
    if (uploadResults) {
      uploadResults.map(result => result ? Object.assign(newData, result) : false)
    }
    newData = Object.assign({ [timestampFieldNames.updatedAt]: Date.now() },
      currentData,
      newData)
    await firebase.database().ref(resourcePath + '/' + id).update(newData)
    resolve({ data: newData })
    return newData
  } catch (e) {
    reject(e)
  }
  return false
}

export const methodDelete = async (id, resourceName, resourcePath, uploadFields, resolve, reject) => {
  try {
    if (uploadFields.length) {
      uploadFields.map(fieldName =>
        firebase.storage().ref().child(`${resourcePath}/${id}/${fieldName}`).delete())
    }
    await firebase.database().ref(resourcePath + '/' + id).remove()
    resolve({ data: id })
    return { data: id }
  } catch (e) {
    reject(e)
  }
  return false
}

export const methodGetItemID = (params, type, resourceName, resourcePath, resourceData, resolve, reject) => {
  let itemId = params.data.id || params.id
  if (!itemId) {
    itemId = firebase.database().ref().child(resourcePath).push().key
  }
  if (!itemId) {
    reject(new Error('ID is required'))
    return 0
  }
  if (resourceData && resourceData[itemId] && type === CREATE) {
    reject(new Error('ID already in use'))
    return
  }
  return itemId
}

export default (trackedResources = [], firebaseConfig = {}, options = {}) => {
  Object.assign(timestampFieldNames, options.timestampFieldNames)

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
  const upload = options.methodUpload || methodUpload
  const save = options.methodSave || methodSave
  const del = options.methodUpload || methodUpload
  const getItemID = options.getItemID || methodGetItemID

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
      resourcesPaths[name] = path
      resource = name
    } else {
      resourcesPaths[resource] = resource
    }

    resourcesData[resource] = {}
    resourcesStatus[resource] = new Promise(resolve => {
      let ref = resourcesReferences[resource] = firebase.database().ref(resourcesPaths[resource])

      ref.on('value', function (childSnapshot) {
        /** Uses "value" to fetch initial data. Avoid the AOR to show no results */
        if (childSnapshot.key === resource) { resourcesData[resource] = childSnapshot.val() || [] }
        Object.keys(resourcesData[resource]).forEach(key => { resourcesData[resource][key].id = key })
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
        resolve()
      })
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
        switch (type) {
          case GET_LIST:
          case GET_MANY:
          case GET_MANY_REFERENCE:

            let ids = []
            let data = []
            let total = 0

            if (params.ids) {
              /** GET_MANY */
              params.ids.map(key => {
                if (resourcesData[resourceName][key]) {
                  ids.push(key)
                  data.push(resourcesData[resourceName][key])
                  total++
                }
                return total
              })
            } else if (params.pagination) {
              /** GET_LIST / GET_MANY_REFERENCE */
              let values = []

              // Copy the filter params so we can modify for GET_MANY_REFERENCE support.
              const filter = Object.assign({}, params.filter)

              if (params.target && params.id) {
                filter[params.target] = params.id
              }

              const filterKeys = Object.keys(filter)
              /* TODO Must have a better way */
              if (filterKeys.length) {
                Object.values(resourcesData[resourceName]).map(value => {
                  let filterIndex = 0
                  while (filterIndex < filterKeys.length) {
                    let property = filterKeys[filterIndex]
                    if (property !== 'q' && value[property] !== filter[property]) {
                      return filterIndex
                    } else if (property === 'q') {
                      if (JSON.stringify(value).indexOf(filter['q']) === -1) {
                        return filterIndex
                      }
                    }
                    filterIndex++
                  }
                  values.push(value)
                  return filterIndex
                })
              } else {
                values = Object.values(resourcesData[resourceName])
              }

              const {page, perPage} = params.pagination
              const _start = (page - 1) * perPage
              const _end = page * perPage
              data = values.slice(_start, _end)
              ids = Object.keys(resourcesData[resourceName]).slice(_start, _end)
              total = values.length
            } else {
              console.error('Unexpected parameters: ', params, type)
              reject(new Error('Error processing request'))
            }
            resolve({ data, ids, total })
            return

          case GET_ONE:
            const key = params.id
            if (key && resourcesData[resourceName][key]) {
              resolve({ data: resourcesData[resourceName][key] })
            } else {
              reject(new Error('Key not found'))
            }
            return

          case DELETE:
            const uploadFields = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName] : []
            del(params.id, resourceName, resourcesPaths[resourceName], uploadFields, resolve, reject)
            return

          case UPDATE:
          case CREATE:
            let itemId = getItemID(params, type, resourceName, resourcesPaths[resourceName], resourcesData[resourceName], resolve, reject)

            try {
              const uploads = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName]
                .map(field => upload(field, params.data, itemId, resourceName)) : []
              const currentData = resourcesData[resourceName][itemId] || {}
              Promise.all(uploads).then(uploadResults =>
                save(itemId, params.data, currentData, resourceName, resolve, reject, uploadResults))
            } catch (e) {
              reject(e)
            }

            return

          default:
            console.error('Undocumented method: ', type)
            return {data: []}
        }
      })
    })
  }
}
