const ethers = require("ethers");
const { deleteOrder} = require("../firebase");
const OrderbookContractABI = require("../abis/BeeTradeOrderbook.json");

require("dotenv").config();

async function cancelOrder(order){
    // const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    // var privateKey = process.env.PRIVATE_KEY;
    // var signer = new ethers.Wallet(privateKey, provider);
    // // returns modified order or intact order
    // let OrderbookContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, OrderbookContractABI, signer);
    // later need to add some sort of verifications
    deleteOrder(order);
    
    
    
}

module.exports = cancelOrder;