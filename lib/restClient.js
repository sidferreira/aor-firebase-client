'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _adminOnRest = require('admin-on-rest');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  var trackedResources = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var firebaseConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  /** TODO Move this to the Redux Store */
  var resourcesStatus = {};
  var resourcesReferences = {};
  var resourcesData = {};

  if (_firebase2.default.apps.length === 0) {
    _firebase2.default.initializeApp(firebaseConfig);
  }

  trackedResources.map(function (resource) {
    resourcesData[resource] = {};
    resourcesStatus[resource] = new Promise(function (resolve) {
      var ref = resourcesReferences[resource] = _firebase2.default.database().ref(resource);

      ref.on('value', function (childSnapshot) {
        /** Uses "value" to fetch initial data. Avoid the AOR to show no results */
        if (childSnapshot.key === resource) {
          resourcesData[resource] = childSnapshot.val();
        }
        Object.keys(resourcesData[resource]).map(function (key) {
          resourcesData[resource][key].id = key;
        });
        ref.on('child_added', function (childSnapshot) {
          resourcesData[resource][childSnapshot.key] = childSnapshot.val();
          resourcesData[resource][childSnapshot.key].id = childSnapshot.key;
        });
        ref.on('child_removed', function (oldChildSnapshot) {
          if (resourcesData[resource][oldChildSnapshot.key]) {
            delete resourcesData[resource][oldChildSnapshot.key];
          }
        });
        ref.on('child_changed', function (childSnapshot) {
          resourcesData[resource][childSnapshot.key] = childSnapshot.val();
        });
        resolve();
      });
    });
  });

  /**
   * @param {string} type Request type, e.g GET_LIST
   * @param {string} resource Resource name, e.g. "posts"
   * @param {Object} payload Request parameters. Depends on the request type
   * @returns {Promise} the Promise for a REST response
   */

  return function (type, resource, params) {
    return new Promise(function (resolve, reject) {
      resourcesStatus[resource].then(function () {
        switch (type) {
          case _adminOnRest.GET_LIST:
          case _adminOnRest.GET_MANY:
          case _adminOnRest.GET_MANY_REFERENCE:

            var ids = [];
            var data = [];
            var total = 0;

            if (params.ids) {
              /** GET_MANY */
              params.ids.map(function (key) {
                if (resourcesData[resource][key]) {
                  ids.push(key);
                  data.push(resourcesData[resource][key]);
                  total++;
                }
              });
            } else if (params.pagination) {
              /** GET_LIST / GET_MANY_REFERENCE */
              var _params$pagination = params.pagination,
                  page = _params$pagination.page,
                  perPage = _params$pagination.perPage;

              var _start = (page - 1) * perPage;
              var _end = page * perPage;
              var values = Object.values(resourcesData[resource]);
              data = values.slice(_start, _end);
              ids = Object.keys(resourcesData[resource]).slice(_start, _end);
              total = values.length;
            } else {
              console.error('Unexpected parameters: ', params, type);
              reject(new Error('Error processing request'));
            }
            resolve({ data: data, ids: ids, total: total });
            return;

          case _adminOnRest.GET_ONE:
            var key = params.id;
            if (key && resourcesData[resource][key]) {
              resolve({
                data: resourcesData[resource][key]
              });
            } else {
              reject(new Error('Key not found'));
            }
            return;

          case _adminOnRest.DELETE:
            _firebase2.default.database().ref(params.basePath + '/' + params.id).remove().then(function () {
              resolve({ data: params.id });
            }).catch(reject);
            return;

          case _adminOnRest.UPDATE:
            var dataUpdate = Object.assign({ updated_at: Date.now() }, resourcesData[resource][params.id], params.data);

            _firebase2.default.database().ref(params.basePath + '/' + params.id).update(updatedData).then(function () {
              return resolve({ data: dataUpdate });
            }).catch(reject);
            return;

          case _adminOnRest.CREATE:
            var newItemKey = params.data.id;
            if (!newItemKey) {
              var _newItemKey = _firebase2.default.database().ref().child(params.basePath).push().key;
            } else if (resourcesData[resource] && resourcesData[resource][newItemKey]) {
              reject(new Error('ID already in use'));
              return;
            }
            var dataCreate = Object.assign({
              created_at: Date.now(),
              updated_at: Date.now()
            }, params.data, {
              id: newItemKey,
              key: newItemKey
            });
            _firebase2.default.database().ref(params.basePath + '/' + newItemKey).update(dataCreate).then(function () {
              return resolve({ data: dataCreate });
            }).catch(reject);
            return;

          default:
            console.error('Undocumented method: ', type);
            return { data: [] };
        }
      });
    });
  };
};