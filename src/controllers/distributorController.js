const { validationResult } = require('express-validator');
const Distributor = require('../models/Distributor');
const logger = require('../utils/logger');

/**
 * @desc    Create a new distributor
 * @route   POST /api/distributors
 * @access  Private (Admin)
 */
exports.createDistributor = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, shopName, contact, address, phoneNumber } = req.body;

    // Create distributor
    const distributor = await Distributor.create({
      name,
      shopName,
      contact,
      address,
      phoneNumber,
      retailShops: [],
      wholesaleShops: []
    });

    res.status(201).json({
      success: true,
      data: distributor
    });
  } catch (error) {
    logger.error(`Error in createDistributor controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all distributors
 * @route   GET /api/distributors
 * @access  Private
 */
exports.getDistributors = async (req, res, next) => {
  try {
    const distributors = await Distributor.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: distributors.length,
      data: distributors
    });
  } catch (error) {
    logger.error(`Error in getDistributors controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get single distributor
 * @route   GET /api/distributors/:id
 * @access  Private
 */
exports.getDistributor = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (error) {
    logger.error(`Error in getDistributor controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get comprehensive details for a distributor (including shops and other info)
 * @route   GET /api/mobile/distributors/:id/details
 * @access  Private
 */
exports.getDistributorDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the distributor
    const distributor = await Distributor.findById(id);
    
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }
    
    // Get all shops for this distributor
    const Shop = require('../models/Shop');
    
    // Get shops from Shop collection
    const shopQuery = { distributorId: id, isActive: true };
    const shops = await Shop.find(shopQuery).sort({ name: 1 });
    
    // Process legacy shops from distributor model
    // Map of shopCollection shops for easy lookup
    const shopCollectionMap = {};
    shops.forEach(shop => {
      // Create a unique key for name+owner+address to identify potential duplicates
      const shopKey = `${shop.name}-${shop.ownerName}-${shop.address}`.toLowerCase();
      shopCollectionMap[shopKey] = shop;
    });
    
    // Get retail and wholesale shops from Distributor model
    let legacyShops = [];
    
    // Process retailShops from distributor
    if (distributor.retailShops && distributor.retailShops.length > 0) {
      const retailShops = distributor.retailShops.map(shop => {
        // Check if this legacy shop has a counterpart in the Shop collection
        const shopKey = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
        
        // Skip shops that exist in the ShopCollection
        if (shopCollectionMap[shopKey]) {
          return null;
        }
        
        return {
          _id: shop._id.toString(),
          name: shop.shopName,
          ownerName: shop.ownerName,
          address: shop.address,
          type: 'Retailer', 
          distributorId: id,
          isLegacy: true, // Mark as legacy shop
          isActive: true
        };
      }).filter(shop => shop !== null); // Remove nulls (excluded shops)
      
      legacyShops = [...legacyShops, ...retailShops];
    }
    
    // Process wholesaleShops from distributor
    if (distributor.wholesaleShops && distributor.wholesaleShops.length > 0) {
      const wholesaleShops = distributor.wholesaleShops.map(shop => {
        // Check if this legacy shop has a counterpart in the Shop collection
        const shopKey = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
        
        // Skip shops that exist in the ShopCollection
        if (shopCollectionMap[shopKey]) {
          return null;
        }
        
        return {
          _id: shop._id.toString(),
          name: shop.shopName,
          ownerName: shop.ownerName,
          address: shop.address,
          type: 'Whole Seller',
          distributorId: id,
          isLegacy: true, // Mark as legacy shop
          isActive: true
        };
      }).filter(shop => shop !== null); // Remove nulls (excluded shops)
      
      legacyShops = [...legacyShops, ...wholesaleShops];
    }
    
    // Combine both sets of shops
    const allShops = [...shops, ...legacyShops];
    
    // Sort shops by name
    allShops.sort((a, b) => a.name.localeCompare(b.name));
    
    // Group shops by type for cleaner output
    const retailShops = allShops.filter(shop => shop.type === 'Retailer');
    const wholesaleShops = allShops.filter(shop => shop.type === 'Whole Seller');
    
    // Build the final response
    const result = {
      _id: distributor._id,
      name: distributor.name,
      shopName: distributor.shopName,
      contact: distributor.contact,
      phoneNumber: distributor.phoneNumber,
      address: distributor.address,
      retailShopCount: distributor.retailShopCount || retailShops.length,
      wholesaleShopCount: distributor.wholesaleShopCount || wholesaleShops.length,
      orderCount: distributor.orderCount || 0,
      shops: {
        retailShops,
        wholesaleShops
      }
    };
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`Error in getDistributorDetails controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update distributor
 * @route   PUT /api/distributors/:id
 * @access  Private (Admin)
 */
exports.updateDistributor = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, shopName, contact, address, phoneNumber } = req.body;

    // Find and update distributor
    let distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    distributor = await Distributor.findByIdAndUpdate(
      req.params.id,
      { name, shopName, contact, address, phoneNumber },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (error) {
    logger.error(`Error in updateDistributor controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a retail shop to distributor
 * @route   POST /api/distributors/:id/retail-shops
 * @access  Private
 */
exports.addRetailShop = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shopName, ownerName, address } = req.body;

    // Find distributor
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Add retail shop
    distributor.retailShops.push({
      shopName,
      ownerName,
      address
    });

    // Update count
    distributor.retailShopCount = distributor.retailShops.length;

    // Save distributor
    await distributor.save();

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (error) {
    logger.error(`Error in addRetailShop controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a wholesale shop to distributor
 * @route   POST /api/distributors/:id/wholesale-shops
 * @access  Private
 */
exports.addWholesaleShop = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { shopName, ownerName, address } = req.body;

    // Find distributor
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Add wholesale shop
    distributor.wholesaleShops.push({
      shopName,
      ownerName,
      address
    });

    // Update count
    distributor.wholesaleShopCount = distributor.wholesaleShops.length;

    // Save distributor
    await distributor.save();

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (error) {
    logger.error(`Error in addWholesaleShop controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete distributor
 * @route   DELETE /api/distributors/:id
 * @access  Private (Admin)
 */
exports.deleteDistributor = async (req, res, next) => {
  try {
    // Find and delete distributor
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    await distributor.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error in deleteDistributor controller: ${error.message}`);
    next(error);
  }
}; 