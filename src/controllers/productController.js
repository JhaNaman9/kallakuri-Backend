const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { brandName, variants } = req.body;

    // Create product
    const product = await Product.create({
      brandName,
      variants: variants || [],
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error in createProduct controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Private
 */
exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ brandName: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    logger.error(`Error in getProducts controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Private
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error in getProduct controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { brandName, isActive } = req.body;

    // Find product
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      { 
        brandName, 
        isActive,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name')
     .populate('updatedBy', 'name');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error in updateProduct controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Soft delete by setting isActive to false
    product.isActive = false;
    product.updatedBy = req.user.id;
    await product.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error in deleteProduct controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a variant to a product
 * @route   POST /api/products/:id/variants
 * @access  Private (Admin)
 */
exports.addVariant = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, sizes } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Add variant
    const variant = {
      name,
      sizes: sizes || []
    };

    product.variants.push(variant);
    product.updatedBy = req.user.id;
    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error in addVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a size to a variant
 * @route   POST /api/products/:id/variants/:variantId/sizes
 * @access  Private (Admin)
 */
exports.addSize = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name } = req.body;
    
    // Log the add size operation
    logger.info(`Adding size '${name}' to product: ${req.params.id}, variant: ${req.params.variantId}`);

    // Use direct MongoDB update to push to nested array
    const result = await Product.findOneAndUpdate(
      { 
        _id: req.params.id, 
        'variants._id': req.params.variantId 
      },
      { 
        $push: { 'variants.$.sizes': { name, isActive: true } },
        $set: { updatedBy: req.user.id }
      },
      { 
        new: true,  // Return the modified document
        runValidators: true  // Run model validators
      }
    );

    if (!result) {
      logger.error(`Variant not found: product=${req.params.id}, variant=${req.params.variantId}`);
      return res.status(404).json({
        success: false,
        error: 'Product or variant not found'
      });
    }

    // Get the updated variant to verify changes
    const variant = result.variants.find(v => v._id.toString() === req.params.variantId);
    logger.info(`Size added successfully. Variant now has ${variant?.sizes?.length || 0} sizes`);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error in addSize controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a variant
 * @route   PUT /api/products/:id/variants/:variantId
 * @access  Private (Admin)
 */
exports.updateVariant = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, isActive } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Find variant
    const variant = product.variants.id(req.params.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found'
      });
    }

    // Update variant
    variant.name = name || variant.name;
    variant.isActive = isActive !== undefined ? isActive : variant.isActive;
    product.updatedBy = req.user.id;
    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error(`Error in updateVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a size
 * @route   PUT /api/products/:id/variants/:variantId/sizes/:sizeId
 * @access  Private (Admin)
 */
exports.updateSize = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, isActive } = req.body;
    
    // Log what we're attempting to update
    logger.info(`Attempting to update size in product: ${req.params.id}, variant: ${req.params.variantId}, size: ${req.params.sizeId}`);
    logger.info(`Updating with values: name=${name}, isActive=${isActive}`);

    // Use direct MongoDB update for better handling of nested arrays
    // This uses the positional $ operator to locate the exact nested document to update
    const result = await Product.findOneAndUpdate(
      { 
        _id: req.params.id,
        'variants._id': req.params.variantId,
        'variants.sizes._id': req.params.sizeId 
      },
      { 
        $set: {
          'variants.$.sizes.$[sizeElem].name': name,
          'variants.$.sizes.$[sizeElem].isActive': isActive !== undefined ? isActive : true,
          updatedBy: req.user.id
        } 
      },
      { 
        new: true,  // Return the modified document
        arrayFilters: [{ 'sizeElem._id': req.params.sizeId }],  // Target specific size in array
        runValidators: true  // Run model validators
      }
    );

    if (!result) {
      logger.error(`Size not found: product=${req.params.id}, variant=${req.params.variantId}, size=${req.params.sizeId}`);
      return res.status(404).json({
        success: false,
        error: 'Size not found'
      });
    }

    // Get the updated variant to verify changes
    const variant = result.variants.find(v => v._id.toString() === req.params.variantId);
    const size = variant?.sizes?.find(s => s._id.toString() === req.params.sizeId);
    
    logger.info(`Size updated successfully: ${size?.name}, active: ${size?.isActive}`);
    logger.info(`Variant now has ${variant?.sizes?.length || 0} sizes after update`);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error in updateSize controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get brands with their variants and sizes for mobile app
 * @route   GET /api/mobile/products/brands-with-variants
 * @access  Private
 */
exports.getBrandsWithVariants = async (req, res, next) => {
  try {
    // Get all active products
    const products = await Product.find({ isActive: true })
      .sort({ brandName: 1 });

    // Transform the data for mobile app consumption
    const brandsWithVariants = products.map(product => {
      // Filter out inactive variants and sizes
      const activeVariants = product.variants.filter(variant => variant.isActive !== false);
      
      const transformedVariants = activeVariants.map(variant => {
        // Filter out inactive sizes
        const activeSizes = variant.sizes.filter(size => size.isActive !== false);
        
        return {
          _id: variant._id,
          name: variant.name,
          sizes: activeSizes.map(size => ({
            _id: size._id,
            name: size.name
          }))
        };
      });

      return {
        _id: product._id,
        brandName: product.brandName,
        variants: transformedVariants
      };
    });

    res.status(200).json({
      success: true,
      count: brandsWithVariants.length,
      data: brandsWithVariants
    });
  } catch (error) {
    logger.error(`Error in getBrandsWithVariants controller: ${error.message}`);
    next(error);
  }
}; 