const dotenv = require('dotenv');
dotenv.config();

// Event Listeners

const {CreateListener, CancelListener} = require('./listeners/OrderListener');

CreateListener();
CancelListener();