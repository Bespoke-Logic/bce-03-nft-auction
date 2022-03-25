const { expect } = require("chai");
const { ethers } = require("hardhat");

const nftContract = "0xfD12ec7ea4B381a79C78FE8b2248b4c559011ffb";
const nftId = 1;
const duration = 60;
const startingPrice = 5;

describe("Auction", function () {
  // Before the tests run, deploy the nft and mint a couple.
  let nftContractAddress, chassis;
  // Vars to hold some auctions
  let auction1, auction2, auction3, auction4;
  before(async () => {
    const accounts = await hre.ethers.getSigners();
    // Deploy a simple NFT contract
    const ChassisNFT = await ethers.getContractFactory("Chassis");
    chassis = await ChassisNFT.deploy();
    await chassis.deployed();
    nftContractAddress = chassis.address;
    // Account 1 mint an nft
    await chassis
      .connect(accounts[1])
      .mint({ value: ethers.utils.parseEther("1") });
    // Account 2 mint an nft
    await chassis
      .connect(accounts[2])
      .mint({ value: ethers.utils.parseEther("1") });
    // Account 3 mint an nft
    await chassis
      .connect(accounts[3])
      .mint({ value: ethers.utils.parseEther("1") });
    // Account 4 mint an nft
    await chassis
      .connect(accounts[4])
      .mint({ value: ethers.utils.parseEther("1") });
    console.log(
      accounts[0].address,
      accounts[1].address,
      accounts[2].address,
      accounts[3].address,
      accounts[4].address
    );
  });

  it("should deploy and set state variables", async function () {
    const accounts = await hre.ethers.getSigners();
    const Auction = await ethers.getContractFactory("Auction");
    auction1 = await Auction.connect(accounts[1]).deploy(
      nftContractAddress,
      1,
      duration,
      startingPrice
    );
    await auction1.deployed();
    expect(await auction1.token()).to.equal(nftContractAddress);
    expect(await auction1.tokenId()).to.equal(1);
    expect(await auction1.auctionDuration()).to.equal(duration);
    expect(await auction1.highestBid()).to.equal(startingPrice);
    expect(await auction1.highestBidder()).to.equal(
      ethers.constants.AddressZero
    );
    expect(await auction1.auctionStarted()).to.equal(false);
    expect(await auction1.auctionEnded()).to.equal(false);
  });

  it("Should throw an error if the contract is not authorized", async () => {
    // Start the auction without authorizing
    await expect(auction1.startAuction()).to.be.reverted;
    expect(await auction1.auctionStarted()).to.equal(false);
  });

  it("Should start the auction if the token has been authorized", async () => {
    const accounts = await hre.ethers.getSigners();
    // Authorize the contract
    expect(await chassis.balanceOf(accounts[1].address)).to.equal(1);
    expect(await chassis.ownerOf(1)).to.equal(accounts[1].address);
    await chassis.connect(accounts[1]).approve(auction1.address, 1);
    // Start the auction
    expect(await auction1.auctionStarted()).to.equal(false);
    await expect(auction1.connect(accounts[1]).startAuction()).to.emit(
      auction1,
      "AuctionStarted"
    );
    expect(await auction1.auctionStarted()).to.equal(true);
  });

  it("Should have transferred ownership of the NFT to the auction contract", async () => {
    const accounts = await hre.ethers.getSigners();
    expect(await chassis.ownerOf(1)).to.equal(auction1.address);
    expect(await chassis.balanceOf(auction1.address)).to.equal(1);
    expect(await chassis.balanceOf(accounts[1].address)).to.equal(0);
  });

  it("Should allow a bid and update highestBid and highestBidder", async () => {
    const accounts = await hre.ethers.getSigners();
    const bidder = accounts[2];
    // User bids
    await expect(
      auction1.connect(bidder).bid({ value: ethers.utils.parseEther("0.5") })
    )
      .to.emit(auction1, "Bid")
      .withArgs(bidder.address, ethers.utils.parseEther("0.5"));
    // There should be new high bid
    expect(await auction1.highestBid()).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await auction1.highestBidder()).to.equal(bidder.address);
  });

  it("Should reject a bid under the highestBid", async () => {
    const accounts = await hre.ethers.getSigners();
    const bidder = accounts[3];
    // User bids
    await expect(
      auction1.connect(bidder).bid({ value: ethers.utils.parseEther("0.2") })
    ).to.be.revertedWith("Bid is too low");
    // There should NOT be new high bid or high bidder
    expect(await auction1.highestBid()).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await auction1.highestBidder()).to.equal(accounts[2].address);
  });

  it("Should reject a bid equal to the highestBid", async () => {
    const accounts = await hre.ethers.getSigners();
    const bidder = accounts[3];
    // User bids
    await expect(
      auction1.connect(bidder).bid({ value: ethers.utils.parseEther("0.5") })
    ).to.be.revertedWith("Bid is too low");
    // There should NOT be new high bid or high bidder
    expect(await auction1.highestBid()).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await auction1.highestBidder()).to.equal(accounts[2].address);
  });

  // New bidder successful
  it("Should allow another bid and update highestBid and highestBidder", async () => {
    const accounts = await hre.ethers.getSigners();
    const bidder = accounts[3];
    // User bids
    await expect(
      auction1.connect(bidder).bid({ value: ethers.utils.parseEther("1.5") })
    )
      .to.emit(auction1, "Bid")
      .withArgs(bidder.address, ethers.utils.parseEther("1.5"));
    // There should be new high bid
    expect(await auction1.highestBid()).to.equal(
      ethers.utils.parseEther("1.5")
    );
    expect(await auction1.highestBidder()).to.equal(bidder.address);
  });

  // Original bidder bids again.
  it("Should allow another bid and update highestBid and highestBidder", async () => {
    const accounts = await hre.ethers.getSigners();
    const bidder = accounts[2];
    // User bids
    await expect(
      auction1.connect(bidder).bid({ value: ethers.utils.parseEther("2") })
    )
      .to.emit(auction1, "Bid")
      .withArgs(bidder.address, ethers.utils.parseEther("2"));
    // There should be new high bid
    expect(await auction1.highestBid()).to.equal(ethers.utils.parseEther("2"));
    expect(await auction1.highestBidder()).to.equal(bidder.address);
  });

  // Losing bidder can withdraw their bid amount
  it("Should allow a losing bidder to withdraw their bid eth", async () => {
    const accounts = await hre.ethers.getSigners();
    const losingBidder = accounts[3];
    expect(
      await auction1.connect(losingBidder).withdraw()
    ).to.changeEtherBalance(accounts[3], ethers.utils.parseEther("1.5"));
  });

  //
  it("Should not allow the auction to be ended before the duration is up", async () => {
    const accounts = await hre.ethers.getSigners("Auction has not reached end");
    await expect(auction1.endAuction()).to.be.revertedWith;
  });
});
