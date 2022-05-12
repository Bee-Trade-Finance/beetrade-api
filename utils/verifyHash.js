const ethers = require("ethers");

module.exports = function verifyHash(message, hash){
    const signerAddress = ethers.utils.verifyMessage(JSON.stringify(message), hash);
    return (signerAddress === message.account);
}