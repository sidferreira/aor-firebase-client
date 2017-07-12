import React from 'react'
import { Admin, Resource, List, Datagrid, TextField } from 'admin-on-rest'
import { RestClient, AuthClient } from 'aor-firebase-client'

const firebaseConfig = {
  apiKey: 'AIzaSyAwoZ5Ph6Hx3-DplWzaouqUOnu4lNKeAFQ',
  authDomain: 'aor-firebase-client.firebaseapp.com',
  databaseURL: 'https://aor-firebase-client.firebaseio.com',
  projectId: 'aor-firebase-client',
  storageBucket: 'aor-firebase-client.appspot.com',
  messagingSenderId: '1092760245154'
}

export const PostList = (props) => (
  <List {...props}>
    <Datagrid>
      <TextField source='id' />
      <TextField source='title' />
      <TextField source='body' />
    </Datagrid>
  </List>
)

const trackedResources = ['posts']

const App = () => (
  <Admin restClient={RestClient(trackedResources, firebaseConfig)} authClient={AuthClient} >
    <Resource name="posts" list={PostList} />
  </Admin>
);

export default App;