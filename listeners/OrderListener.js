const ethers = require("ethers");
const createOrder = require("../utils/createOrder");
const cancelOrder = require("../utils/cancelOrder");
const OrderbookContractABI = require("../abis/BeeTradeOrderbook.json");
const {fetchOrders} = require("../firebase");

require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
var privateKey = process.env.PRIVATE_KEY;
var signer = new ethers.Wallet(privateKey, provider);
// returns modified order or intact order
let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, signer);

async function estimateMarketOrder(pair, buySell, amountA, amountB){
    if(buySell === 'buy'){
        let orders = await fetchOrders(pair, 'SELL')
        let sortedOrders = orders.sort((a, b) => a.price - b.price);
        let amountAvailable = amountB;
        let amountGet = 0;
        let price = 0;
        let index = 0;

        while (true) {
            let currentOrder = sortedOrders[index];

            if(!currentOrder){
                amountGet += (amountAvailable/price);
                break;
            }
            
            if(currentOrder.amountB < amountAvailable){
                console.log('Amounnt Available',amountAvailable)
                console.log('current order amounnt A',currentOrder.amountA)
                amountGet += currentOrder.amountA;
                console.log('current order amounnt B',currentOrder.amountB)
                amountAvailable -= currentOrder.amountB;
                console.log('Amounnt Left',amountAvailable)
                if(index===0) price = currentOrder.price;
                index++;

            } else {
                console.log('current order amounnt B Last',currentOrder.amountB)
                console.log('Amount to be addded',(amountAvailable/currentOrder.price))
                amountGet += (amountAvailable/currentOrder.price);
                amountAvailable -= currentOrder.amountB;
                if(index===0) price = currentOrder.price;
                break;
            }
        }

        return {price, amountGet}
    } else {
        let orders = await fetchOrders(pair, 'BUY')
        let sortedOrders = orders.sort((a, b) => b.price - a.price);
        let amountAvailable = amountA;
        let amountGet = 0;
        let price = 0;
        let index = 0;

        do {
            let currentOrder = sortedOrders[index];
            if(currentOrder.amountA < amountAvailable){
                amountGet += currentOrder.amountB;
                amountAvailable -= currentOrder.amountA;
                if(index===0) price = currentOrder.price;
                index++;

            } else {
                amountGet += (amountAvailable*currentOrder.price);
                if(index===0) price = currentOrder.price;
                continueLoop = false;
            }
        } while (continueLoop)
        return {price, amountGet}
    }
}

async function CreateListener(){
    OrderbookContract.on('CreateOrder', async (account, amount, buySell, date, orderType, pair, price, orderID) => {
        
        let marketPrice, marketAmountGet;
        if(orderType === 'market') {
            let data = await estimateMarketOrder(pair, buySell, amount/1e18, amount/1e18);
            marketPrice = data.price;
            marketAmountGet = data.amountGet;
        }

        let volume = amount/1e18;
        let _price = price/1e18;
        
        if(orderType === 'limit' && _price === 0) return;
        if(volume == 0) return;
        
        let orderData = {
            id: orderID,
            pair,
            amountA: buySell === 'buy'? (orderType === 'market' ? +marketAmountGet.toFixed(4) : +(volume/_price).toFixed(4)) : +volume.toFixed(4),
            amountB: buySell === 'buy'? +volume.toFixed(4) : (orderType === 'market' ? +marketAmountGet.toFixed(4) : +(volume * _price).toFixed(4)),
            price: orderType === 'market' ? +marketPrice.toFixed(4) : +_price.toFixed(4), 
            volume: volume.toFixed(4), 
            buySell, 
            orderType, 
            account,
            filledAmount: 0,
            date: parseInt(date),
            fills: []
        };
        console.log('Order Created', orderData)
        createOrder(orderData);
    })
    
    
}

async function CancelListener(){
    OrderbookContract.on('CancelOrder', (account, pair, buySell, orderID) => {
        console.log('Order Cancelled', {account, pair, buySell, id: orderID})
        cancelOrder({account, pair, buySell, id: orderID});
    })
    
    
}

module.exports = {CreateListener, CancelListener};