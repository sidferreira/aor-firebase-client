import React from 'react'
import { Admin, Resource, Delete } from 'admin-on-rest'
import { RestClient, AuthClient } from 'aor-firebase-client'

import { PostList, PostEdit, PostCreate } from './Posts';
import { UserList } from './Users';

const firebaseConfig = {
  apiKey: 'AIzaSyAwoZ5Ph6Hx3-DplWzaouqUOnu4lNKeAFQ',
  authDomain: 'aor-firebase-client.firebaseapp.com',
  databaseURL: 'https://aor-firebase-client.firebaseio.com',
  projectId: 'aor-firebase-client',
  storageBucket: 'aor-firebase-client.appspot.com',
  messagingSenderId: '1092760245154'
}

const trackedResources = ['posts', 'profiles']

const shouldUseAuth = !(window && window.location && window.location.search && window.location.search === '?security=0')

const App = () => (
  <Admin restClient={RestClient(trackedResources, firebaseConfig)} authClient={shouldUseAuth ? AuthClient : null} >
        <Resource name="posts" list={PostList} edit={PostEdit} create={PostCreate} remove={Delete} />
        <Resource name="profiles" list={UserList} />
  </Admin>
);

export default App;