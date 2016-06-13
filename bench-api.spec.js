var sinon = require('sinon');
var expect = require('expect');
var transaction = require('./models/transaction');

describe('transaction', () => {
  it('calls the api the correct number of times', (done) => {
    sinon.stub(transaction, 'getPage').callsArgWith(-1, null, { totalCount: 47, transactions: [] });
    
    transaction.getAll((err, result) => {
      expect(transaction.getPage.callCount).toEqual(5);
      done();
    });
  });
});
