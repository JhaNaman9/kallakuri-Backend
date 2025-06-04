const { validationResult } = require('express-validator');
const Shop = require('../models/Shop');
const Distributor = require('../models/Distributor');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Utility function to synchronize shop counts for a distributor
 * @param {string} distributorId - The ID of the distributor to sync counts for
 */
const syncDistributorShopCounts = async (distributorId) => {
  try {
    // Get the distributor document
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) return;

    // Count active retail shops in Shop collection for this distributor
    const retailShopsCount = await Shop.countDocuments({
      distributorId,
      type: 'Retailer',
      isActive: true
    });

    // Count active wholesale shops in Shop collection for this distributor
    const wholesaleShopsCount = await Shop.countDocuments({
      distributorId,
      type: 'Whole Seller',
      isActive: true
    });

    // Get count of legacy shops in the distributor document
    // We only count shops that don't have equivalents in the Shop collection
    const legacyRetailShopsCount = distributor.retailShops.length;
    const legacyWholesaleShopsCount = distributor.wholesaleShops.length;

    // Total unique shop counts - we only count legacy shops that don't have counterparts in the Shop collection
    // This is done by getShopsByDistributor which already removes duplicates
    const getShopsQuery = { distributorId, isActive: true };
    const shopsFromCollection = await Shop.find(getShopsQuery);

    // Create lookup maps for Shop collection shops
    const retailShopKeys = new Set();
    const wholesaleShopKeys = new Set();
    
    shopsFromCollection.forEach(shop => {
      const key = `${shop.name}-${shop.ownerName}-${shop.address}`.toLowerCase();
      if (shop.type === 'Retailer') {
        retailShopKeys.add(key);
      } else {
        wholesaleShopKeys.add(key);
      }
    });

    // Count only legacy shops that don't have equivalents in the Shop collection
    let uniqueLegacyRetailCount = 0;
    distributor.retailShops.forEach(shop => {
      const key = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
      if (!retailShopKeys.has(key)) {
        uniqueLegacyRetailCount++;
      }
    });

    let uniqueLegacyWholesaleCount = 0;
    distributor.wholesaleShops.forEach(shop => {
      const key = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
      if (!wholesaleShopKeys.has(key)) {
        uniqueLegacyWholesaleCount++;
      }
    });

    // Calculate total counts
    const totalRetailCount = retailShopsCount + uniqueLegacyRetailCount;
    const totalWholesaleCount = wholesaleShopsCount + uniqueLegacyWholesaleCount;

    // Update distributor if counts don't match
    if (totalRetailCount !== distributor.retailShopCount || 
        totalWholesaleCount !== distributor.wholesaleShopCount) {
      await Distributor.findByIdAndUpdate(
        distributorId,
        {
          retailShopCount: totalRetailCount,
          wholesaleShopCount: totalWholesaleCount
        }
      );
    }
  } catch (error) {
    logger.error(`Error syncing distributor shop counts: ${error.message}`);
  }
};

/**
 * @desc    Get all shops for a distributor
 * @route   GET /api/mobile/shops/distributor/:distributorId
 * @access  Private (Marketing Staff)
 */
