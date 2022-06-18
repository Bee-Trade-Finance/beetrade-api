const router = require("express").Router();
const { onSnapshot, query, collection, db, where, doc, updateDoc, deleteDoc, getDocs } = require("../../firebase");

const Pairs = require("../../constants/pairs");


router.get("/all", async (req, res) => {
    // total volume all time
    // total trades all time
    // total volume exchange 24hr
    // total trades 24hr
    
});

router.get("/token", async (req, res) => {
    let tokenSymbol = req.query.symbol;

    // fetch all available pairs trades for the token
    let tokenPairs = Pairs.filter(pair => pair.includes(tokenSymbol.toString()))
    let USDT_Trades = [];
    let returnData = {
        totalTrades: 0,
        totalAmountTraded: 0
    };

    for(pair of tokenPairs){
        const q = query(collection(db, `${pair}-TRADES`));
        let baseToken = pair.split('-')[0];
        let secondaryToken = pair.split('-')[1];
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            returnData.totalTrades += 1;

            let trade = doc.data();
            if(secondaryToken === 'USDT') USDT_Trades.push(trade);
            if(baseToken === tokenSymbol){
                returnData.totalAmountTraded += trade.amountA;
            } else {
                returnData.totalAmountTraded += trade.amountB;
            }
        });

    }
    
    let sortedOrders = USDT_Trades.sort((a,b)=> b.date-a.date);
    let currentPrice = sortedOrders[0]?.price? sortedOrders[0].price : 0;
    if(tokenSymbol === 'USDT') currentPrice = 1;
    
    returnData.price = currentPrice;
    returnData.volumeTradedUSD = returnData.totalAmountTraded*currentPrice;
    
    
    res.json(returnData)


});

router.get("/pair", async (req, res) => {
    let pair = req.query.pair;

    let returnData = {
        totalTrades: 0,
        totalAmountTraded: 0,
        high: 0,
        low: 0,
        price: 0,
        priceChange: 0
    }

    let limitDate = Date.now() - 86400000; // 24hrs in millisecs
    const q = query(collection(db, `${pair}-TRADES`), where("date", ">=", limitDate));
    let orders = [];
    const querySnapshot = await getDocs(q);
    
    let i = 0;
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        returnData.totalTrades += 1;

        let trade = doc.data();
        orders.push(trade);
        returnData.totalAmountTraded += trade.amountA;
        if(i===0) returnData.low = trade.price;
        if(trade.price < returnData.low) returnData.low = trade.price;
        if(trade.price > returnData.high) returnData.high = trade.price;
        i += 1;
    });
    let sortedOrders = orders.sort((a,b)=> b.date-a.date);
    let currentPrice = sortedOrders[0]?.price? sortedOrders[0].price : 0;
    let openingPrice = sortedOrders[sortedOrders.length-1]?.price? sortedOrders[sortedOrders.length-1].price : 0;

    let priceChange = ((currentPrice-openingPrice) / openingPrice) * 100;

    returnData.price = currentPrice;
    returnData.priceChange = priceChange;
    res.json(returnData);
})
module.exports = router;