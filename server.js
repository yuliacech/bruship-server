const express = require("express");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const ObjectID = mongodb.ObjectID;
const cors = require('cors');
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');

const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_API_KEY,
    Promise: Promise
});

const ACCOMMODATIONS_COLLECTION = "accommodations";
const SUBSCRIBERS_COLLECTION = "subscribers";
const REVIEWS_COLLECTION = "reviews";

const app = express();
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
let db;
// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = database;
    console.log("Database connection ready");

    // Initialize the app.
    const server = app.listen(process.env.PORT || 8080, function () {
        const port = server.address().port;
        console.log("App now running on port", port);
    });
});

const allowedOrigins = [
    'http://localhost:4200',
    'https://solid-flow.github.io',
    'http://bruship.solid-flow.com'
];
app.use(cors({
    origin: function(origin, callback){
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not ' +
                'allow access from the specified origin: ' + origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// API ROUTES BELOW
// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

app.get("/api/accommodations", function(req, res) {
    db.collection(ACCOMMODATIONS_COLLECTION).find({}).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get accommodations.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/top_accommodations", function(req, res) {
    const maxNumber = req.params.maxNumber ? req.params.maxNumber : 9;
    db.collection(ACCOMMODATIONS_COLLECTION).find({}).limit(maxNumber).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get " + maxNumber + " top accommodations.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/subscribers", function(req, res) {
    if (!req.body.email) {
        return handleError(res, "Invalid user input: missing email in req.body", "Must provide an email.", 400);
    }

    const origin = req.headers.origin;
    const now = new Date();
    const newSubscriber = {
        email: req.body.email,
        timestamp: now,
        originUrl: origin
    };

    db.collection(SUBSCRIBERS_COLLECTION).insertOne(newSubscriber, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new subscriber.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    });
});

// Authentication middleware. When used, the
// access token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://solid-flow.eu.auth0.com/.well-known/jwks.json'
    }),

    // Validate the audience and the issuer.
    audience: 'bruship-server/api',
    issuer: 'https://solid-flow.eu.auth0.com/',
    algorithms: ['RS256']
});

app.get("/api/user/reviews", checkJwt, function(req, res) {
    const query = { userID: req.user.sub };
    db.collection(REVIEWS_COLLECTION).find(query).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get reviews for user " + req.user.sub);
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/user/reviews", checkJwt, function(req, res) {

    // address and rating are required
    const address = req.body.address;
    const rating = req.body.rating;
    if (!address || !address.streetName || !address.houseNumber || !address.postalCode || !address.city
        || !address.country || !rating) {
        const error = 'Missing parameters address (or parts of it) or rating in request';
        return handleError(res, error, error, 400);
    }

    // review and price are optional
    const review = req.body.review;
    const price = req.body.price;

    const userID = req.user.sub;

    console.log();
    // find or create accommodation with this address
    db.collection(ACCOMMODATIONS_COLLECTION).findOne({address: address}, function (err, existingAccommodation) {
        if (err) {
            console.log('err');
            console.log(err);
            return handleError(res, err.message, "Failed to find existing accommodation while submitting review.");
        } else if(existingAccommodation) {
            console.log('existingAccommodation');
            console.log(existingAccommodation);
            const accommodationID = existingAccommodation._id;
            const newReview = {
                userID: userID,
                accommodationID: accommodationID,
                rating: rating,
                review: review,
                price: price,
                timestamp: new Date(),
                originUrl: req.headers.origin
            };
            db.collection(REVIEWS_COLLECTION).insertOne(newReview, function(err, insertedReview) {
                if (err) {
                    return handleError(res, err.message, "Failed to create new review.");
                } else {
                    addReviewToAccommodation(existingAccommodation, insertedReview.ops[0]);
                    return res.status(201).json(insertedReview.ops[0]);
                }
            });
        } else {
            let formattedAddress = address.streetName + ' ' + address.houseNumber + ', '
                + address.postalCode + ' ' + address.city + ', ' + address.country;
            googleMapsClient.geocode({
                address: formattedAddress
            })
                .asPromise()
                .then((gData) => {
                    console.log('geocode results');
                    console.log(gData.json.results);


                    const newAccommodation = {
                        address: address,
                        location: {
                            latitude: gData.json.results[0].geometry.location.lat,
                            longitude: gData.json.results[0].geometry.location.lng,
                        },
                        createdBy: userID,
                        createdTimestamp: new Date()
                    };
                    db.collection(ACCOMMODATIONS_COLLECTION).insertOne(newAccommodation, function(err, insertedAccommodation) {
                        if (err) {
                            return handleError(res, err.message, "Failed to create new accommodation while submitting review.");
                        } else {
                            const newReview = {
                                userID: userID,
                                accommodationID: insertedAccommodation.ops[0]._id,
                                address: address,
                                rating: rating,
                                review: review,
                                price: price,
                                timestamp: new Date(),
                                originUrl: req.headers.origin
                            };
                            db.collection(REVIEWS_COLLECTION).insertOne(newReview, function(err, insertedReview) {
                                if (err) {
                                    return handleError(res, err.message, "Failed to create new review.");
                                } else {
                                    addReviewToAccommodation(insertedAccommodation.ops[0], insertedReview.ops[0]);

                                    return res.status(201).json(insertedReview.ops[0]);
                                }
                            });
                        }

                    });
                })
                .catch((gError) => {
                    console.log(gError);
                });
        }

    });


});

const addReviewToAccommodation = function(accommodation, review) {
    let averageRating = accommodation.averageRating;
    if (!averageRating) {
        averageRating = {
            rating: review.rating,
            reviews: [review._id]
        };
    } else {
        let rating = averageRating.rating;
        let reviews = averageRating.reviews;

        reviews.push(review._id);
        rating = rating + (review.rating - rating)/reviews.length;
        averageRating = {
            rating: rating,
            reviews: reviews
        };
    }

    let averagePrice;
    if (review.price && review.price.amount && review.price.currency && review.price.period) {
        averagePrice = accommodation.averagePrice;
        let newPrice = getPricePerMonth(review.price.amount, review.price.period);
        if (!averagePrice) {
            averagePrice = {
                price: newPrice,
                reviews: [review._id]
            };
        } else {
            let price = averagePrice.price;
            let reviews = averagePrice.reviews;

            reviews.push(review._id);
            price = price + (newPrice - price)/reviews.length;
            averagePrice = {
                price: price,
                reviews: reviews
            };
        }
    }

    let updateProperties = averagePrice ?
        {averageRating: averageRating, averagePrice: averagePrice} : {averageRating: averageRating};

    db.collection(ACCOMMODATIONS_COLLECTION).updateOne({_id: accommodation._id}, {$set: updateProperties}).then(data => {
        console.log('updated accommodation');
        console.log(data.matchedCount);
    }).catch(error => {
        console.log('failed to update accommodation');
        console.log(error);
    });

};

const getPricePerMonth = function(amount, period) {
    if (period === 'week') {
        return amount / 4;
    }
    return amount;
};