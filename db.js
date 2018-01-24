const mongodb = require('mongodb');
let db;
const ObjectID = mongodb.ObjectID;
const BRUSHIP_DB = 'bruship';
const REVIEWS_COLLECTION = 'reviews';
const ACCOMMODATIONS_COLLECTION = 'accommodations';
const SUBSCRIBERS_COLLECTION = 'subscribers';

const BRUSSELS_LOCATION_QUERY =
    {
        'location':
            {
                $near: {
                    $geometry:
                        {type: "Point", coordinates: [4.351710300000036, 50.8503396]},
                    $maxDistance: 20000
                }
            }
    };

mongodb.MongoClient.connect(process.env.MONGODB_URI)
    .then((client) => {
        db = client.db(BRUSHIP_DB);
        console.log("Database connection ready");
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });

const findAccommodationByAddressSlug = (addressSlug) => {
    return db.collection(ACCOMMODATIONS_COLLECTION).findOne({addressSlug: addressSlug});
};

const findReviewByID = (id) => {
    return db.collection(REVIEWS_COLLECTION).findOne({_id: new ObjectID(id)});
};

const findAccommodationByAddress = (address) => {
    return db.collection(ACCOMMODATIONS_COLLECTION).findOne({address: address});
};

const insertAccommodation = (newAccommodation) => {
    return db.collection(ACCOMMODATIONS_COLLECTION).insertOne(newAccommodation);
};

const insertReview = (newReview) => {
    return db.collection(REVIEWS_COLLECTION).insertOne(newReview);
};

const updateAccommodation = (id, updateProperties) => {
    return db.collection(ACCOMMODATIONS_COLLECTION).updateOne({_id: id}, {$set: updateProperties});
};

const findAccommodations = (limit) => {

    return db.collection(ACCOMMODATIONS_COLLECTION).find(BRUSSELS_LOCATION_QUERY).sort({rating: -1}).limit(limit).toArray();
};

const insertSubscriber = (newSubscriber) => {
    return db.collection(SUBSCRIBERS_COLLECTION).insertOne(newSubscriber);
};

const findReviewsByUserID = (userID) => {
    const query = { userID: userID };
    return db.collection(REVIEWS_COLLECTION).find(query).toArray();
};

const findAccommodationsByCoordinates = (location) => {
    const longitude = parseFloat(location.longitude);
    const latitude = parseFloat(location.latitude);

    const maxDistanceInMeters = 500;
    const query =
        {
            'location':
                {
                    $near: {
                        $geometry:
                            {type: "Point", coordinates: [longitude, latitude]},
                        $maxDistance: maxDistanceInMeters
                    }
                }
        };

    return db.collection(ACCOMMODATIONS_COLLECTION).find(query).toArray();
};

module.exports = {
    findAccommodationByAddressSlug: findAccommodationByAddressSlug,
    findAccommodationByAddress: findAccommodationByAddress,
    findReviewByID: findReviewByID,
    insertAccommodation: insertAccommodation,
    insertReview: insertReview,
    updateAccommodation: updateAccommodation,
    findAccommodations: findAccommodations,
    insertSubscriber: insertSubscriber,
    findReviewsByUserID: findReviewsByUserID,
    findAccommodationsByCoordinates: findAccommodationsByCoordinates
};