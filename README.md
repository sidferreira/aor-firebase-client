# aor-firebase-client

An [admin-on-rest](https://github.com/marmelab/admin-on-rest) client for [Firebase](https://firebase.google.com).

[![npm version](https://badge.fury.io/js/aor-firebase-client.svg)](https://badge.fury.io/js/aor-firebase-client)
[![CircleCI](https://circleci.com/gh/sidferreira/aor-firebase-client/tree/master.svg?style=shield)](https://circleci.com/gh/sidferreira/aor-firebase-client/tree/master)
[![CircleCI](https://circleci.com/gh/sidferreira/aor-firebase-client/tree/develop.svg?style=shield)](https://circleci.com/gh/sidferreira/aor-firebase-client/tree/develop)

## Installation

```sh
npm install aor-firebase-client --save
```

## Usage


### As a parameter of the `<Admin>` component
```js
// in src/App.js
import React from 'react';
import { Admin, Resource } from 'admin-on-rest';
import { RestClient } from 'aor-firebase-client';

const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-auth-domain>',
    databaseURL: '<your-database-url>',
    storageBucket: '<your-storage-bucket>',
    messagingSenderId: '<your-sender-id>'
};

const clientOptions = {
  timestampFieldNames: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  firebaseConfig: [{
    name: 'posts', // The name reference to be used in all other places in AOR
    path: 'blog', // The path in the database. If missing will use the name
    isPublic: true,
    uploadFields: [] // The string name of the field
  }, 'contacts'] // A single string assumes path and name as equal, non private and without upload fields
}

const App = () => (
    <Admin restClient={RestClient(firebaseConfig, clientOptions)} >
        <Resource name="posts" list={PostList} />
        <Resource name="contacts" list={ContactList} />
    </Admin>
);

export default App;
```

### Auth Client
The package lets you manage the login/logout process implementing an optional `authClient` prop of the `Admin` component [(see documentation)](https://marmelab.com/admin-on-rest/Authentication.html).  
It stores a `firebaseToken` in  `localStorage`.
The configuration options available are:

- `userProfilePath`: The database path to user profiles. Defaults to `/users/`. Mind the slashes.

- `userAdminProp`: The database key to point if a user has admin powers. Defaults to `isAdmin`

The final path is: `{userProfilePath}/{uid}/{userAdminProp}`

- `localStorageTokenName`: Local storage identifier to hold the firebase client token, defaults to `aorFirebaseClientToken`

- `handleAuthStateChange`: A way to override the auth process

```js
// in src/App.js
...
import {RestClient, AuthClient} from 'aor-firebase-client';

const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-auth-domain>',
    databaseURL: '<your-database-url>',
    storageBucket: '<your-storage-bucket>',
    messagingSenderId: '<your-sender-id>'
};

const authConfig = {
    userProfilePath: 'profiles',
    userAdminProp: 'superuser'
}

const App = () => (
    <Admin restClient={RestClient(firebaseConfig)} authClient={AuthClient(authConfig)}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

**Note:** AuthClient does require using the RestClient in order to initialize firebase. Alternatively, you can opt to not use the RestClient and initialize firebase yourself like this:

```js
import {RestClient, AuthClient} from 'aor-firebase-client';
import firebase from 'firebase';

const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-auth-domain>',
    databaseURL: '<your-database-url>',
    storageBucket: '<your-storage-bucket>',
    messagingSenderId: '<your-sender-id>'
};

firebase.initializeApp(firebaseConfig);

const App = () => (
    <Admin authClient={AuthClient()}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

## Changelog

### v0.0.10
  * Documentation fix for authClient  [#17](https://github.com/sidferreira/aor-firebase-client/pull/17)
  * Handle empty collections  [#18](https://github.com/sidferreira/aor-firebase-client/pull/18)
  * Build lib on prepare [#19](https://github.com/sidferreira/aor-firebase-client/pull/19)
  * Thanks to [@grahamlyus](https://github.com/grahamlyus) who worked a LOT this month to make this release possible! Kudos!

### v0.0.9
  * Fixes

### v0.0.8
  * Fix it saving on the wrong path [#7](https://github.com/sidferreira/aor-firebase-client/issues/7)
  * Fix README links
### v0.0.7
  * Typos, tests and fixes [#6](https://github.com/sidferreira/aor-firebase-client/pull/6)
### v0.0.6
  * README Fixes [#4](https://github.com/sidferreira/aor-firebase-client/pull/4)
### v0.0.4
  * CI configured

### v0.0.3
  * Fixed Auth Client configuration [#2](https://github.com/sidferreira/aor-firebase-client/issues/2)
  * Added timestamps [#3](https://github.com/sidferreira/aor-firebase-client/pull/3)
  * Initial unit testing / CI

### v0.0.1
  * Initial commit, lots of to dos

## License

This library is licensed under the [MIT Licence](LICENSE).
