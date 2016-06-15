var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var objectHash = require('object-hash');
var moment = require('moment');
var utils = require('../utils');

module.exports.getPage = getPage;
module.exports.getAll = getAllPages;
module.exports.filters = filters;
module.exports.aggregates = aggregates;

function getPage(pageNumber, cb) {
  request
    .get(`http://resttest.bench.co/transactions/${pageNumber}.json`, parseBody);

  function parseBody(err, result) { return cb(err, result.body); }
}

function getAllPages(cb) {
  var flow = [
    getPageNumbers,
    getAllPages
  ];

  async.waterfall(flow, returnResults);

  var pages = [];

  function getPageNumbers(cb) {
    module.exports.getPage(1, (err, firstPage) => {
      if (err) { return cb(err, null); }

      var numberOfPages = Math.ceil(firstPage.totalCount / 10) + 1;
      var pageNumbersLeft = _.range(2, numberOfPages);

      pages.push(firstPage);
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

    var uniqueTransactions = filters.unique(allTransactions);

    var categorized = aggregates.categorize(uniqueTransactions);
    var dailyBalances = aggregates.dailyBalance(uniqueTransactions);

    return cb(null, {
      totalBalance: calcSum(uniqueTransactions),
      totalCount: uniqueTransactions.length,
      transactions: uniqueTransactions,
      categorized: categorized,
      dailyBalances: dailyBalances
    });
  }
}

var aggregates = {
  sum: (transactions) => {
    return _.chain(transactions)
      .pluck('Amount')
      .map(parseFloat)
      .reduce((a, b) => a + b, 0)
      .value();
  },
  categorize: (transactions) => {
    return _.chain(transactions)
      .filter((transaction) => transaction.Ledger !== '')
      .groupBy('Ledger')
      .each((transactions, categoryName, groups) => {
        groups[categoryName] = {
          totalBalance: calcSum(transactions),
          transactions: transactions
        };
      })
      .value();
  },
  dailyHistogram: (transactions) => {
    var sortedTransactions = _.sortBy(transactions, 'Date');
    var start = moment(_.first(sortedTransactions).Date);
    var end = moment(_.last(sortedTransactions).Date);

    var grouped = _.groupBy(sortedTransactions, 'Date');
    var balance = 0;

    return _.map(utils.makeDateRange(start, end), function(d) {
      var todaysTransactions = grouped[d];
      if (todaysTransactions === undefined) return balance;
      var result = {};
      result[d] = calcSum(todaysTransactions);
      return result;
    });
  }
};

var filters = {
  unique: (objects) {
    // NOTE: Potential collisions - it is not impossible for a collision, resulting
    //   it removing non-duplicates. To fix, use a deep equals + any type of
    //   Set Uniqueness algorithm ( O(n log n), will be slower. )
    return _.chain(objects)
      .groupBy((obj) => objectHash(obj)) 
      .map(_.first)
      .values()
      .value();
  },
};

