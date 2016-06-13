var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var objectHash = require('object-hash');
var moment = require('moment');

module.exports.getPage = getPage;
module.exports.getAll = getAllPages;

function getPage(pageNumber, cb) {
  request
    .get(`http://resttest.bench.co/transactions/${pageNumber}.json`, parseBody);

  function parseBody(err, result) { return cb(err, result.body); }
}

var hash = (obj) => objectHash(obj);
function removeDupes(objects) {
  return _.chain(objects)
    .groupBy(hash)
    .map(_.first)
    .values()
    .value();
}

function calcSum(transactions) {
  return _.chain(transactions)
    .pluck('Amount')
    .map(parseFloat)
    .reduce((a, b) => a + b, 0)
    .value();
}

function categorize(transactions) {
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
}

function dailyBalance(transactions) {
  var sortedTransactions = _.sortBy(transactions, 'Date');
  var start = moment(_.first(sortedTransactions).Date);
  var end = moment(_.last(sortedTransactions).Date);

  var grouped = _.groupBy(sortedTransactions, 'Date');
  var balance = 0;
  return _.map(makeDateRange(start, end), function(d) {
    var todaysTransactions = grouped[d];
    if (todaysTransactions === undefined) return balance;
    var result = {};
    result[d] = calcSum(todaysTransactions);
    return result;
  });
}

function makeDateRange(start, end) {
  var d = [];
  var curr = start.clone();
  while(curr.isBefore(end)) {
    d.push(curr.format('YYYY-MM-DD'));
    curr.add(1, 'day');
  }
  return d;
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

    var uniqueTransactions = removeDupes(allTransactions);

    var categorized = categorize(uniqueTransactions);
    var dailyBalances = dailyBalance(uniqueTransactions);

    return cb(null, {
      totalBalance: calcSum(uniqueTransactions),
      totalCount: uniqueTransactions.length,
      transactions: uniqueTransactions,
      categorized: categorized,
      dailyBalances: dailyBalances
    });
  }
}

