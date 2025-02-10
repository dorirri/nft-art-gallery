const ArtGallery = artifacts.require("ArtGallery");
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("ArtGallery", function (accounts) {
  const [owner, artist1, artist2, buyer1, buyer2] = accounts;
  const TOKEN_URI = "ipfs://QmTest";
  const GALLERY_ID = "test-gallery";
  const ARTWORK_PRICE = web3.utils.toWei("1", "ether");
  
  let artGallery;

  beforeEach(async function () {
    artGallery = await ArtGallery.new({ from: owner });
    
    await artGallery.createGallery(
      GALLERY_ID,
      "Test Gallery",
      "A gallery for testing",
      { from: owner }
    );
  });

  describe("Gallery Management", function () {
    it("should create a new gallery", async function () {
      const newGalleryId = "new-gallery";
      const result = await artGallery.createGallery(
        newGalleryId,
        "New Gallery",
        "Description",
        { from: artist1 }
      );

      expectEvent(result, 'GalleryCreated', {
        galleryId: newGalleryId,
        curator: artist1
      });

      const gallery = await artGallery.galleries(newGalleryId);
      expect(gallery.isActive).to.be.true;
      expect(gallery.curator).to.equal(artist1);
    });

    it("should not create gallery with duplicate ID", async function () {
      await expectRevert(
        artGallery.createGallery(GALLERY_ID, "Duplicate", "Test", { from: artist1 }),
        "Gallery ID already exists"
      );
    });
  });

  describe("Artwork Creation", function () {
    it("should create new artwork", async function () {
      const result = await artGallery.createArtwork(
        "Test Art",
        TOKEN_URI,
        ARTWORK_PRICE,
        GALLERY_ID,
        10,
        { from: artist1 }
      );

      expectEvent(result, 'ArtworkCreated', {
        artist: artist1
      });

      const tokenId = result.logs[0].args.tokenId;
      const artwork = await artGallery.artworks(tokenId);
      
      expect(artwork.title).to.equal("Test Art");
      expect(artwork.artist).to.equal(artist1);
      expect(artwork.price.toString()).to.equal(ARTWORK_PRICE);
      expect(artwork.forSale).to.be.true;
    });

    it("should not create artwork with invalid price", async function () {
      await expectRevert(
        artGallery.createArtwork("Test", TOKEN_URI, 0, GALLERY_ID, 10, { from: artist1 }),
        "Price must be greater than 0"
      );
    });
  });

  describe("Artwork Trading", function () {
    let tokenId;

    beforeEach(async function () {
      const result = await artGallery.createArtwork(
        "Test Art",
        TOKEN_URI,
        ARTWORK_PRICE,
        GALLERY_ID,
        10,
        { from: artist1 }
      );
      tokenId = result.logs[0].args.tokenId;
    });

    it("should purchase artwork", async function () {
      const result = await artGallery.purchaseArtwork(tokenId, {
        from: buyer1,
        value: ARTWORK_PRICE
      });

      expectEvent(result, 'ArtworkSold', {
        tokenId: tokenId,
        from: artist1,
        to: buyer1
      });

      const newOwner = await artGallery.ownerOf(tokenId);
      expect(newOwner).to.equal(buyer1);
    });

    it("should not purchase artwork with insufficient funds", async function () {
      const lowPrice = web3.utils.toWei("0.5", "ether");
      
      await expectRevert(
        artGallery.purchaseArtwork(tokenId, {
          from: buyer1,
          value: lowPrice
        }),
        "Insufficient payment"
      );
    });

    it("should handle royalties correctly on secondary sale", async function () {
      // First sale
      await artGallery.purchaseArtwork(tokenId, {
        from: buyer1,
        value: ARTWORK_PRICE
      });

      // Put artwork for resale
      await artGallery.updateArtworkPrice(tokenId, ARTWORK_PRICE, {
        from: buyer1
      });

      // Track balances for royalty calculation
      const artistBalanceBefore = new BN(await web3.eth.getBalance(artist1));
      
      // Secondary sale
      const result = await artGallery.purchaseArtwork(tokenId, {
        from: buyer2,
        value: ARTWORK_PRICE
      });

      // Check royalty event
      expectEvent(result, 'RoyaltyPaid', {
        tokenId: tokenId,
        artist: artist1
      });

      // Verify artist received royalty
      const artistBalanceAfter = new BN(await web3.eth.getBalance(artist1));
      const royaltyAmount = new BN(ARTWORK_PRICE).mul(new BN(10)).div(new BN(100));
      expect(artistBalanceAfter.sub(artistBalanceBefore)).to.be.bignumber.equal(royaltyAmount);
    });
  });

  describe("Reviews and Ratings", function () {
    let tokenId;

    beforeEach(async function () {
      const result = await artGallery.createArtwork(
        "Test Art",
        TOKEN_URI,
        ARTWORK_PRICE,
        GALLERY_ID,
        10,
        { from: artist1 }
      );
      tokenId = result.logs[0].args.tokenId;
    });

    it("should add review and rating", async function () {
      const result = await artGallery.addReview(tokenId, "Great artwork!", 5, {
        from: buyer1
      });

      expectEvent(result, 'ReviewAdded', {
        tokenId: tokenId,
        reviewer: buyer1,
        comment: "Great artwork!",
        rating: new BN(5)
      });

      const artwork = await artGallery.artworks(tokenId);
      expect(artwork.totalRatings.toString()).to.equal('1');
      expect(artwork.ratingSum.toString()).to.equal('5');
    });

    it("should not allow duplicate ratings", async function () {
      await artGallery.addReview(tokenId, "First review", 4, { from: buyer1 });
      
      await expectRevert(
        artGallery.addReview(tokenId, "Second review", 5, { from: buyer1 }),
        "User has already rated this artwork"
      );
    });

    it("should calculate average rating correctly", async function () {
      await artGallery.addReview(tokenId, "Review 1", 4, { from: buyer1 });
      await artGallery.addReview(tokenId, "Review 2", 2, { from: buyer2 });

      const [,,,,avgRating,] = await artGallery.getArtwork(tokenId);
      expect(avgRating.toString()).to.equal('3');
    });
  });

  describe("Platform Fees", function () {
    it("should update platform fee", async function () {
      const newFee = 30; // 3%
      await artGallery.updatePlatformFee(newFee, { from: owner });
      
      const fee = await artGallery.platformFee();
      expect(fee.toString()).to.equal(newFee.toString());
    });

    it("should not allow non-owner to update fee", async function () {
      await expectRevert(
        artGallery.updatePlatformFee(30, { from: artist1 }),
        "Ownable: caller is not the owner"
      );
    });

    it("should not allow fee greater than 10%", async function () {
      await expectRevert(
        artGallery.updatePlatformFee(101, { from: owner }),
        "Fee cannot exceed 10%"
      );
    });
  });

  describe("Getter Functions", function () {
    let tokenId;

    beforeEach(async function () {
      const result = await artGallery.createArtwork(
        "Test Art",
        TOKEN_URI,
        ARTWORK_PRICE,
        GALLERY_ID,
        10,
        { from: artist1 }
      );
      tokenId = result.logs[0].args.tokenId;
    });

    it("should get artwork details", async function () {
      const [title, artist, price, forSale, avgRating, galleryId, royaltyPercentage] = 
        await artGallery.getArtwork(tokenId);

      expect(title).to.equal("Test Art");
      expect(artist).to.equal(artist1);
      expect(price.toString()).to.equal(ARTWORK_PRICE);
      expect(forSale).to.be.true;
      expect(avgRating.toString()).to.equal('0');
      expect(galleryId).to.equal(GALLERY_ID);
      expect(royaltyPercentage.toString()).to.equal('10');
    });

    it("should get gallery artworks", async function () {
      const artworks = await artGallery.getGalleryArtworks(GALLERY_ID);
      expect(artworks.length).to.equal(1);
      expect(artworks[0].toString()).to.equal(tokenId.toString());
    });

    it("should get user artworks", async function () {
      const artworks = await artGallery.getUserArtworks(artist1);
      expect(artworks.length).to.equal(1);
      expect(artworks[0].toString()).to.equal(tokenId.toString());
    });

    it("should get user galleries", async function () {
      const galleries = await artGallery.getUserGalleries(owner);
      expect(galleries.length).to.equal(1);
      expect(galleries[0]).to.equal(GALLERY_ID);
    });
  });
});