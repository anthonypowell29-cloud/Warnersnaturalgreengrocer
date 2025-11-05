import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/config/database';
import Review, { IReviewModel, IReview } from '../src/models/Review.model';
import Product from '../src/models/Product.model';

// Load environment variables
dotenv.config();

async function fixReviews() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();

    console.log('📝 Updating existing reviews to isModerated: true...');
    // Update all existing reviews to isModerated: true
    const updateResult = await (Review as unknown as mongoose.Model<IReview>).updateMany(
      { isModerated: false },
      { $set: { isModerated: true } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} reviews`);

    console.log('📊 Getting all products with reviews...');
    // Get all unique product IDs that have reviews
    const productsWithReviews = await (Review as unknown as mongoose.Model<IReview>).distinct('productId');
    console.log(`📦 Found ${productsWithReviews.length} products with reviews`);

    console.log('🔢 Recalculating ratings for all products...');
    // Recalculate ratings for all products
    const ReviewModel = Review as any;
    let updatedCount = 0;
    let errorCount = 0;

    for (const productId of productsWithReviews) {
      try {
        const stats = await ReviewModel.calculateAverageRating(productId);
        await Product.findByIdAndUpdate(productId, {
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
          ratingDistribution: stats.distribution,
        });
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`   Processed ${updatedCount}/${productsWithReviews.length} products...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error updating product ${productId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Review fix completed!');
    console.log(`   - Reviews updated: ${updateResult.modifiedCount}`);
    console.log(`   - Products updated: ${updatedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total products: ${productsWithReviews.length}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error fixing reviews:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the fix
fixReviews();