exports.getShopsByDistributor = async (req, res, next) => {
  try {
    const { distributorId } = req.params;
    const { type } = req.query;

    // Verify the distributor exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Build query for Shop collection
    const query = { distributorId, isActive: true };
    if (type) {
      query.type = type;
    }
    
    // Get shops from Shop collection
    const shopCollectionShops = await Shop.find(query).sort({ name: 1 });
    
    // Create lookup map for Shop collection shops
    const shopCollectionMap = {};
    shopCollectionShops.forEach(shop => {
      const shopKey = `${shop.name}-${shop.ownerName}-${shop.address}`.toLowerCase();
      shopCollectionMap[shopKey] = shop;
    });

    // Process legacy shops from distributor model
    let allShops = [...shopCollectionShops];
    
    // Handle retail shops if no type filter or if type is Retailer
    if (!type || type === 'Retailer') {
      const retailShops = (distributor.retailShops || []).map(shop => {
        const shopKey = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
        if (!shopCollectionMap[shopKey]) {
          return {
            _id: shop._id.toString(),
            name: shop.shopName,
            ownerName: shop.ownerName,
            address: shop.address,
            type: 'Retailer',
            distributorId: distributorId,
            isLegacy: true,
            isActive: true
          };
        }
        return null;
      }).filter(Boolean);
      
      allShops = [...allShops, ...retailShops];
    }

    // Handle wholesale shops if no type filter or if type is Whole Seller
    if (!type || type === 'Whole Seller') {
      const wholesaleShops = (distributor.wholesaleShops || []).map(shop => {
        const shopKey = `${shop.shopName}-${shop.ownerName}-${shop.address}`.toLowerCase();
        if (!shopCollectionMap[shopKey]) {
          return {
            _id: shop._id.toString(),
            name: shop.shopName,
            ownerName: shop.ownerName,
            address: shop.address,
            type: 'Whole Seller',
            distributorId: distributorId,
            isLegacy: true,
            isActive: true
          };
        }
        return null;
      }).filter(Boolean);
      
      allShops = [...allShops, ...wholesaleShops];
    }

    // Sort final results
    allShops.sort((a, b) => a.name.localeCompare(b.name));

    // Sync shop counts
    await syncDistributorShopCounts(distributorId);

    res.status(200).json({
      success: true,
      count: allShops.length,
      data: allShops
    });
  } catch (error) {
    logger.error(`Error in getShopsByDistributor controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a new shop
 * @route   POST /api/mobile/shops
 * @access  Private (Marketing Staff)
 */
exports.addShop = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      name,
      ownerName,
      address,
      type,
      distributorId
    } = req.body;

    // Verify the distributor exists
    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        error: 'Distributor not found'
      });
    }

    // Check if the shop with the same name already exists for this distributor
    const existingShop = await Shop.findOne({ 
      name, 
      distributorId,
      isActive: true
    });
    
    if (existingShop) {
      return res.status(400).json({
        success: false,
        error: 'A shop with this name already exists for this distributor'
      });
    }

    // Create the shop in the Shop collection
    const shop = await Shop.create({
      name,
      ownerName,
      address,
      type,
      distributorId,
      createdBy: req.user.id
    });

    // Also add the shop to the distributor's shops array for backward compatibility,
    // but first check if it doesn't already exist there
    const updateField = type === 'Retailer' ? 'retailShops' : 'wholesaleShops';
    const countField = type === 'Retailer' ? 'retailShopCount' : 'wholesaleShopCount';
    
    // Check if shop with same details already exists in the distributor document
    const shopArray = distributor[updateField] || [];
    const shopExists = shopArray.some(
      s => s.shopName === name && 
           s.ownerName === ownerName && 
           s.address === address
    );
    
    // Only add to distributor document if it doesn't already exist
    if (!shopExists) {
      const newShopData = {
        shopName: name,
        ownerName: ownerName,
        address: address
      };
  
      // Update the distributor document
      await Distributor.findByIdAndUpdate(
        distributorId,
        {
          $push: { [updateField]: newShopData }
        }
      );
    }
    
    // Sync shop counts to ensure consistency
    await syncDistributorShopCounts(distributorId);

    res.status(201).json({
      success: true,
      data: shop
    });
  } catch (error) {
    logger.error(`Error in addShop controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a shop by ID
 * @route   GET /api/mobile/shops/:id
 * @access  Private (Marketing Staff)
 */
exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shop
    });
  } catch (error) {
    logger.error(`Error in getShopById controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a shop
 * @route   PUT /api/mobile/shops/:id
 * @access  Private (Marketing Staff)
 */
exports.updateShop = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      name,
      ownerName,
      address,
      type,
      distributorId
    } = req.body;

    // Find shop
    let shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    const originalType = shop.type;
    const originalDistributorId = shop.distributorId.toString();
    const newType = type || originalType;
    const newDistributorId = distributorId || originalDistributorId;

    // If distributor is being changed, verify the new distributor exists
    let newDistributor = null;
    if (distributorId && distributorId !== originalDistributorId) {
      newDistributor = await Distributor.findById(distributorId);
      if (!newDistributor) {
        return res.status(404).json({
          success: false,
          error: 'Distributor not found'
        });
      }
    }

    // Update shop in Shop collection
    shop = await Shop.findByIdAndUpdate(
      req.params.id,
      {
        name: name || shop.name,
        ownerName: ownerName || shop.ownerName,
        address: address || shop.address,
        type: newType,
        distributorId: newDistributorId
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Handle updates to the Distributor model
    
    // Get the original distributor
    const originalDistributor = await Distributor.findById(originalDistributorId);
    
    if (originalDistributor) {
      // Define which arrays to work with based on shop type
      const originalUpdateField = originalType === 'Retailer' ? 'retailShops' : 'wholesaleShops';
      
      // If distributor changed or type changed, remove from original distributor
      if (newDistributorId !== originalDistributorId || newType !== originalType) {
        // Find and remove the original shop entry
        await Distributor.findByIdAndUpdate(
          originalDistributorId,
          {
            $pull: { 
              [originalUpdateField]: { 
                shopName: shop.name, 
                ownerName: shop.ownerName,
                address: shop.address 
              } 
            }
          }
        );
        
        // If distributor changed, add to new distributor
        if (newDistributorId !== originalDistributorId) {
          const newUpdateField = newType === 'Retailer' ? 'retailShops' : 'wholesaleShops';
          
          await Distributor.findByIdAndUpdate(
            newDistributorId,
            {
              $push: { 
                [newUpdateField]: { 
                  shopName: name || shop.name,
                  ownerName: ownerName || shop.ownerName,
                  address: address || shop.address
                } 
              }
            }
          );
        }
        // If only type changed but distributor is the same
        else if (newType !== originalType) {
          const newUpdateField = newType === 'Retailer' ? 'retailShops' : 'wholesaleShops';
          
          await Distributor.findByIdAndUpdate(
            originalDistributorId,
            {
              $push: { 
                [newUpdateField]: { 
                  shopName: name || shop.name,
                  ownerName: ownerName || shop.ownerName,
                  address: address || shop.address
                } 
              }
            }
          );
        }
      }
      // If only basic details changed but distributor and type remain the same
      else if (name || ownerName || address) {
        // Find the shop to update
        const shops = originalDistributor[originalUpdateField] || [];
        const shopIndex = shops.findIndex(
          s => s.shopName === shop.name && 
               s.ownerName === shop.ownerName && 
               s.address === shop.address
        );
        
        if (shopIndex !== -1) {
          // Update the shop entry with new values
          const updateQuery = {};
          
          if (name) {
            updateQuery[`${originalUpdateField}.$.shopName`] = name;
          }
          
          if (ownerName) {
            updateQuery[`${originalUpdateField}.$.ownerName`] = ownerName;
          }
          
          if (address) {
            updateQuery[`${originalUpdateField}.$.address`] = address;
          }
          
          // Only update if there are changes
          if (Object.keys(updateQuery).length > 0) {
            await Distributor.findOneAndUpdate(
              { 
                _id: originalDistributorId,
                [`${originalUpdateField}.shopName`]: shop.name,
                [`${originalUpdateField}.ownerName`]: shop.ownerName,
                [`${originalUpdateField}.address`]: shop.address
              },
              { $set: updateQuery }
            );
          }
        }
      }
      
      // Sync shop counts for both original and new distributors
      await syncDistributorShopCounts(originalDistributorId);
      if (newDistributorId !== originalDistributorId) {
        await syncDistributorShopCounts(newDistributorId);
      }
    }

    res.status(200).json({
      success: true,
      data: shop
    });
  } catch (error) {
    logger.error(`Error in updateShop controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a shop (soft delete)
 * @route   DELETE /api/mobile/shops/:id
 * @access  Private (Marketing Staff)
 */
exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    // Soft delete by setting isActive to false
    await Shop.findByIdAndUpdate(
      req.params.id,
      { isActive: false }
    );

    // Check if this shop is associated with a distributor
    if (shop.distributorId) {
      const distributor = await Distributor.findById(shop.distributorId);
      if (distributor) {
        const updateField = shop.type === 'Retailer' ? 'retailShops' : 'wholesaleShops';
        
        // Find matching shop in the retailShops or wholesaleShops array based on name, owner and address
        const shops = distributor[updateField] || [];
        const shopIndex = shops.findIndex(
          s => s.shopName === shop.name && 
               s.ownerName === shop.ownerName && 
               s.address === shop.address
        );
        
        if (shopIndex !== -1) {
          // Remove the shop from the array
          await Distributor.findByIdAndUpdate(
            shop.distributorId,
            {
              $pull: { 
                [updateField]: { 
                  shopName: shop.name,
                  ownerName: shop.ownerName,
                  address: shop.address
                } 
              }
            }
          );
        }
        
        // Sync shop counts to ensure consistency
        await syncDistributorShopCounts(shop.distributorId);
      }
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error in deleteShop controller: ${error.message}`);
    next(error);
  }
};