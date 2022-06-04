const ethers = require("ethers");
const OrderbookContractABI = require("../abis/BeeTradeOrderbook.json");

require("dotenv").config();

async function executeTrade(trade){
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    var privateKey = process.env.PRIVATE_KEY;
    var signer = new ethers.Wallet(privateKey, provider);
    // returns modified order or intact order
    let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, signer);
    let result = await OrderbookContract.singleTrade(
        trade.makerAddress, 
        trade.takerAddress,
        trade.tokenGetAddress,
        trade.tokenGiveAddress,
        ethers.utils.parseEther(`${trade.amountGet}`).toString(),
        ethers.utils.parseEther(`${trade.amountGive}`).toString(),
        trade.makeOrderID,
        trade.takeOrderID,
        trade.pair,
        ethers.utils.parseEther(`${trade.price}`).toString()
    );
    const receipt = await result.wait(result);

    return receipt;
    
    
}

module.exports = executeTrade;