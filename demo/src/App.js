import React from "react";
import { Admin, Resource, Delete } from "admin-on-rest";
import { RestClient, AuthClient } from "aor-firebase-client";
import firebase from "firebase";

import { PostList, PostEdit, PostCreate } from "./Posts";
import { UserList } from "./Users";

const firebaseConfig = {
  apiKey: "AIzaSyAwoZ5Ph6Hx3-DplWzaouqUOnu4lNKeAFQ",
  authDomain: "aor-firebase-client.firebaseapp.com",
  databaseURL: "https://aor-firebase-client.firebaseio.com",
  projectId: "aor-firebase-client",
  storageBucket: "aor-firebase-client.appspot.com",
  messagingSenderId: "1092760245154"
};

const authClientOptions = {
  firebaseConfig,
  firebasePersistence: firebase.auth.Auth.Persistence.SESSION
};

const restClientOptions = {
  firebaseConfig, // Needed, to ensure everything is properly configured
  trackedResources: [
    {
      name: "posts", // The display/reference name for this resource
      path: "", // The path in the RTDB structure. If empty will assume that it is on root
      isPublic: true, // Does it require auth? True by default!
      uploadFields: [] // If there's any upload field you want the plugin to handle, place it here.
    },
    {
      name: "profiles",
      isPublic: true
    } // A single string assumes the example below
    // {
    //   name: 'profiles',
    //   path: '/profiles',
    //   isPublic: false,
    //   uploadFields: null
    // }
  ],
  // Additional options
  options: {
    initialQuerytimeout: 10000,
    timestampFieldNames: {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    },
    firebasePersistence: firebase.auth.Auth.Persistence.SESSION,
    methods: {
      // Allows to override internal methods to customize behavior
      postRead: entry => {
        entry.id = isNaN(entry.id) ? entry.id : parseInt(entry.id);
        return entry;
      }
    }
  }
};

const shouldUseAuth = true; // !(window && window.location && window.location.search && window.location.search === '?security=0')

const App = () => (
  <Admin
    restClient={RestClient(restClientOptions)}
    authClient={shouldUseAuth ? AuthClient(authClientOptions) : null}
  >
    <Resource
      name="posts"
      list={PostList}
      edit={PostEdit}
      create={PostCreate}
      remove={Delete}
    />
    <Resource name="profiles" list={UserList} />
  </Admin>
);

export default App;
