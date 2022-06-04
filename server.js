const express = require('express');
const bodyParser = require('body-parser');
// const passport = require('passport');
const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config();


// Event Listeners
const {CreateListener, CancelListener} = require('./listeners/OrderListener');

CreateListener();
CancelListener();


// Load the routes from the api
const order = require('./routes/api/order');




// Initialize the app
const app = express();

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