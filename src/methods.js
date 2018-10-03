import firebase from "firebase/app";
import "firebase/database";
import sortBy from "sort-by";

import {
  GET_LIST,
  // GET_ONE,
  GET_MANY,
  // GET_MANY_REFERENCE,
  CREATE,
  // UPDATE,
  // DELETE
} from "admin-on-rest";

const getMany = async (params, resourceData, type) => {
  const idList = params.ids || false;
  const filter = params.filter || false;
  const pagination = params.pagination || { page: 1, perPage: 10 };
  const sort = params.sort || { field: "id", order: "DESC" };

  let ids = [];
  let data = [];
  let total = 0;

  if (type === GET_MANY) {
    for (let i = 0, l = idList.length; i < l; i++) {
      const id = idList[i];
      let value = resourceData[id];
      if (value) {
        data.push(value);
        ids.push(id);
      }
    }

    total = data.length;
  } else if (type === GET_LIST) {
    let values = Object.values(resourceData);

    if (filter) {
      const filters = Object.keys(filter);
      values = values.filter(value => {
        let valid = true;

        filters.map(filterProp => {
          const filterValue = filter[filterProp];
          if (typeof value[filterProp] === "string" && filterValue && valid) {
            valid = value[filterProp].indexOf(filterValue) >= 0;
          }

          if (
            typeof value[filterProp] === "number" &&
            !isNaN(filterValue) &&
            valid
          ) {
            valid = value[filterProp] === parseFloat(filterValue);
          }
        });

        return valid;
      });
    }

    values.sort(sortBy((sort.order === "ASC" ? "-" : "") + sort.field));

    total = values.length;

    const { page, perPage } = pagination;
    const startIndex = (page - 1) * perPage;
    const endIndex = page * perPage;

    data = values.slice(startIndex, endIndex);
    ids = data.map(({ id }) => id);
  } else {
    throw new Error("Error processing request");
  }
  return { data, ids, total };
};

const getOne = (params, resourceData) => {
  if (params.id && resourceData[params.id]) {
    return { data: resourceData[params.id] };
  } else {
    throw new Error("Key not found");
  }
};

const getId = (params, resourceData, type, resourcePath) => {
  let id = params.data.id || params.id;
  if (!id) {
    id = firebase
      .database()
      .ref()
      .child(resourcePath)
      .push().key;
  }

  if (!id) {
    throw new Error("ID is required");
  }

  if (resourceData && resourceData[id] && type === CREATE) {
    throw new Error("ID already in use");
  }

  return id;
};

const save = async (
  params,
  resourceName,
  type,
  resourcePath,
  preSave,
  uploadResults,
  timestampFields
) => {
  let data = params.data;
  const previous = params.previousData || {};

  if (uploadResults) {
    uploadResults.map(
      uploadResult => (uploadResult ? Object.assign(data, uploadResult) : false)
    );
  }

  if (type === CREATE) {
    data[timestampFields.createdAt] = Date.now();
  }

  data = Object.assign(
    {},
    previous,
    { [timestampFields.updatedAt]: Date.now() },
    data
  );

  if (!data.id) {
    data.id = params.__id;
  }

  await firebase
    .database()
    .ref(`${resourcePath}/${data.id}`)
    .update(preSave(data));
  return { data };
};

const del = async (params, resourcePath, uploadFields) => {
  const id = params.id;
  if (uploadFields.length) {
    uploadFields.map(fieldName =>
      firebase.storage().ref().child(`${resourcePath}/${id}/${fieldName}`).delete())
  }

  await firebase
    .database()
    .ref(`${resourcePath}/${id}`)
    .remove();
  return { data: id };
};

const getImageSize = file => {
  return new Promise(resolve => {
    // eslint-disable-next-line no-undef
    const img = document.createElement("img");
    img.onload = function() {
      resolve({
        width: this.width,
        height: this.height
      });
    };
    img.src = file.src;
  });
};

const upload = async (
  fieldName,
  params,
  resourceName,
  resourcePath
) => {
  const submitedData = params.data;
  const id = params.__id;
  const file = submitedData[fieldName] && submitedData[fieldName][0];
  const rawFile = file.rawFile;

  const result = {};
  if (file && rawFile && rawFile.name) {
    const ref = firebase
      .storage()
      .ref()
      .child(`${resourcePath}/${id}/${fieldName}`);
    const snapshot = await ref.put(rawFile);
    result[fieldName] = [{}];
    result[fieldName][0].uploadedAt = Date.now();
    result[fieldName][0].src =
      snapshot.downloadURL.split("?").shift() + "?alt=media";
    result[fieldName][0].type = rawFile.type;
    if (rawFile.type.indexOf("image/") === 0) {
      try {
        const imageSize = await getImageSize(file);
        result[fieldName][0].width = imageSize.width;
        result[fieldName][0].height = imageSize.height;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Failed to get image dimensions`);
      }
    }
    return result;
  }
  return false;
};

export default {
  upload,
  save,
  del,
  getId,
  getOne,
  getMany,
  preSave: (data) => data,
  postRead: (data) => data
};
