//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Chassis is ERC721, ERC721Enumerable, Pausable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    uint256 constant MINT_PRICE = 1 ether; // The price per token
    uint256 constant TOTAL_SUPPLY = 10; // The total number of tokens allowed
    uint256 constant WALLET_LIMIT = 2; // The per-wallet limit

    constructor() ERC721("Chassis", "CHASSIS") {}

    function mint() public payable returns (uint256 tokenId) {
        // Minter must pay the mint price
        require(msg.value == MINT_PRICE, "Wrong payment amount");
        // The token must not be sold out
        require(totalSupply() < TOTAL_SUPPLY, "The token is sold out");
        // The minter's wallet must not exceed the per wallet limit
        require(balanceOf(msg.sender) < WALLET_LIMIT);
        // Then allow the mint
        _tokenIdCounter.increment();
        tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(amount <= address(this).balance, "Not enough balance");
        payable(owner()).transfer(amount);
    }

    function getBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Required override by ERC721Enumerable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // Required override by ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
