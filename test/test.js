const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require('ethers');

describe("Royalties", function () {
  let owner;
  let user;
  let user2;
  let creator;
  let weth;
  let royalties;
  let nft;

  before(async () => {
    [owner, user, user2, creator] = await ethers.getSigners();

    const WETH = await ethers.getContractFactory("WETH");
    const NFT = await ethers.getContractFactory("NFT");
    const Royalties = await ethers.getContractFactory("Royalties");

    weth = await WETH.deploy();
    await weth.deployed();

    nft = await NFT.deploy("Test NFT", "TNFT");
    await nft.deployed();

    await nft.connect(owner).mint(user.address, '');
    await nft.connect(owner).mint(user2.address, '');

    royalties = await Royalties.deploy(
      weth.address,
      creator.address,
      nft.address
    );
    await royalties.deployed();

    await nft.connect(owner).setRoyaltiesAddress(royalties.address);
  });

  describe('Royalties', () => {
    it('transfer royalties', async () => {
      const takerFee = BigNumber.from(100);
      // send royalties to contract
      await weth.transfer(royalties.address, takerFee);
      const creatorBalance = await royalties.getCreatorBalance('WETH');

      expect(creatorBalance).to.be.equal(takerFee / 4);
    });

    it('creator claims', async () => {
      const creatorBalance = await royalties.getCreatorBalance('WETH');
      const totalCollected = await royalties.getTotalCollected('WETH');
      await royalties.connect(creator).claimCreator('WETH');
      const balance = await weth.balanceOf(creator.address);

      expect(creatorBalance).to.be.equal(balance);
    });

    it('user claim', async () => {
      const totalTokenRoyalties = await royalties.getTokenTotalRoyalties('WETH');
      const tokenBalance = await royalties.getTokenBalance('1', 'WETH');
      expect(tokenBalance).to.be.equal(totalTokenRoyalties);
      const balance = await weth.balanceOf(user.address);
      expect(balance).to.be.equal(tokenBalance);
    });
  });
});