import { Request, Response } from 'express';
import Product, { IProduct } from '../models/Product.model';
import { uploadImage } from '../services/image.service';
import Review, { IReviewModel } from '../models/Review.model';

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
      // Products are now displayed immediately without approval
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
      // Use regex for partial matching instead of full-text search
      const searchRegex = new RegExp(search as string, 'i'); // 'i' for case-insensitive
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
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

    // Calculate and update ratings for products that might have missing or outdated ratings
    // Only calculate for products that might have reviews (optimization)
    const productsWithRatings = await Promise.all(
      products.map(async (product: any) => {
        // If ratings are already present and look valid, use them
        if (
          product.averageRating !== undefined &&
          product.averageRating !== null &&
          product.totalReviews !== undefined &&
          product.totalReviews !== null &&
          product.totalReviews > 0
        ) {
          return {
            ...product,
            averageRating: product.averageRating,
            totalReviews: product.totalReviews,
          };
        }
        
        // Calculate ratings for products with missing or zero ratings
        const ReviewModel = Review as any;
        const stats = await ReviewModel.calculateAverageRating(product._id);
        
        // Update product in database if it has reviews
        if (stats.totalReviews > 0 || 
            product.averageRating === undefined || 
            product.averageRating === null ||
            product.totalReviews === undefined || 
            product.totalReviews === null) {
          // Update in database for future queries (fire and forget)
          Product.findByIdAndUpdate(product._id, {
            averageRating: stats.averageRating,
            totalReviews: stats.totalReviews,
            ratingDistribution: stats.distribution,
          }, { new: false }).catch(err => console.error('Error updating product ratings:', err));
        }
        
        // Return updated values for this response
        return {
          ...product,
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
        };
      })
    );

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: productsWithRatings,
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
    let product: any = await Product.findById(req.params.id)
      .populate(
        'sellerId',
        'displayName photoURL userType isVerified'
      )
      .lean(); // Use lean() to return plain object and avoid Mongoose serialization issues

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

    // Calculate and update ratings if missing or outdated
    const ReviewModel = Review as any;
    const stats = await ReviewModel.calculateAverageRating(product._id);
    
    // Update product if ratings are missing or different
    if (
      product.averageRating === undefined ||
      product.averageRating === null ||
      product.totalReviews === undefined ||
      product.totalReviews === null ||
      Math.abs((product.averageRating || 0) - stats.averageRating) > 0.01 ||
      (product.totalReviews || 0) !== stats.totalReviews
    ) {
      // Update in database for future queries
      await Product.findByIdAndUpdate(product._id, {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        ratingDistribution: stats.distribution,
      });
      
      // Update the product object for this response
      product = {
        ...product,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
      };
    } else {
      // Ensure default values if undefined
      product = {
        ...product,
        averageRating: product.averageRating ?? 0,
        totalReviews: product.totalReviews ?? 0,
      };
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

    // Use default location if not provided (Jamaica center, St. Mary parish)
    const finalLatitude = latitude || 18.1; // Jamaica center latitude
    const finalLongitude = longitude || -77.3; // Jamaica center longitude
    const finalParish = parish || 'St. Mary';

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
        coordinates: [Number(finalLongitude), Number(finalLatitude)],
      },
      parish: finalParish,
      seasonal: seasonal === 'true' || seasonal === true,
      available: Number(stock) > 0,
      isApproved: true, // Products are immediately visible
    });

    // Convert to plain object to avoid Mongoose serialization issues
    const productData = product.toObject ? product.toObject() : product;

    res.status(201).json({
      success: true,
      data: productData,
      message: 'Product created successfully.',
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

    // Convert to plain object to avoid Mongoose serialization issues
    const productData = product.toObject ? product.toObject() : product;

    res.status(200).json({
      success: true,
      data: productData,
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

    const products = await Product.find({ sellerId: userId })
      .sort('-createdAt')
      .lean(); // Use lean() to return plain objects

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
      // Use regex for partial matching instead of full-text search
      const searchRegex = new RegExp(q as string, 'i'); // 'i' for case-insensitive
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
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
      .sort('-createdAt');

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

