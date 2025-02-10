// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ArtGallery
 * @dev NFT Art Gallery platform with gallery management, trading, and social features
 */
contract ArtGallery is ERC721URIStorage, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    Counters.Counter private _galleryIds;
    uint256 public platformFee = 25; // 2.5% fee in basis points
    
    struct Artwork {
        string title;
        address artist;
        uint256 price;
        bool forSale;
        uint256 totalRatings;
        uint256 ratingSum;
        string galleryId;
        uint256 royaltyPercentage;
        uint256 createdAt;
    }
    
    struct Gallery {
        string name;
        address curator;
        uint256[] artworkIds;
        bool isActive;
        string description;
        uint256 createdAt;
    }
    
    struct Review {
        address reviewer;
        string comment;
        uint256 rating;
        uint256 timestamp;
    }
    
    mapping(uint256 => Artwork) public artworks;
    mapping(string => Gallery) public galleries;
    mapping(uint256 => Review[]) public reviews;
    mapping(uint256 => mapping(address => bool)) public hasRated;
    mapping(address => uint256[]) public userArtworks;
    mapping(address => string[]) public userGalleries;
    
    event ArtworkCreated(uint256 indexed tokenId, string title, address indexed artist, uint256 price);
    event ArtworkSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event ReviewAdded(uint256 indexed tokenId, address indexed reviewer, string comment, uint256 rating);
    event GalleryCreated(string indexed galleryId, string name, address indexed curator);
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);
    event RoyaltyPaid(uint256 indexed tokenId, address indexed artist, uint256 amount);
    
    constructor() ERC721("NFT Art Gallery", "NAG") Ownable() {}
    
    /**
     * @dev Creates a new artwork NFT
     */
    function createArtwork(
        string memory title,
        string memory tokenURI,
        uint256 price,
        string memory galleryId,
        uint256 royaltyPercentage
    ) public nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(price > 0, "Price must be greater than 0");
        require(galleries[galleryId].isActive, "Gallery does not exist");
        require(royaltyPercentage <= 100, "Royalty percentage cannot exceed 100");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        artworks[newTokenId] = Artwork({
            title: title,
            artist: msg.sender,
            price: price,
            forSale: true,
            totalRatings: 0,
            ratingSum: 0,
            galleryId: galleryId,
            royaltyPercentage: royaltyPercentage,
            createdAt: block.timestamp
        });
        
        galleries[galleryId].artworkIds.push(newTokenId);
        userArtworks[msg.sender].push(newTokenId);
        
        emit ArtworkCreated(newTokenId, title, msg.sender, price);
        return newTokenId;
    }
    
    /**
     * @dev Purchases an artwork and handles royalty payments
     */
    function purchaseArtwork(uint256 tokenId) public payable nonReentrant {
        require(_exists(tokenId), "Artwork does not exist");
        Artwork storage artwork = artworks[tokenId];
        require(artwork.forSale, "Artwork is not for sale");
        require(msg.value >= artwork.price, "Insufficient payment");
        
        address seller = ownerOf(tokenId);
        
        uint256 platformFeeAmount = (msg.value * platformFee) / 1000;
        
        uint256 royaltyAmount = 0;
        if (seller != artwork.artist) {
            royaltyAmount = (msg.value * artwork.royaltyPercentage) / 100;
            payable(artwork.artist).transfer(royaltyAmount);
            emit RoyaltyPaid(tokenId, artwork.artist, royaltyAmount);
        }
        
        _transfer(seller, msg.sender, tokenId);
        
        payable(owner()).transfer(platformFeeAmount);
        payable(seller).transfer(msg.value - platformFeeAmount - royaltyAmount);
        
        artwork.forSale = false;
        
        emit ArtworkSold(tokenId, seller, msg.sender, msg.value);
    }
    
    /**
     * @dev Creates a new virtual gallery
     */
    function createGallery(
        string memory galleryId,
        string memory name,
        string memory description
    ) public {
        require(bytes(galleryId).length > 0, "Gallery ID cannot be empty");
        require(bytes(name).length > 0, "Gallery name cannot be empty");
        require(!galleries[galleryId].isActive, "Gallery ID already exists");
        
        galleries[galleryId] = Gallery({
            name: name,
            curator: msg.sender,
            artworkIds: new uint256[](0),
            isActive: true,
            description: description,
            createdAt: block.timestamp
        });
        
        userGalleries[msg.sender].push(galleryId);
        
        emit GalleryCreated(galleryId, name, msg.sender);
    }
    
    /**
     * @dev Adds a review with rating to an artwork
     */
    function addReview(uint256 tokenId, string memory comment, uint256 rating) public {
        require(_exists(tokenId), "Artwork does not exist");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!hasRated[tokenId][msg.sender], "User has already rated this artwork");
        
        reviews[tokenId].push(Review({
            reviewer: msg.sender,
            comment: comment,
            rating: rating,
            timestamp: block.timestamp
        }));
        
        Artwork storage artwork = artworks[tokenId];
        artwork.totalRatings++;
        artwork.ratingSum += rating;
        hasRated[tokenId][msg.sender] = true;
        
        emit ReviewAdded(tokenId, msg.sender, comment, rating);
    }
    
    function getArtwork(uint256 tokenId) public view returns (
        string memory title,
        address artist,
        uint256 price,
        bool forSale,
        uint256 avgRating,
        string memory galleryId,
        uint256 royaltyPercentage
    ) {
        require(_exists(tokenId), "Artwork does not exist");
        Artwork storage artwork = artworks[tokenId];
        
        return (
            artwork.title,
            artwork.artist,
            artwork.price,
            artwork.forSale,
            artwork.totalRatings > 0 ? artwork.ratingSum / artwork.totalRatings : 0,
            artwork.galleryId,
            artwork.royaltyPercentage
        );
    }
    
    function getGalleryArtworks(string memory galleryId) public view returns (uint256[] memory) {
        require(galleries[galleryId].isActive, "Gallery does not exist");
        return galleries[galleryId].artworkIds;
    }
    
    function getUserArtworks(address user) public view returns (uint256[] memory) {
        return userArtworks[user];
    }
    
    function getUserGalleries(address user) public view returns (string[] memory) {
        return userGalleries[user];
    }
    
    function updatePlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 100, "Fee cannot exceed 10%");
        platformFee = newFee;
    }
}