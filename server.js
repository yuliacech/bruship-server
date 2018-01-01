var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var cors = require('cors');

var ACCOMMODATIONS_COLLECTION = "accommodations";

var app = express();
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;
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
    var server = app.listen(process.env.PORT || 8080, function () {
        var port = server.address().port;
        console.log("App now running on port", port);
    });
});

var allowedOrigins = [
    'http://localhost:4200',
    'https://solid-flow.github.io'
];
app.use(cors({
    origin: function(origin, callback){
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
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
    const maxNumber = req.params.maxNumber ? req.params.maxNumber : 12;
    db.collection(ACCOMMODATIONS_COLLECTION).find({}).limit(maxNumber).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get " + maxNumber + " top accommodations.");
        } else {
            res.status(200).json(docs);
        }
    });
});
