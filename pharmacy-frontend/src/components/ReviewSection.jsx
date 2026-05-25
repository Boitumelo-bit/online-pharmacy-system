import React, { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReviewSection = ({ medicineId }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [medicineId]);

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/medicine/${medicineId}`);
      if (response.data.success) {
        setReviews(response.data.data);
        setAverageRating(response.data.averageRating);
        setTotalReviews(response.data.totalReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!userReview.trim()) {
      toast.error('Please write a review');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/reviews', {
        medicineId,
        rating: userRating,
        comment: userReview
      });
      if (response.data.success) {
        toast.success('Review submitted! It will appear after approval.');
        setUserRating(0);
        setUserReview('');
        fetchReviews();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, setRating, hoverRating, setHoverRating, size = 'large' }) => {
    const starSize = size === 'large' ? 'w-8 h-8' : 'w-5 h-5';
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={`${starSize} ${
                (hoverRating || rating) >= star
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 dark:text-gray-600'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Customer Reviews</h3>
      
      {/* Average Rating Summary */}
      <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">{averageRating.toFixed(1)}</div>
          <StarRating rating={averageRating} setRating={() => {}} hoverRating={0} setHoverRating={() => {}} size="small" />
          <div className="text-sm text-gray-500 mt-1">Based on {totalReviews} reviews</div>
        </div>
      </div>

      {/* Write Review Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Write a Review</h4>
        <StarRating rating={userRating} setRating={setUserRating} hoverRating={hoverRating} setHoverRating={setHoverRating} />
        <textarea
          value={userReview}
          onChange={(e) => setUserReview(e.target.value)}
          placeholder="Share your experience with this medicine..."
          className="w-full mt-3 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          rows="3"
        />
        <button
          onClick={handleSubmitReview}
          disabled={submitting}
          className="mt-3 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{review.user?.fullName}</p>
                <StarRating rating={review.rating} setRating={() => {}} hoverRating={0} setHoverRating={() => {}} size="small" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{review.comment}</p>
            <p className="text-xs text-gray-500 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;