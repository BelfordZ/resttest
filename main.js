var benchApi = require('./bench-api.js');


benchApi.transaction.getAll((err, results) => {
  console.log(results);
});
