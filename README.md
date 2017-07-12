# aor-firebase-client

An [admin-on-rest](https://github.com/marmelab/admin-on-rest) client for [Firebase](https://firebase.google.com).


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
import { PostList } from './posts';
import { RestClient } from 'aor-firebase-client';

const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-auth-domain>',
    databaseURL: '<your-database-url>',
    storageBucket: '<your-storage-bucket>',
    messagingSenderId: '<your-sender-id>'
};

const trackedResources = ['posts']

const App = () => (
    <Admin restClient={RestClient(trackedResources, firebaseConfig)} >
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

### Auth Client
The package lets you manage the login/logout process implementing an optional `authClient` prop of the `Admin` component [(see documentation)](https://marmelab.com/admin-on-rest/Authentication.html).  
It stores a `firebaseToken` in  `localStorage`.  


```js
// in src/App.js
...
import {RestClient, AuthClient} from 'aor-firebase-client';

const App = () => (
    <Admin restClient={RestClient(firebaseConfig)} authClient={AuthClient}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

**Note:** AuthClient does require using the RestClient in order to initialize firebase. Alternatively, you can opt to not use the RestClient and initialize firebase yourself like this:

```js
import {RestClient, AuthClient} from 'aor-firebase-client';
import firebase from 'firebase';

firebase.initializeApp(firebaseConfig);

const App = () => (
    <Admin authClient={AuthClient}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

## Changelog

### v0.0.1
  * Initial commit, lots of to dos

## License

This library is licensed under the [MIT Licence](LICENSE).
