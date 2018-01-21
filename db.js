const mongodb = require('mongodb');
let db;
const REVIEWS_COLLECTION = 'reviews';
const ACCOMMODATIONS_COLLECTION = 'accommodations';
const SUBSCRIBERS_COLLECTION = 'subscribers';

mongodb.MongoClient.connect(process.env.MONGODB_URI)
    .then((database) => {
        db = database;
        console.log("Database connection ready");
    })
    .catch((error) => {
        console.log(err);
        process.exit(1);
    });

const findAccommodationByAddressSlug = (addressSlug) => {
    return db.collection(REVIEWS_COLLECTION).findOne({addressSlug: addressSlug});
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

const findAccommodations = () => {
    return db.collection(ACCOMMODATIONS_COLLECTION).find({}).toArray();
};

const insertSubscriber = (newSubscriber) => {
    return db.collection(SUBSCRIBERS_COLLECTION).insertOne(newSubscriber);
};

const findReviewsByUserID = (userID) => {
    const query = { userID: userID };
    return db.collection(REVIEWS_COLLECTION).find(query).toArray();
};

module.exports = {
    findAccommodationByAddressSlug: findAccommodationByAddressSlug,
    findAccommodationByAddress: findAccommodationByAddress,
    insertAccommodation: insertAccommodation,
    insertReview: insertReview,
    updateAccommodation: updateAccommodation,
    findAccommodations: findAccommodations,
    insertSubscriber: insertSubscriber,
    findReviewsByUserID: findReviewsByUserID
};