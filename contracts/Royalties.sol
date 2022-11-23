// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address account, uint256 amount) external;
}

interface ERC721 {
    function ownerOf(uint256 tokenId) external returns (address);
}


/// @title Royalties for Non-Fungible Tokens
/// @dev Contract for the split between community royalties and dev royalties
///
contract Royalties is Ownable {
    uint256 public creatorRoyalties = 1; // percentage from total NFT price
    uint256 public communityRoyalties = 3; // percentage from total NFT price

    uint256 public collectionSize = 10000;

    address public tokenFeesAddress; // WAVAX / WBNB / WETH / WMATIC
    address public creatorAddress; // the creator address
    address public collectionAddress; // the collection address

    string public constant PAYMENT_WITH_WETH = "WETH";
    string public constant PAYMENT_WITH_ETH = "ETH";

    mapping(bytes32 => uint256) private communityClaimed;
    mapping(bytes32 => uint256) private creatorClaimed;

    mapping(uint256 => mapping(bytes32 => uint256)) private communityClaims;
    mapping(address => mapping(bytes32 => uint256)) private addressClaims;

    event CommunityClaimed(address owner, uint256 amount, uint256 tokenID);
    event CreatorClaimed(uint256 amount);
    event RoyaltiesCreated(address collectionAddress);

    constructor(
        address _tokenFeesAddress,
        address _creatorAddress,
        address _collectionAddress
    ) {
        tokenFeesAddress = _tokenFeesAddress;
        creatorAddress = _creatorAddress;
        collectionAddress = _collectionAddress;
        emit RoyaltiesCreated(collectionAddress);
    }

    function receive () external payable {}

    /// @dev set royalties address (weth)
    function setTokenFeesAddress(address _tokenFeesAddress) external onlyOwner {
        tokenFeesAddress = _tokenFeesAddress;
    }

    /// @dev set creator address, can be another contract
    function setCreatorAddress(address _creatorAddress) external onlyOwner {
        creatorAddress = _creatorAddress;
    }

    /// @dev set only smaller collection size, can't increase size
    function setCollectionSize(uint256 _collectionSize) external onlyOwner {
        require(_collectionSize < collectionSize, 'Cannot increase collection size');
        collectionSize = _collectionSize;
    }

    /// @dev set creator royalties
    function setCreatorRoyalties(uint256 _creatorRoyalties) external onlyOwner {
        creatorRoyalties = _creatorRoyalties;
    }

    /// @dev set creator royalties
    function setCommunityRoyalties(uint256 _communityRoyalties) external onlyOwner {
        communityRoyalties = _communityRoyalties;
    }

    /// @dev get total royalties
    /// @return total royalties
    function getTotalRoyalties() public view returns (uint256) {
        return creatorRoyalties + communityRoyalties;
    }

    /// @dev get royalties split
    /// @return creator roylaties
    /// @return community royalties
    function getRoyalties() public view returns (uint256, uint256) {
        return (creatorRoyalties, communityRoyalties);
    }

    /// @dev get total collected
    /// @return total collected
    function getTotalCollected(string memory _type) public view returns (uint256) {
        uint256 balance;
        if (keccak256(abi.encodePacked((_type))) == keccak256(abi.encodePacked((PAYMENT_WITH_WETH)))) {
            balance = ERC20(tokenFeesAddress).balanceOf(address(this));
        } else if (keccak256(abi.encodePacked((_type))) == keccak256(abi.encodePacked((PAYMENT_WITH_ETH)))) {
            balance = address(this).balance;
        }
        balance = balance + creatorClaimed[keccak256(abi.encodePacked((_type)))] + communityClaimed[keccak256(abi.encodePacked((_type)))];
        return balance;
    }

    /// @dev get creator balance
    /// @return creator total balance
    function getCreatorBalance(string memory _type) public view returns (uint256) {
        uint256 _creatorRoyalties = (creatorRoyalties * 100) / getTotalRoyalties();
        return (getTotalCollected(_type) * _creatorRoyalties) / 100 - creatorClaimed[keccak256(abi.encodePacked((_type)))];
    }

    /// @dev get single token total royalties
    /// @return single token royalties
    function getTokenTotalRoyalties(string memory _type) public view returns (uint256) {
        uint256 _communityRoyalties = (communityRoyalties * 100) / getTotalRoyalties();
        return ((getTotalCollected(_type) * _communityRoyalties) / 100) / collectionSize;
    }

    /// @dev get single token balance
    /// @return single token balance
    function getTokenBalance(uint256 tokenID, string memory _type) public view returns (uint256) {
        return getTokenTotalRoyalties(_type) - communityClaims[tokenID][keccak256(abi.encodePacked((_type)))];
    }

    /// @dev get token balances for each token from an array of tokenIDs
    function getTokensBalance(uint256[] memory tokenIDs, string memory _type) public view returns (uint256) {
        uint256 totalBalance = 0;
        for (uint256 i = 0; i<tokenIDs.length; i++) {
            uint256 balance = getTokenBalance(tokenIDs[i], _type);
            totalBalance = (totalBalance + balance);
        }
        return totalBalance;
    }

    /// @dev get address tot claims
    /// @return address total claims
    function getAddressClaims(address account, bytes32 _type) public view returns (uint256) {
        return addressClaims[account][_type];
    }

    /// @dev claim community royalties per token id
    function claimCommunity(uint256 tokenID, string memory _type) public {
        uint256 balance = getTokenBalance(tokenID, _type);
        address owner = ERC721(collectionAddress).ownerOf(tokenID);
        require(balance > 0, "Balance must be greater than 0");
        require(owner != address(0), "Owner is dead address");

        if (keccak256(abi.encodePacked((_type))) == keccak256(abi.encodePacked((PAYMENT_WITH_WETH)))) {
            ERC20(tokenFeesAddress).transfer(owner, balance);
        } else {
            payable(owner).transfer(balance);
        }
        communityClaims[tokenID][keccak256(abi.encodePacked((_type)))] = communityClaims[tokenID][keccak256(abi.encodePacked((_type)))] + balance;
        addressClaims[owner][keccak256(abi.encodePacked((_type)))] = addressClaims[owner][keccak256(abi.encodePacked((_type)))] + balance;
        communityClaimed[keccak256(abi.encodePacked((_type)))] = communityClaimed[keccak256(abi.encodePacked((_type)))] + balance;
        emit CommunityClaimed(owner, balance, tokenID);
    }

    /// @dev claim community from an array of tokenIDs
    function claimCommunityBatch(uint256[] calldata tokenIDs, string memory _type) external {
        for (uint256 i=0; i<tokenIDs.length; i++) {
            claimCommunity(tokenIDs[i], _type);
        }
    }

    /// @dev claim creator royalties
    function claimCreator(string memory _type) external {
        require(msg.sender == creatorAddress, "Only creator can claim");
        uint256 balance = getCreatorBalance(_type);
        require(balance > 0, "No balance to claim");
        if (keccak256(abi.encodePacked((_type))) == keccak256(abi.encodePacked((PAYMENT_WITH_WETH)))) {
            ERC20(tokenFeesAddress).transfer(creatorAddress, balance);
        } else {
            payable(creatorAddress).transfer(balance);
        }
        creatorClaimed[keccak256(abi.encodePacked((_type)))] = creatorClaimed[keccak256(abi.encodePacked((_type)))] + balance;
        emit CreatorClaimed(balance);
    }
}