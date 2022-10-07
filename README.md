# Glint.js
Core NPM framework-kinda server library built upon Express, Mongoose, ajv, passport and various other services with integration and easy deployment to Google Cloud App Engine.

// TODO fill README with:
1) what it is about, some basic architectural decisions etc
2) describe all auto-loading self-discovery mechanisms
3) how it can be used in web apps
4) how to create production build
5) deployment to App Engine, prerequisites etc

## Deployment to Google App Engine

There are several prerequisites that need to be handled manually

1) *Create project in Google Cloud Console*

General documentation is available on: [App Engine Application Platform | Google Cloud](https://cloud.google.com/appengine)

2) *Get connection string from MongoDB Atlas*

General documentation is available on: [MongoDB Atlas Database](https://www.mongodb.com/atlas/database)

3) *Create all of the necessary secrets in Google's Secret Manager*

General documentation is here: [Secret Manager | Google Cloud](https://cloud.google.com/secret-manager)
These secrets are expected to exist and to be filled with values:

<table>
    <thead>
        <tr>
            <th>Secret name</th>
            <th>Expected value</th>
            <th>Required for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><em>permissionGrantSecret</em></td>
            <td>any safe string</td>
            <td>for <em>user/secretGrant</em></td>
        </tr>
    </tbody>
</table>

> TODO Vytvořit všechny potřebný secrety (mongo + autentikace + secretGrant autorizace)
