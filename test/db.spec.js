const chai = require('chai');
const expect = chai.expect;
const db = require('../db');

describe('db', () => {

    it('not-existing accommodation', (done) => {
        setTimeout(() => {
                db.findAccommodationByAddressSlug('not-existing')
                    .then(accommodation => {
                        console.log('accommodation');
                        console.log(accommodation);
                    })
                    .catch(error => {
                        console.log('error');
                        console.log(error);

                    });
            }, 1000
        )
    });

});
