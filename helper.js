
const getAddressSlug = (address) => {
    let text = address.streetName + ' ' + address.houseNumber + ' ' + address.postalCode + ' ' + address.city
        + ' ' + address.country;
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
};

const getFormattedAddress = (address) => {
    return address.streetName + ' ' + address.houseNumber + ', ' + address.postalCode + ' ' + address.city + ', ' +
        address.country;
};

const getReviewSlug = (addressSlug) => {
    return Date.now() + '/' + addressSlug;

};

const getDropboxFilepath = (filename, reviewSlug, index) => {
  return '/review-photos/' + reviewSlug + '-' + index + '.' + filename.split('.').pop();
};

module.exports = {
    getAddressSlug: getAddressSlug,
    getReviewSlug: getReviewSlug,
    getFormattedAddress: getFormattedAddress,
    getDropboxFilepath: getDropboxFilepath
};