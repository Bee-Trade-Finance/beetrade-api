const ethers = require("ethers");
const createOrder = require("../utils/createOrder");
const cancelOrder = require("../utils/cancelOrder");
const OrderbookContractABI = require("../abis/BeeTradeOrderbook.json");

require("dotenv").config();

async function CreateListener(){
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    var privateKey = process.env.PRIVATE_KEY;
    var signer = new ethers.Wallet(privateKey, provider);
    // returns modified order or intact order
    let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, signer);
    
    OrderbookContract.on('CreateOrder', (account, amount, buySell, date, orderType, pair, price, orderID) => {
        let volume = amount/1e18;
        let _price = price/1e18;
        let orderData = {
            id: orderID,
            pair,
            amountA: buySell === 'buy'? volume/_price : volume,
            amountB: buySell === 'buy'? volume : volume * _price,
            price: _price, 
            volume, 
            buySell, 
            orderType, 
            account,
            filledAmount: 0,
            date,
            fills: []
        };
        createOrder(orderData);
        // console.log(`Order Account: ${account}`);
        // console.log(`Order Amount: ${amount/1e18}`);
        // console.log(`Order BuySell: ${buySell}`);
        // console.log(`Order Date: ${date}`);
        // console.log(`Order Type: ${orderType}`);
        // console.log(`Order Pair: ${pair}`);
        // console.log(`Order Price: ${price/1e18}`);
        // console.log(`Order ID: ${orderID}`);
    })
    
    
}

async function CancelListener(){
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    var privateKey = process.env.PRIVATE_KEY;
    var signer = new ethers.Wallet(privateKey, provider);
    // returns modified order or intact order
    let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, signer);
    
    OrderbookContract.on('CancelOrder', (account, pair, buySell, orderID) => {
        
        cancelOrder({account, pair, buySell, id: orderID});
    })
    
    
}

module.exports = {CreateListener, CancelListener};