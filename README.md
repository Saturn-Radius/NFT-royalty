# Test Assignement

1. the contract above only accepts erc20 (weth) at the moment
2. the task is to add functionality to support native payments (payable) as well
3. while keeping the same functionality of the contract above
4.
    a. the contract has two entities receiving royalties (claiming)
    b. the contract creator and the contract holders / nfts
    c. each nft gets a portions of the royalties (refelctions) 1/10000
    d. the creator gets 1 / (1 + 3) of the royalties (25%)
    e. the community gets 75%
5. the contract above will fail if it is the royalties address of a native payment transaction
6. add also tests to assure it is working as expected

# Reference Links

https://github.com/NFTrade/royalties/blob/main/contracts/Royalties.sol

https://github.com/NFTrade/royalties/blob/main/test/Royalties.js

# Test Environment

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
