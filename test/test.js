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
      nft.address,
      10000
    );
    await royalties.deployed();

    await nft.connect(owner).setRoyaltiesAddress(royalties.address);
  });

  describe('Royalties', () => {
    it('transfer royalties', async () => {
      const takerFee = BigNumber.from(100);
      // send royalties to contract
      await weth.transfer(royalties.address, takerFee);
      const creatorBalanceERC20 = await royalties.getCreatorBalanceERC20();
      expect(creatorBalanceERC20).to.be.equal(takerFee / 4);

      await owner.sendTransaction({to: royalties.address, value: ethers.utils.parseEther('0.1')});
      const creatorBalance = await royalties.getCreatorBalance();
      expect(creatorBalance).to.be.equal(BigNumber.from(10).pow(17).div(4));
    });

    it('creator claims', async () => {
      const creatorBalanceERC20 = await royalties.getCreatorBalanceERC20();
      const totalCollectedERC20 = await royalties.getTotalCollectedERC20();
      await royalties.connect(creator).claimCreator();
      const balanceERC20 = await weth.balanceOf(creator.address);

      const creatorBalance = await royalties.getCreatorBalance();
      const totalCollected = await royalties.getTotalCollected();
      await creator.sendTransaction({to: royalties.address, value: ethers.utils.parseEther('1')});
      const balance = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceERC20).to.be.equal(balanceERC20);
    });

    it('user claim', async () => {
      const totalTokenRoyaltiesERC20 = await royalties.getTokenTotalRoyaltiesERC20();
      const tokenBalanceERC20 = await royalties.getTokenBalanceERC20('1');
      expect(tokenBalanceERC20).to.be.equal(totalTokenRoyaltiesERC20);
      await royalties.connect(user).claimCommunity('1');
      const balanceERC20 = await weth.balanceOf(user.address);
      expect(balanceERC20).to.be.equal(tokenBalanceERC20);

      const totalTokenRoyalties = await royalties.getTokenTotalRoyalties();
      const tokenBalance = await royalties.getTokenBalance('1');
      await royalties.connect(user).claimCommunity('1');
      const balance = await weth.balanceOf(user.address);
    });

    it('transfer more royalties', async () => {
      const tokenBalanceERC20 = await royalties.getTokenBalanceERC20('1');
      expect(tokenBalanceERC20).to.be.equal(0);
      const takerFee = BigNumber.from(10).pow(18);
      // send royalties to contract
      await weth.transfer(royalties.address, takerFee);
      const tokenBalance1 = await royalties.getTokenBalanceERC20('1');
      const shouldHaveBalance = (takerFee * 0.75) / 1000; // already claimed once
      expect(tokenBalance1).to.be.equal(BigNumber.from(75).mul(BigNumber.from(10).pow(12)));
      const takerFee2 = BigNumber.from(10).pow(18);
      await weth.transfer(royalties.address, takerFee2);
      const tokenBalance2 = await royalties.getTokenBalanceERC20('2');
      expect(tokenBalance2).to.be.equal(BigNumber.from(75).mul(BigNumber.from(10).pow(12)).mul(2));
    });

    it('transfer nft is auto claiming', async () => {
      const takerFee = BigNumber.from(10).pow(18);
      // send royalties to contract
      await weth.transfer(royalties.address, takerFee);
      await weth.transfer(user.address, takerFee);
      const balanceBefore = await weth.balanceOf(user.address);
      const tokenBalance1Before = await royalties.getTokenBalanceERC20('1');
      await nft.connect(user).transferFrom(user.address, user2.address, 1);
      const tokenBalance1 = await royalties.getTokenBalanceERC20('1');
      expect(BigNumber.from(tokenBalance1)).to.be.equal(BigNumber.from(225).mul(BigNumber.from(10).pow(12)));

      const balanceAfter = await weth.balanceOf(user.address);

      // checking that the user actually for the auto claim tokens
      expect(balanceAfter.div(balanceBefore)).to.be.equal(1);
    });
  });
});