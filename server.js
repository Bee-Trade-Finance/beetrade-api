const express = require('express');
const bodyParser = require('body-parser');
// const passport = require('passport');
const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config();

// DB Config


// Load the routes from the api
const order = require('./routes/api/order');




// Initialize the app
const app = express();

// set the directory for loading assets from the server
app.use(express.static('public'));


// Enable cors middleware for enabling cross origin requests
app.use(cors());


// Body parser middleware for parsing requests to json formats
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Load the routes into the application
app.use('/api/order', order);



// Select the port for the application
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({status: 'Working'})
})

// Listen on the selected ports for any incoming requests
app.listen(port, () => {
    console.log(`Server has started on port ${port}`);
})


// var LimitOrder = require('limit-order-book').LimitOrder
// var LimitOrderBook = require('limit-order-book').LimitOrderBook
// var MarketOrder = require('limit-order-book').MarketOrder
 
// let order1 = new LimitOrder("order01", "bid", 13.37, 10)
// let order2 = new LimitOrder("order02", "ask", 13.37, 5)
// let order3 = new LimitOrder("order03", "ask", 13.37, 5)
// let order4 = new LimitOrder("order04", "ask", 13.37, 5)
 
// let book = new LimitOrderBook()
 
// let result = book.add(order1)
// console.log('1',result)
// result = book.add(order2)
// console.log('2',result)
// result = book.add(order3)
// console.log('3',result)
// result = book.add(order4)
 
// console.log(result)
// console.log('book',book)