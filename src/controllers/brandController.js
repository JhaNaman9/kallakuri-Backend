const { validationResult } = require('express-validator');
const Brand = require('../models/Brand');
const logger = require('../utils/logger');

/**
 * @desc    Create a new brand
 * @route   POST /api/brands
 * @access  Private (Admin)
 */
exports.createBrand = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    // Create brand
    const brand = await Brand.create({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A brand with that name already exists'
      });
    }
    
    logger.error(`Error in createBrand controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get all brands
 * @route   GET /api/brands
 * @access  Private
 */
exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    logger.error(`Error in getBrands controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Get a single brand
 * @route   GET /api/brands/:id
 * @access  Private
 */
exports.getBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    logger.error(`Error in getBrand controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Update a brand
 * @route   PUT /api/brands/:id
 * @access  Private (Admin)
 */
exports.updateBrand = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, isActive } = req.body;

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { name, description, isActive },
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A brand with that name already exists'
      });
    }
    
    logger.error(`Error in updateBrand controller: ${error.message}`);
    next(error);
  }
};

/**
 * @desc    Delete a brand
 * @route   DELETE /api/brands/:id
 * @access  Private (Admin)
 */
exports.deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error in deleteBrand controller: ${error.message}`);
    next(error);
  }
}; 