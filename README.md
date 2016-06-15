# resttest

```
git clone https://github.com/BelfordZ/resttest.git
cd resttest
npm install
node main.js
```

for this problem, I make 1 request to get the first page, with which I determine the number of requests that need to be made. I then make each request in parallel, with a limit of x. 

I chose to ignore the first bonus problem, as the data seemed mostly arbitrary, and I would need more clarification as to what is expected + what the is domain of potential strings

The other three bonuses are included. 

The uniqueness one has a small quirk in that I felt like using a hashmap in order to unique the set of objects, which in javascript is a costly operation compared to hashing.

that is all. I hope you enjoy.

## tests
`npm test`
