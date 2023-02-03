# Bruship server
Simple backend (NodeJS + MongoDB) for bruship demo app in Angular 
https://bruship.yuliacech.com/

## Setup instructions
### Required env variables
To set an env variable prepend the npm run command with it: 
`MONGODB_URI='mongodb+srv://user:password@example.com/?retryWrites=true&w=majority' npm run dev`
- MONGODB_URI - a string with the url, user and password to access a MongoDB database
- DROPBOX_API_KEY - an api key to upload files to dropbox
- GOOGLE_API_KEY - an api key for google geocoding api (get coordinates of an address)

