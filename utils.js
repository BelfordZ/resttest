module.exports.makeDateRange = makeDateRange;

function makeDateRange(start, end) {
  var d = [];
  var curr = start.clone();
  while(curr.isBefore(end)) {
    d.push(curr.format('YYYY-MM-DD'));
    curr.add(1, 'day');
  }
  return d;
}
