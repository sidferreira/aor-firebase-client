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

export default (trackedResources = [], firebaseConfig = {}, options = {}) => {
  Object.assign(timestampFieldNames, options.timestampFieldNames)

  /** TODO Move this to the Redux Store */
  const resourcesStatus = {}
  const resourcesReferences = {}
  const resourcesData = {}
  const resourcesPaths = {}

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig)
  }

  trackedResources.map(resource => {
    if (typeof resource === 'object') {
      if (!resource.name) {
        throw new Error(`name is missing from resource ${resource}`)
      }

      const path = resource.path || resource.name
      const name = resource.name

      // Check path ends with name so the initial children can be loaded from on 'value' below.
      const pattern = path.indexOf('/') >= 0 ? `/${name}$` : `${name}$`
      if (!path.match(pattern)) {
        throw new Error(`path ${path} must match ${pattern}`)
      }

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
          if (resourcesData[resource][oldChildSnapshot.key]) { delete resourcesData[resource][oldChildSnapshot.key] }
        })
        ref.on('child_changed', function (childSnapshot) {
          resourcesData[resource][childSnapshot.key] = childSnapshot.val()
        })
        resolve()
      })
    })
  })

  /**
   * @param {string} type Request type, e.g GET_LIST
   * @param {string} resource Resource name, e.g. "posts"
   * @param {Object} payload Request parameters. Depends on the request type
   * @returns {Promise} the Promise for a REST response
   */

  return (type, resource, params) => {
    return new Promise((resolve, reject) => {
      resourcesStatus[resource].then(() => {
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
                if (resourcesData[resource][key]) {
                  ids.push(key)
                  data.push(resourcesData[resource][key])
                  total++
                }
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
                Object.values(resourcesData[resource]).map(value => {
                  let filterIndex = 0
                  while (filterIndex < filterKeys.length) {
                    let property = filterKeys[filterIndex]
                    if (property !== 'q' && value[property] !== filter[property]) {
                      return
                    } else if (property === 'q') {
                      if (JSON.stringify(value).indexOf(filter['q']) === -1) {
                        return
                      }
                    }
                    filterIndex++
                  }
                  values.push(value)
                })
              } else {
                values = Object.values(resourcesData[resource])
              }

              const {page, perPage} = params.pagination
              const _start = (page - 1) * perPage
              const _end = page * perPage
              data = values.slice(_start, _end)
              ids = Object.keys(resourcesData[resource]).slice(_start, _end)
              total = values.length
            } else {
              console.error('Unexpected parameters: ', params, type)
              reject(new Error('Error processing request'))
            }
            resolve({ data, ids, total })
            return

          case GET_ONE:
            const key = params.id
            if (key && resourcesData[resource][key]) {
              resolve({
                data: resourcesData[resource][key]
              })
            } else {
              reject(new Error('Key not found'))
            }
            return

          case DELETE:
            firebase.database().ref(resourcesPaths[resource] + '/' + params.id).remove()
            .then(() => { resolve({ data: params.id }) })
            .catch(reject)
            return

          case UPDATE:
            const dataUpdate = Object.assign({ [timestampFieldNames.updatedAt]: Date.now() }, resourcesData[resource][params.id], params.data)

            firebase.database().ref(resourcesPaths[resource] + '/' + params.id).update(dataUpdate)
              .then(() => resolve({ data: dataUpdate }))
              .catch(reject)
            return

          case CREATE:
            let newItemKey = params.data.id
            if (!newItemKey) {
              newItemKey = firebase.database().ref().child(resourcesPaths[resource]).push().key;
            } else if (resourcesData[resource] && resourcesData[resource][newItemKey]) {
              reject(new Error('ID already in use'))
              return
            }
            const dataCreate = Object.assign(
              {
                [timestampFieldNames.createdAt]: Date.now(),
                [timestampFieldNames.updatedAt]: Date.now()
              },
              params.data,
              {
                id: newItemKey,
                key: newItemKey
              }
            )
            firebase.database().ref(resourcesPaths[resource] + '/' + newItemKey).update(dataCreate)
            .then(() => resolve({ data: dataCreate }))
            .catch(reject)
            return

          default:
            console.error('Undocumented method: ', type)
            return {data: []}
        }
      })
    })
  }
}
