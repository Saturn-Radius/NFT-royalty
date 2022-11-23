/**
* @type import('hardhat/config').HardhatUserConfig
*/
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
const { PRIVATE_KEY } = process.env;
module.exports = {
   defaultNetwork: "hardhat",
   networks: {
      hardhat: {},
      goerli: {
         url: "https://goerli.infura.io/v3/e254d35aa64b4c16816163824d9d5b83",
         accounts: [`0x${PRIVATE_KEY}`]
      }
   },
   etherscan: {
      apiKey: "S1VH5HN4RW22314GI9APVKVFIJ36IH5SXV" //Input your Etherscan API key
   },
   solidity: {
      version: "0.8.4",
      settings: {
         optimizer: {
            enabled: true
         }
      }
   }
}