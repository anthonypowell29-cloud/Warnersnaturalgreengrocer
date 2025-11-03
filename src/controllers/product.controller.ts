import { Request, Response } from 'express';
import Product, { IProduct } from '../models/Product.model';
import { uploadImage } from '../services/image.service';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      parish,
      minPrice,
      maxPrice,
      search,
      available,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    // Build query
    const query: any = {
      available: available !== 'false',
      isApproved: true, // Only show approved products
    };

    if (category) {
      query.category = category;
    }

    if (parish) {
      query.parish = parish;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with optimized fields selection and lean() for better performance
    const products = await Product.find(query)
      .populate('sellerId', 'displayName photoURL userType isVerified')
      .select('title description category subcategory price stock images parish location available averageRating totalReviews createdAt sellerId')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance - returns plain JS objects

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch products',
      },
    });
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'sellerId',
      'displayName photoURL userType isVerified'
    );

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch product',
      },
    });
  }
};

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Farmer only)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    // Check if user is a farmer
    if (req.user?.userType !== 'farmer') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only farmers can create products',
        },
      });
      return;
    }

    const {
      title,
      description,
      category,
      subcategory,
      price,
      stock,
      parish,
      latitude,
      longitude,
      seasonal,
    } = req.body;

    // Validate location
    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location (latitude and longitude) is required',
        },
      });
      return;
    }

    // Handle image uploads
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const uploadResult = await uploadImage(
          file as Express.Multer.File,
          'jamaican-marketplace/products'
        );
        images.push(uploadResult.url);
      }
    }

    // Create product
    const product = await Product.create({
      sellerId: userId,
      title,
      description,
      category,
      subcategory,
      price: Number(price),
      stock: Number(stock),
      images,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      parish,
      seasonal: seasonal === 'true' || seasonal === true,
      available: Number(stock) > 0,
      isApproved: false, // Requires admin approval
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully. Pending approval.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create product',
      },
    });
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Owner only)
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    // Check ownership
    if (String(product.sellerId) !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own products',
        },
      });
      return;
    }

    // Update fields
    const {
      title,
      description,
      category,
      subcategory,
      price,
      stock,
      parish,
      latitude,
      longitude,
      seasonal,
      available,
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (subcategory !== undefined) product.subcategory = subcategory;
    if (price) product.price = Number(price);
    if (stock !== undefined) {
      product.stock = Number(stock);
      product.available = Number(stock) > 0;
    }
    if (parish) product.parish = parish;
    if (latitude && longitude) {
      product.location.coordinates = [Number(longitude), Number(latitude)];
    }
    if (seasonal !== undefined) product.seasonal = seasonal === 'true' || seasonal === true;
    if (available !== undefined) product.available = available === 'true' || available === true;

    // Handle new image uploads
    if (req.files && Array.isArray(req.files)) {
      const newImages: string[] = [];
      for (const file of req.files) {
        const uploadResult = await uploadImage(
          file as Express.Multer.File,
          'jamaican-marketplace/products'
        );
        newImages.push(uploadResult.url);
      }
      product.images = [...product.images, ...newImages];
    }

    await product.save();

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update product',
      },
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Owner only)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
      return;
    }

    // Check ownership
    if (String(product.sellerId) !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own products',
        },
      });
      return;
    }

    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete product',
      },
    });
  }
};

// @desc    Get seller's products
// @route   GET /api/v1/products/seller/my-products
// @access  Private (Farmer)
export const getMyProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (req.user?.userType !== 'farmer') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only farmers can view their products',
        },
      });
      return;
    }

    const products = await Product.find({ sellerId: userId }).sort('-createdAt');

    res.status(200).json({
      success: true,
      data: {
        products,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch products',
      },
    });
  }
};

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, parish, minPrice, maxPrice } = req.query;

    const query: any = {
      available: true,
      isApproved: true,
    };

    if (q) {
      query.$text = { $search: q as string };
    }

    if (category) {
      query.category = category;
    }

    if (parish) {
      query.parish = parish;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
      .populate('sellerId', 'displayName photoURL userType')
      .limit(50)
      .sort(q ? { score: { $meta: 'textScore' } } : '-createdAt');

    res.status(200).json({
      success: true,
      data: {
        products,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Search failed',
      },
    });
  }
};

