const { validationResult } = require('express-validator');
const Variant = require('../models/Variant');
const Brand = require('../models/Brand');
const logger = require('../utils/logger');

/**
 * @desc    Create a new variant
 * @route   POST /api/variants
 * @access  Private (Admin)
 */
exports.createVariant = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, brand, sizes } = req.body;

    // Check if brand exists
    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    // Create variant
    const variant = await Variant.create({
      name,
      brand,
      sizes: sizes || [],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: variant
    });
  } catch (error) {
    logger.error(`Error in createVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all variants
 * @route   GET /api/variants
 * @access  Private
 */
exports.getVariants = async (req, res, next) => {
  try {
    const { brand } = req.query;
    
    const query = { isActive: true };
    if (brand) {
      query.brand = brand;
    }
    
    const variants = await Variant.find(query)
      .populate('brand', 'name')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: variants.length,
      data: variants
    });
  } catch (error) {
    logger.error(`Error in getVariants controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single variant
 * @route   GET /api/variants/:id
 * @access  Private
 */
exports.getVariant = async (req, res, next) => {
  try {
    const variant = await Variant.findById(req.params.id).populate('brand', 'name');

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: variant
    });
  } catch (error) {
    logger.error(`Error in getVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a variant
 * @route   PUT /api/variants/:id
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

    const { name, brand, sizes, isActive } = req.body;

    // If brand is being changed, check if new brand exists
    if (brand) {
      const brandExists = await Brand.findById(brand);
      if (!brandExists) {
        return res.status(404).json({
          success: false,
          error: 'Brand not found'
        });
      }
    }

    const variant = await Variant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found'
      });
    }

    // Update variant
    if (name) variant.name = name;
    if (brand) variant.brand = brand;
    if (sizes) variant.sizes = sizes;
    if (isActive !== undefined) variant.isActive = isActive;

    await variant.save();

    const updatedVariant = await Variant.findById(variant._id).populate('brand', 'name');

    res.status(200).json({
      success: true,
      data: updatedVariant
    });
  } catch (error) {
    logger.error(`Error in updateVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a variant
 * @route   DELETE /api/variants/:id
 * @access  Private (Admin)
 */
exports.deleteVariant = async (req, res, next) => {
  try {
    const variant = await Variant.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error in deleteVariant controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Add a size to a variant
 * @route   POST /api/variants/:id/sizes
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

    const variant = await Variant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        error: 'Variant not found'
      });
    }

    // Check if size already exists
    const sizeExists = variant.sizes.some(size => size.name === name);
    if (sizeExists) {
      return res.status(400).json({
        success: false,
        error: 'Size already exists for this variant'
      });
    }

    // Add size
    variant.sizes.push({ name });
    await variant.save();

    res.status(200).json({
      success: true,
      data: variant
    });
  } catch (error) {
    logger.error(`Error in addSize controller: ${error.message}`);
    next(error);
  }
}; 