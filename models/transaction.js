var request = require('superagent');
var async = require('async');
var _ = require('underscore');

module.exports.getPage = getPage;
module.exports.getAll = getAllPages;

function getPage(pageNumber, cb) {
  request
    .get(`http://resttest.bench.co/transactions/${pageNumber}.json`, parseBody);

  function parseBody(err, result) { return cb(err, result.body); }
}

function getAllPages(cb) {
  var pages = [];

  var flow = [
    getPageNumbers,
    getAllPages
  ];

  async.waterfall(flow, returnResults);

  function getPageNumbers(cb) {
    module.exports.getPage(1, (err, firstPage) => {
      if (err) { return cb(err, null); }

      pages.push(firstPage);

      var numberOfPages = Math.ceil(firstPage.totalCount / 10) + 1;

      var pageNumbersLeft = _.range(2, numberOfPages);

      return cb(null, pageNumbersLeft);
    });
  }

  function getAllPages(pageNumbers, cb) {
    async.mapLimit(pageNumbers, 100, module.exports.getPage, cb);
  }

  function returnResults(err, results) {
    if (err) return cb(err, null);

    pages = pages.concat(results);

    var allTransactions = _.chain(pages)
          .pluck('transactions')
          .flatten()
          .value();

    var totalBalance = _.chain(allTransactions)
          .pluck('Amount')
          .map(parseFloat)
          .reduce((a, b) => a + b, 0)
          .value();

    return cb(null, {
      totalBalance: totalBalance,
      totalCount: allTransactions.length,
      transactions: allTransactions
    });
  }
}

