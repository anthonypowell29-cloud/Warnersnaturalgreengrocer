import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Star } from "lucide-react";
import { toast } from "sonner";
import jamaicaPattern from "@/assets/jamaica-produce-pattern.jpg";

interface Review {
  _id: string;
  rating: number;
  comment: string;
  images?: string[];
  isModerated: boolean;
  isVerifiedPurchase: boolean;
  reportedCount: number;
  moderatorNotes?: string;
  productId: {
    _id: string;
    title: string;
    images: string[];
  };
  userId: {
    _id: string;
    displayName: string;
    email: string;
    photoURL?: string;
  };
  createdAt: string;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    try {
      const data = await adminApi.getReviews({
        isModerated: statusFilter === "pending" ? false : statusFilter === "approved" ? true : undefined,
        search: searchTerm || undefined,
      });
      setReviews(data.reviews || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error(error.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reviewId: string, isModerated: boolean, notes?: string) => {
    try {
      await adminApi.moderateReview(reviewId, isModerated, notes);
      toast.success(`Review ${isModerated ? "approved" : "rejected"} successfully`);
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || "Failed to moderate review");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Jamaican Produce Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${jamaicaPattern})`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />

      <div className="relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Review Moderation</h1>
          <p className="text-muted-foreground">Moderate user reviews and ratings</p>
        </div>

      <Card className="glass border-white/20">
        <CardHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReviews()}
                className="pl-10 bg-white/50 border-white/20"
              />
            </div>
            <Button onClick={fetchReviews} variant="outline">Search</Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("approved")}
            >
              Approved
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="p-4 rounded-lg border border-border hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      {review.isModerated ? (
                        <Badge className="bg-green-500">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {review.isVerifiedPurchase && (
                        <Badge variant="outline" className="bg-blue-50">Verified Purchase</Badge>
                      )}
                      {review.reportedCount > 0 && (
                        <Badge variant="destructive">Reported ({review.reportedCount})</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground mb-2">{review.comment}</p>
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {review.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Review ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Product: <span className="font-medium">{review.productId.title}</span>
                      </p>
                      <p>
                        User: {review.userId.displayName} ({review.userId.email})
                      </p>
                      <p>Date: {new Date(review.createdAt).toLocaleDateString()}</p>
                      {review.moderatorNotes && (
                        <p className="text-xs italic">Admin Note: {review.moderatorNotes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!review.isModerated ? (
                      <>
                        <Button
                          size="sm"
                          className="gradient-primary text-white"
                          onClick={() => handleModerate(review._id, true)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerate(review._id, false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerate(review._id, false)}
                      >
                        Revoke Approval
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No reviews found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Reviews;

