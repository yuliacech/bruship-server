const chai = require('chai');
const expect = chai.expect;
const helper = require('../helper');

describe('helper', () => {

    it('should create correct slug from address', () => {
        const address = {
            streetName: 'Rue Haute',
            houseNumber: '11',
            postalCode: '1234',
            city: 'Brussels',
            country: 'Belgium'
        };

        const addressSlug = helper.getAddressSlug(address);
        expect(addressSlug).to.equal('rue-haute-11-1234-brussels-belgium');
    });
});
