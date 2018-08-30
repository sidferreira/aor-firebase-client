import firebase from 'firebase'
import sortBy from 'sort-by'

import {
  CREATE
} from './reference'

const getImageSize = (file) => {
  return new Promise(resolve => {
    const img = document.createElement('img')
    img.onload = function () {
      resolve({
        width: this.width,
        height: this.height
      })
    }
    img.src = file.src
  })
}

const upload = async (fieldName, submitedData, id, resourceName, resourcePath) => {
  const file = submitedData[fieldName] && submitedData[fieldName][0]
  const rawFile = file.rawFile

  const result = {}
  if (file && rawFile && rawFile.name) {
    const ref = firebase.storage().ref().child(`${resourcePath}/${id}/${fieldName}`)
    const snapshot = await ref.put(rawFile)
    result[fieldName] = [{}]
    result[fieldName][0].uploadedAt = Date.now()
    result[fieldName][0].src = snapshot.downloadURL.split('?').shift() + '?alt=media'
    result[fieldName][0].type = rawFile.type
    if (rawFile.type.indexOf('image/') === 0) {
      try {
        const imageSize = await getImageSize(file)
        result[fieldName][0].width = imageSize.width
        result[fieldName][0].height = imageSize.height
      } catch (e) {
        console.error(`Failed to get image dimensions`)
      }
    }
    return result
  }
  return false
}

const save = async (id, data, previous, resourceName, resourcePath, firebaseSaveFilter, uploadResults, isNew, timestampFieldNames) => {
  if (uploadResults) {
    uploadResults.map(uploadResult => uploadResult ? Object.assign(data, uploadResult) : false)
  }

  if (isNew) {
    Object.assign(data, { [timestampFieldNames.createdAt]: Date.now() })
  }

  data = Object.assign(previous, { [timestampFieldNames.updatedAt]: Date.now() }, data)

  if (!data.key) {
    data.key = id
  }
  if (!data.id) {
    data.id = id
  }

  await firebase.database().ref(`${resourcePath}/${data.key}`).update(firebaseSaveFilter(data))
  return { data }
}

const del = async (id, resourceName, resourcePath, uploadFields) => {
  if (uploadFields.length) {
    uploadFields.map(fieldName =>
      firebase.storage().ref().child(`${resourcePath}/${id}/${fieldName}`).delete())
  }

  await firebase.database().ref(`${resourcePath}/${id}`).remove()
  return { data: id }
}

const getItemID = (params, type, resourceName, resourcePath, resourceData) => {
  let itemId = params.data.id || params.id || params.data.key || params.key
  if (!itemId) {
    itemId = firebase.database().ref().child(resourcePath).push().key
  }

  if (!itemId) {
    throw new Error('ID is required')
  }

  if (resourceData && resourceData[itemId] && type === CREATE) {
    throw new Error('ID already in use')
  }

  return itemId
}

const getOne = (params, resourceName, resourceData) => {
  if (params.id && resourceData[params.id]) {
    return { data: resourceData[params.id] }
  } else {
    throw new Error('Key not found')
  }
}

const getMany = (params, resourceName, resourceData) => {
  let ids = []
  let data = []
  let total = 0

  if (params.ids) {
    /** GET_MANY */
    params.ids.map(key => {
      if (resourceData[key]) {
        ids.push(key)
        data.push(resourceData[key])
        total++
      }
      return total
    })
    return { data: data, ids: ids, total: total };
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
      Object.values(resourceData).map(value => {
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
      values = Object.values(resourceData)
    }

    if (params.sort) {
      values.sort(sortBy(`${params.sort.order === 'ASC' ? '-' : ''}${params.sort.field}`))
    }

    const keys = values.map(i => i.id)
    const { page, perPage } = params.pagination
    const _start = (page - 1) * perPage
    const _end = page * perPage
    data = values.slice(_start, _end)
    ids = keys.slice(_start, _end)
    total = values.length
    return { data, ids, total }
  } else {
    throw new Error('Error processing request')
  }
}

export default {
  upload,
  save,
  del,
  getItemID,
  getOne,
  getMany
}
