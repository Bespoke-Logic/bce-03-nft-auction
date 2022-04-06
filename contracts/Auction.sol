//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "hardhat/console.sol";

contract Auction is ERC721Holder {
    // The contract for the NFT being sold
    IERC721 public immutable token;
    // The tokenId of the specific NFT being sold;
    uint256 public immutable tokenId;
    // The seller
    address public immutable seller;
    // When the auction ends
    uint256 public immutable auctionDuration;
    uint256 public auctionEnd;
    // The state of the auction
    bool public auctionStarted;
    bool public auctionEnded;
    // The bids
    mapping(address => uint256) public bids;
    uint256 public highestBid;
    address public highestBidder;
    // Events
    event AuctionStarted();
    event Bid(address indexed bidder, uint256 bid);
    event Withdraw(address bidder, uint256 bid);
    event AuctionEnded(address winner, uint256 winningBid);

    constructor(
        IERC721 _token,
        uint256 _tokenId,
        uint256 _duration,
        uint256 _startingPrice
    ) {
        // Confirm that the wallet that's deploying the auction
        //  owns the token being auctioned.
        require(
            IERC721(_token).ownerOf(_tokenId) == msg.sender,
            "You do not own this token"
        );
        token = IERC721(_token);
        tokenId = _tokenId;
        // Make the seller payable so we can transfer the sales proceeds
        //  to them when auction ends
        seller = payable(msg.sender);
        // Duration will be in seconds
        auctionDuration = _duration;
        highestBid = _startingPrice;
    }

    // Starts the auction
    function startAuction() external {
        require(!auctionStarted, "Auction has already been started");
        require(!auctionEnded, "Auction has already ended");
        // Set the auction to started
        auctionStarted = true;
        // Set then auction ending timestamp
        //  reminder: Solidity timestamps are in seconds
        //  passed in duration is also in seconds
        auctionEnd = uint256(block.timestamp + auctionDuration);
        // Emit the auctionStarted event
        emit AuctionStarted();
        // Transfer the NFT from the seller to the contract
        token.safeTransferFrom(seller, address(this), tokenId);
    }

    // Allows bids
    function bid() external payable {
        require(auctionStarted, "Auction has not started yet");
        require(block.timestamp < auctionEnd, "Auction has already ended");
        require(msg.value > highestBid, "Bid is too low");
        // Add the previous bidder's bid to their total amount of bids
        //  If this is the first bid, highestBidder will be the null address
        //  and we don't want to do this
        if (highestBidder != address(0)) {
            bids[highestBidder] += highestBid;
        }
        // Set this new bid/bidder as the highest
        highestBidder = msg.sender;
        highestBid = msg.value;
        emit Bid(msg.sender, msg.value);
    }

    // Losing bidders can withdraw their bid tokens
    function withdraw() external {
        require(bids[msg.sender] > 0, "Nothing to withdraw");
        // Copy the total amounts of previous bids by this wallet and
        //  reset value to 0 to prevent reenterancy attacks
        uint256 totalBids = bids[msg.sender];
        bids[msg.sender] = 0;
        emit Withdraw(msg.sender, totalBids);
        // Transfer the amount to the wallet
        (bool success, ) = payable(msg.sender).call{value: totalBids}("");
        require(success, "Refund not successful");
    }

    // End the auction and transfer results
    function endAuction() external {
        require(auctionStarted, "Auction has not started yet");
        require(!auctionEnded, "Auction has already ended");
        require(block.timestamp > auctionEnd, "Auction has not reached end");
        // End the auction
        auctionEnded = true;
        emit AuctionEnded(highestBidder, highestBid);
        // If the highest bidder is the null address, nobody bid.
        if (highestBidder == address(0)) {
            //  So, transfer the NFT back to the seller
            token.safeTransferFrom(address(this), seller, tokenId);
        } else {
            // Transfer the NFT to the highest bidder
            token.safeTransferFrom(address(this), highestBidder, tokenId);
            // Transfer the highest bid amount to the seller
            (bool success, ) = seller.call{value: highestBid}("");
            require(success, "Payment transfer failed");
        }
    }
}
