// ********************** Initialize server **********************************

const server = require('../src/index.js');

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

console.log("serverspec test running");

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************


// ********************************************************************************

describe('Database Tests', () => {
  // Sample test case given to test / endpoint.

  it('Local Query Succeeds (Movie in Database)', done => {
    chai
      .request(server)
      .get('/test_database')
      .end((err, res) => {
        //expect(res).to.have.status(201);
        assert.strictEqual(res.body.message.testOne.success, true)
        done();
      });
  });

  it('Local Query Fails (Movie Not in Database)', done => {
    chai
      .request(server)
      .get('/test_database')
      .end((err, res) => {
        //expect(res).to.have.status(201);
        assert.strictEqual(res.body.message.testTwo.success, false)
        done();
      });
  });
    

});


describe('Movie Retrieval Tests', () => {
  // Sample test case given to test / endpoint.
  it('TMDB Query', done => {
    chai
      .request(server)
      .get('/test_query')
      .end((err, res) => {
        //expect(res).to.have.status(201);
        assert.strictEqual(res.body.message.testOne.success, true) 
        done();
      });
  });
  it('Cache Successful', done => {
    chai
      .request(server)
      .get('/test_query')
      .end((err, res) => {
        //expect(res).to.have.status(201);
        assert.strictEqual(res.body.message.testTwo.success, true) 
        done();
      });
  });
});
