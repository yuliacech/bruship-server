const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const sinon = require('sinon');

const mock = require('mock-require');

describe('controller', () => {

    let server;
    let dbStub;
    let googleStub;
    let controller;
    beforeEach(() => {
        mock('express-jwt', function(options) {
            return function (req, res, next) {
                console.log('called fake express-jwt');
                req.user = {sub: 'testUser'};
                return next();
            }
        });

        mock('../db', {
            findAccommodationByAddress: function (address) {
                console.log('fake db call with ' + address);
                if (address.streetName === 'not-existing') {
                    return Promise.resolve(null);
                }
            },
            insertAccommodation: function (accommodation) {
                console.log('fake db call with ' + accommodation);
                return Promise.resolve({bal: 'bla'});
            }
        });

        mock('@google/maps', {
            createClient: function () {
                console.log('created client');
                return {
                    geocode: function () {
                        return {

                            asPromise: function () {
                                return Promise.resolve({
                                    json: {
                                        results: [{
                                            geometry: {
                                                location: {
                                                    lat: 1234,
                                                    lng: 111
                                                }
                                            }
                                        }]
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });


        server = require('../server');
        controller = require('../controller');
    });
    afterEach(() => {
    });

    it('should throw an error if not full address: missing streetName', (done) => {
        const address = {
            houseNumber: '11',
            postalCode: '1234',
            city: 'Brussels',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });
    it('should throw an error if not full address: missing houseNumber', (done) => {
        const address = {
            streetName: 'Rue Haute',
            postalCode: '1234',
            city: 'Brussels',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });
    it('should throw an error if not full address: missing postalCode', (done) => {
        const address = {
            streetName: 'Rue Haute',
            houseNumber: '11',
            city: 'Brussels',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });
    it('should throw an error if not full address: missing city', (done) => {
        const address = {
            streetName: 'Rue Haute',
            houseNumber: '11',
            postalCode: '1234',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });
    it('should throw an error if not full address: missing country', (done) => {
        const address = {
            streetName: 'Rue Haute',
            houseNumber: '11',
            postalCode: '1234',
            city: 'Brussels',
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });

    it('should throw an error if no rating', (done) => {
        const address = {
            streetName: 'Rue Haute',
            houseNumber: '11',
            postalCode: '1234',
            city: 'Brussels',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });

    it('test existing address', (done) => {
        const address = {
            streetName: 'not-existing',
            houseNumber: '1',
            postalCode: '1234',
            city: 'Brussels',
            country: 'Belgium'
        };
        chai.request(server)
            .post('/api/user/reviews_with_photos')
            .field('address', JSON.stringify(address))
            .field('rating', '1')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res).to.be.a('object');
                expect(res.body).to.not.have.property('error').eql('Missing parameters address (or parts of it) or rating in request');
                done();
            })
    });

});
