// ********************** Initialize server **********************************

const server = require('../src/index.js'); //TODO: Make sure the path to your index.js is correctly added

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

describe('Register pass', () => {
  it('Create a new account with register page', done => {
    chai.request(server)
    .post('/register')
    .send({Username: "test-name", Password: "password123", Email: "email@email.com"})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.message).to.equals('Success');
      done();
    });
  });
});

describe('Register fail', () => {
  it('Create an account with an already used email', done => {
    chai.request(server)
    .post('/register')
    .send({Username: "ESkam", Password: "password123", Email: "email@email.com"})
    .end((err, res) => {
      console.log(res.body);
      expect(res).to.have.status(400);
      //expect(res.body.message).to.equals('Email in use');
      done();
    });
  });
});

// ********************************************************************************