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
let pair = "BTF-USDT";
let pairBuy = "BTF-USDT-BUY";
let pairSell = "BTF-USDT-SELL";
let pairTrade = "BTF-USDT-TRADES"
let BTF = "0x108aAd0Fac57435Ed4bd2AAFBBF1808BAd586589";
let USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";

function processTrade(trade){
    const {taker, makers} = trade;
    // process trade
    // update firebase
    // makerAddress, takerAddress, tokenGetAddress, tokenGiveAddress, amountGet, amountGive, makeOrderID, takeOrderID, pair, price
    let takerOrder = taker.side === 'bid' ? newbuyOrders.find(order => order.id === taker.orderId) : newSellOrders.find(order => order.id === taker.orderId);
    let takerAddress =  takerOrder.account;
    
    let tokenGetAddress = taker.side === 'bid' ? USDT : BTF;
    let tokenGiveAddress = taker.side === 'bid' ? BTF : USDT;

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
        updateFirebaseTrade(trade);
        executeTrade(obj).then(execution => {
            console.log('execution', execution)
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
    let averagePrice = 0;
    makers.forEach(maker => averagePrice+=maker.price);
    averagePrice = averagePrice/makers.length;
    if(taker.sizeRemaining <= 0){ 
        // trade is complete so remove and add to users trades
        setDoc(docTradeRef, {...takerOrder, filledAmount: takerOrder.amountA, price: averagePrice, date: Date.now()});
        deleteDoc(docRef);
    } else {
        let filledAmount = trade.takeSize;
        updateDoc(docRef, {filledAmount: filledAmount});
    }

    makers.forEach(maker => {
        let _collection = maker.side === 'bid'? pairBuy : pairSell;
        const docRef = doc(db, _collection, maker.orderId);
        const docTradeRef = doc(db, pairTrade, maker.orderId);
        let makerOrder = maker.side === 'bid' ? newbuyOrders.find(order => order.id === maker.orderId) : newSellOrders.find(order => order.id === maker.orderId);

        if(maker.sizeRemaining <= 0){
            // trade is complete so remove and add to users trades
            setDoc(docTradeRef, {...makerOrder, filledAmount: makerOrder.amountA, date: Date.now()});
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
            newBookOrder = new MarketOrder(id, side.get(buySell), quantity, 50000);
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
    const q = query(collection(db, `BTF-USDT-SELL`), where("pair", "==", "BTF-USDT"));
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
    const q = query(collection(db, `BTF-USDT-BUY`), where("pair", "==", "BTF-USDT"));
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

sellOrdersSocket();
buyOrdersSocket();
