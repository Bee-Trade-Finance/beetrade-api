var LimitOrder = require('limit-order-book').LimitOrder
var LimitOrderBook = require('limit-order-book').LimitOrderBook
var MarketOrder = require('limit-order-book').MarketOrder

let side = new Map();
side.set('buy', 'bid');
side.set('sell', 'ask')

let book = new LimitOrderBook();

let newBookOrder = new LimitOrder('1', side.get('buy'), 1.2, 5);

let result = book.add(newBookOrder);

let newBookOrder2 = new MarketOrder('2', side.get('sell'), 5,10);

let result2 = book.add(newBookOrder2);

console.log(result2)



