const express = require("express");
const jsonParser = require("body-parser").json();

const multer  = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const cors = require('cors');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const controller = require('./controller');

const app = express();
/* Uncomment this block for debugging
app.use((req, res, next) => {
    console.log(req);
    next();
});
 */

const server = app.listen(process.env.PORT || 8080, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

const allowedOrigins = [
    'http://localhost:4200',
    'https://bruship.yuliacech.com'
];
app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not ' +
                'allow access from the specified origin: ' + origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://yuliacech.auth0.com/.well-known/jwks.json'
    }),
    audience: 'bruship-server/api',
    issuer: 'https://yuliacech.auth0.com/',
    algorithms: ['RS256']
});

app.get("/api/accommodations/limit/:limit", jsonParser, controller.getAccommodations);
app.get("/api/accommodations/addressSlug/:slug", jsonParser, controller.getAccommodationByAddressSlug);

app.get("/api/reviews/:id", jsonParser, controller.getReviewByID);

app.post("/api/subscribers", jsonParser, controller.addSubscriber);

app.get("/api/user/reviews", checkJwt, jsonParser,  controller.getReviews);

app.post('/api/user/reviews_with_photos', checkJwt, upload.array('files', 3), controller.reviewsWithPhotos);

app.get('/api/search/longitude/:longitude/latitude/:latitude', controller.findAccommodationsByCoordinates);

module.exports = app;
