var LimitOrder = require('limit-order-book').LimitOrder
var LimitOrderBook = require('limit-order-book').LimitOrderBook
var MarketOrder = require('limit-order-book').MarketOrder
const { onSnapshot, query, collection, db, where, doc, updateDoc, deleteDoc, setDoc } = require("../firebase");
const executeTrade = require('../utils/executeTrade');

let side = new Map();
side.set('buy', 'bid');
side.set('sell', 'ask')

let book = new LimitOrderBook();


let currentbuyOrders = [];
let currentsellOrders = [];
let newbuyOrders = [];
let newSellOrders = [];
let pair = "AVAX-USDT";
let pairBuy = "AVAX-USDT-BUY";
let pairSell = "AVAX-USDT-SELL";
let pairTrade = "AVAX-USDT-TRADES"
let AVAX = "0x0000000000000000000000000000000000000000";
let USDT = "0x731E66a4D82c6f0EE921D47AB3B4503347e9AEC8";

function processTrade(trade){
    const {taker, makers} = trade;
    // process trade
    // update firebase
    // makerAddress, takerAddress, tokenGetAddress, tokenGiveAddress, amountGet, amountGive, makeOrderID, takeOrderID, pair, price
    let takerOrder = taker.side === 'bid' ? newbuyOrders.find(order => order.id === taker.orderId) : newSellOrders.find(order => order.id === taker.orderId);
    let takerAddress =  takerOrder.account;
    
    let tokenGetAddress = taker.side === 'bid' ? USDT : AVAX;
    let tokenGiveAddress = taker.side === 'bid' ? AVAX : USDT;

    makers.forEach(maker => {
        let makerOrder = maker.side === 'bid' ? newbuyOrders.find(order => order.id === maker.orderId) : newSellOrders.find(order => order.id === maker.orderId);
        let makerAddress = makerOrder.account;

        let amountGet = taker.side === 'bid'? maker.valueRemoved : (maker.valueRemoved / maker.price );
        let amountGive = taker.side === 'bid' ? (maker.valueRemoved / maker.price ) : maker.valueRemoved;

        let makeOrderID = maker.orderId;
        let takeOrderID = taker.orderId;

        let price = maker.price;
        let obj = {
            makerAddress,
            takerAddress,
            tokenGetAddress,
            tokenGiveAddress,
            amountGet,
            amountGive,
            makeOrderID,
            takeOrderID,
            pair,
            price
        };
        executeTrade(obj).then(execution => {
            console.log('execution', execution)
            updateFirebaseTrade(trade);
            // if fully fileed update details and then move to user trades
            // else
            // check if taker is buy or sell
            // update taker filled amount
            // update taker fills

            // loop makers
            // do same thing for each maker
        }).catch(error => console.log('error', error))
    })

}

function updateFirebaseTrade(trade){
    const {taker, makers} = trade;
    let _collection = taker.side === 'bid'? pairBuy : pairSell;
    const docRef = doc(db, _collection, taker.orderId);
    const docTradeRef = doc(db, pairTrade, taker.orderId);
    let takerOrder = taker.side === 'bid' ? newbuyOrders.find(order => order.id === taker.orderId) : newSellOrders.find(order => order.id === taker.orderId);

    if(taker.sizeRemaining <= 0){ 
        // trade is complete so remove and add to users trades
        setDoc(docTradeRef, {takerOrder, filledAmount: takerOrder.amountA});
        deleteDoc(docRef);
    } else {
        let filledAmount = trade.takeSize;
        updateDoc(docRef, {filledAmount: filledAmount});
    }

    makers.forEach(maker => {
        let _collection = maker.side === 'bid'? pairBuy : pairSell;
        const docRef = doc(db, _collection, maker.orderId);
        const docTradeRef = doc(db, pairTrade, taker.orderId);
        let makerOrder = maker.side === 'bid' ? newbuyOrders.find(order => order.id === maker.orderId) : newSellOrders.find(order => order.id === maker.orderId);

        if(maker.sizeRemaining <= 0){
            // trade is complete so remove and add to users trades
            setDoc(docTradeRef, {...makerOrder, filledAmount: makerOrder.amountA});
            deleteDoc(docRef);
        } else {
            let filledAmount = maker.size - maker.sizeRemaining;
            updateDoc(docRef, {filledAmount: filledAmount});
        }
    })
    
}


function addOrders(orders) {
    orders.forEach((order, i) => {
        let { id, buySell, amountA:quantity, amountB:funds, orderType, price } = order;
        let newBookOrder;
        if(orderType === 'limit') {
            newBookOrder = new LimitOrder(id, side.get(buySell), price, quantity);
        } else {
            newBookOrder = new MarketOrder(id, side.get(buySell), quantity, funds);
        }
        let result = book.add(newBookOrder);
        if(result.makers.length > 0){
            processTrade(result);
            console.log('trade', result)
        }
    })
}

function removeOrders(cancelledOrders) {
    cancelledOrders.forEach((order, i) => {
        let { id, buySell, price } = order;
        book.remove(side.get(buySell), price, id);
    })
}

function checkSellOrdersUpdate(orders) {
    let newOrders = orders.filter((order, i) => {
        return !currentsellOrders.some((currentOrder, j) => currentOrder.id === order.id);
    })
    console.log('New Sell Orders', newOrders);
    newOrders.length > 0 && addOrders(newOrders);
}


function checkBuyOrdersUpdate(orders) {
    let newOrders = orders.filter((order, i) => {
        return !currentbuyOrders.some((currentOrder, j) => currentOrder.id === order.id);
    })
    console.log('New Buy Orders', newOrders);
    newOrders.length > 0 && addOrders(newOrders);
}

function checkBuyOrdersCancel(orders) {
    let cancelledOrders = currentbuyOrders.filter((currentOrder, i) => {
        return !orders.some((order, j) => order.id === currentOrder.id)
    })
    console.log('Cancelled Buy Orders', cancelledOrders);
    cancelledOrders.length > 0 && removeOrders(cancelledOrders);
}

function checkSellOrdersCancel(orders) {
    let cancelledOrders = currentsellOrders.filter((currentOrder, i) => {
        return !orders.some((order, j) => order.id === currentOrder.id)
    })
    console.log('Cancelled Sell Orders', cancelledOrders);
    cancelledOrders.length > 0 && removeOrders(cancelledOrders);
}

// check if it is a new order or an update or a removed order
// if it is a new order, add it to the book
// 




const sellOrdersSocket = () => {
    const q = query(collection(db, `AVAX-USDT-SELL`), where("pair", "==", "AVAX-USDT"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders = [];
      querySnapshot.forEach((doc) => {
          orders.push(doc.data());
      });
      let sortedOrders = orders.sort((a, b) => a.price - b.price);
      newSellOrders = sortedOrders;
      checkSellOrdersUpdate(sortedOrders);
      checkSellOrdersCancel(sortedOrders);
      currentsellOrders = sortedOrders;
    });
}

const buyOrdersSocket = () => {
    const q = query(collection(db, `AVAX-USDT-BUY`), where("pair", "==", "AVAX-USDT"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push(doc.data());
        });
        let sortedOrders = orders.sort((a, b) => b.price - a.price);
        newbuyOrders = sortedOrders;
        checkBuyOrdersUpdate(sortedOrders);
        checkBuyOrdersCancel(sortedOrders);
        currentbuyOrders = sortedOrders;
    });
}

buyOrdersSocket();

sellOrdersSocket();