const ethers = require("ethers");
const {getTokenBySymbol} = require("../constants/tokenList");
const OrderbookContractABI = require("../abis/BeeTradeOrderbook.json");

require("dotenv").config();

async function verifyBalanceOrModifyOrder(order){
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    // returns modified order or intact order
    const [pair1, pair2] = order.pair.split("-");
    if(order.buySell === "buy"){
        let pair2Address = getTokenBySymbol(pair2).address;
        let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, provider);
        let balance = await OrderbookContract.tokensBalances(pair2Address, order.account);
        let userBalance = ethers.utils.formatEther(balance);
        console.log(userBalance)
        return order;
    }
    
}

module.exports = verifyBalanceOrModifyOrder;