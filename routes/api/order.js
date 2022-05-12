const router = require("express").Router();
const ethers = require("ethers");
const verifyHash = require("../../utils/verifyHash");
const {sendOrder} = require("../../firebase");
const verifyBalanceOrModifyOrder = require("../../utils/verifyBalanceOrModifyOrder");

router.post("/create", async (req, res) => {
    const message = req.body.orderData;
    let hash = req.body.hash;
    

    let validity = verifyHash(message, hash);

    if(validity){
        // send order to firebase
        let order = await verifyBalanceOrModifyOrder(message);
        sendOrder(order);
    } else {
        res.status(400).json({error: "Invalid hash"});
    }


    // for provider
    // const provider = new ethers.providers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");

    // for signer
    // var privateKey = "<Provate key of account>"
    // var signer = new ethers.Wallet(privateKey, provider);
    res.json(req.body);
})

module.exports = router;