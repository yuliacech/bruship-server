const Dropbox = require('dropbox');
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_API_KEY });
const mongodb = require("mongodb");


const helper = require('./helper');
const db = require('./db');

const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_API_KEY,
    Promise: Promise
});

const reviewsWithPhotos =  (req, res) => {

    const formData = JSON.parse(req.body.review);
    // address and rating are required
    const address = formData.address;
    const rating = formData.rating;
    if (!address || !address.streetName || !address.houseNumber || !address.postalCode || !address.city
        || !address.country || !rating) {
        const error = 'Missing parameters address (or parts of it) or rating in request';
        return handleError(res, error, error, 400);
    }

    // review and price are optional
    const review = formData.review;
    const price = formData.price;
    const duration = formData.duration;

    const userID = req.user.sub;

    // check if accommodation exists
    const addressSlug = helper.getAddressSlug(address);
    const reviewSlug = helper.getReviewSlug(addressSlug);

    let uploadedPhotos;
    uploadPhotosToDropbox(req.files, reviewSlug)
        .then(filenames => {
            uploadedPhotos = filenames;
            return findOrInsertAccommodation(address, userID)
        })
        .then(accommodation => {
            const newReview = {
                address: address,
                rating: rating,
                review: review,
                price: price,
                duration: duration,
                userID: userID,
                accommodationID: accommodation._id,
                photos: uploadedPhotos,
                reviewSlug: reviewSlug,
                timestamp: new Date(),
                originUrl: req.headers.origin
            };
            return db.insertReview(newReview).then(data => Promise.resolve(data.ops[0]));
        })
        .then(insertedReview => {
            return updateAccommodationWithNewReview(insertedReview);
        })
        .then(data => {
            return res.status(201).json({reviewSlug: reviewSlug});
        })
        .catch((error) => {
            return handleError(res, err.message, "Failed to find existing accommodation while submitting review.");
        });

};

const findOrInsertAccommodation = (address, userID) => {
    return db.findAccommodationByAddress(address)
        .then (accommodation => {
            if (accommodation) {
                return Promise.resolve(accommodation);
            } else {
                // creating new accommodation
                let formattedAddress = helper.getFormattedAddress(address);
                return googleMapsClient.geocode({address: formattedAddress})
                    .asPromise()
                    .then((googleData) => {
                        if (googleData && googleData.json && googleData.json.results && googleData.json.results.length > 0) {
                            return Promise.resolve({
                                latitude: googleData.json.results[0].geometry.location.lat,
                                longitude: googleData.json.results[0].geometry.location.lng,
                            });
                        } else {
                            return Promise.resolve('No geo coordinates found');
                        }
                    })
                    .catch(googleError => {
                        return Promise.resolve('Error with geo coordinates');
                    })
                    .then(location => {
                        let newAccommodation;
                        if (location && location.latitude && location.longitude) {
                            newAccommodation = {
                                addressSlug: helper.getAddressSlug(address),
                                address: address,
                                location: location,
                                createdBy: userID,
                                createdTimestamp: new Date()
                            };
                        } else {
                            newAccommodation = {
                                addressSlug: helper.getAddressSlug(address),
                                address: address,
                                createdBy: userID,
                                createdTimestamp: new Date()
                            };
                        }
                        return db.insertAccommodation(newAccommodation).then(data => Promise.resolve(data.ops[0]));
                    })
            }
        });

};

const uploadPhotosToDropbox = (files, reviewSlug) => {
    let uploadedFilenames = [];
    let uploadPromises = [];
    files.forEach((file, index) => {
        let dropboxFilepath = helper.getDropboxFilepath(file.originalname, reviewSlug, index);
        uploadPromises.push(dbx.filesUpload({ path: dropboxFilepath, contents: file.buffer }));
    });

    return Promise.all(uploadPromises)
        .then(data => {
            let sharePromises = [];
            data.map(uploadData => {
                sharePromises.push(dbx.sharingCreateSharedLinkWithSettings({path: uploadData.path_lower}));
            });
            return Promise.all(sharePromises);
        })
        .then(data => {
            data.map(shareData => {
                let url = shareData.url.replace('https://www.dropbox.com', 'https://dl.dropboxusercontent.com');
                uploadedFilenames.push(url);
            });
            return Promise.resolve(uploadedFilenames);
        });

};

const updateAccommodationWithNewReview = (review) => {
    return db.findAccommodationByAddress(review.address)
        .then(accommodation => {
            let averageRating = accommodation.rating;
            let existingReviews = accommodation.reviews;
            if (!averageRating) {
                averageRating = review.rating;
                existingReviews = [review._id];
            } else {
                existingReviews.push(review._id);
                averageRating = averageRating + (review.rating - averageRating)/existingReviews.length;
            }

            let photos = accommodation.photos;
            if (!photos) {
                photos = [];
            }
            photos.push(...review.photos);

            let updateProperties = {
                rating: averageRating,
                reviews: existingReviews,
                latestReview: review._id,
                photos: photos
            };
            if (review.price) {
                updateProperties.price = review.price;
            }
            return db.updateAccommodation(accommodation._id, updateProperties);
        })

};
// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

const getAccommodations = (req, res) => {
    db.findAccommodations()
        .then (docs => {
            return res.status(200).json(docs);
        })
        .catch(error => {
            return handleError(res, err.message, "Failed to get accommodations.");
        })
};

const addSubscriber = (req, res) => {
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

    db.insertSubscriber(newSubscriber)
        .then(doc => {
            return res.status(201).json(doc.ops[0]);
        })
        .catch(error => {
            return handleError(res, err.message, "Failed to create new subscriber.");
        });
};

const getReviews = (req, res) => {
    db.findReviewsByUserID(req.user.sub)
        .then(docs => {
            return res.status(200).json(docs);
        })
        .catch(error => {
            handleError(res, err.message, "Failed to get reviews for user " + req.user.sub);
        });
};

module.exports = {
    reviewsWithPhotos: reviewsWithPhotos,
    getAccommodations: getAccommodations,
    addSubscriber: addSubscriber,
    getReviews: getReviews
};