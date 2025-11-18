const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");

const reviewController = {
  createReview: async (req, res) => {
    try {
      const currentUserId = req.user.id;

      if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const customerDoc = await User.findById(currentUserId);
      if (!customerDoc) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (customerDoc.role !== "Customer") {
        return res
          .status(403)
          .json({ message: "Only customers can create reviews" });
      }

      const { rating, comment } = req.body;

      const existingReview = await Review.findOne({ customer: currentUserId });
      if (existingReview) {
        return res
          .status(400)
          .json({ message: "Customer has already submitted a review" });
      }

      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return res
          .status(400)
          .json({ message: "rating must be a number between 1 and 5" });
      }

      if (comment !== undefined) {
        if (typeof comment !== "string") {
          return res.status(400).json({ message: "comment must be a string" });
        }
        if (comment.length > 2000) {
          return res
            .status(400)
            .json({ message: "comment must be <= 2000 characters" });
        }
      }

      const newReview = new Review({
        customer: currentUserId,
        rating: r,
        comment,
        date: new Date(),
      });

      await newReview.save();

      const populated = await newReview.populate({
        path: "customer",
        model: User,
        select: "-password -__v",
      });

      return res.status(201).json({
        message: "Review created successfully",
        review: populated,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ message: "Customer has already submitted a review" });
      }

      console.error("Error creating review:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getReviewById: async (req, res) => {
    try {
      const { reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ message: "Invalid reviewId" });
      }

      const review = await Review.findById(reviewId).populate({
        path: "customer",
        model: User,
        select: "-password -__v",
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      return res.status(200).json({
        message: "Review fetched successfully",
        review,
      });
    } catch (error) {
      console.error("Error fetching review:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllReviews: async (req, res) => {
    try {
      const reviews = await Review.find()
        .sort({ createdAt: -1 })
        .populate({
          path: "customer",
          model: User,
          select: "-password -__v",
        });

      return res.status(200).json({
        message: "Reviews fetched successfully",
        reviews,
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  updateReviewById: async (req, res) => {
    try {
      const { reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ message: "Invalid reviewId" });
      }

      const currentUserId = req.user.id;
      const currentUserRole = req.user?.role;

      if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      const isOwner = review.customer.toString() === currentUserId.toString();
      const isAdmin = currentUserRole === "Admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const {
        customer: _omitCustomer,
        rating,
        comment,
        date: _omitDate,
      } = req.body;

      const $set = {};

      if (rating !== undefined) {
        const r = Number(rating);
        if (!Number.isFinite(r) || r < 1 || r > 5) {
          return res
            .status(400)
            .json({ message: "rating must be a number between 1 and 5" });
        }
        $set.rating = r;
      }

      if (comment !== undefined) {
        if (typeof comment !== "string") {
          return res.status(400).json({ message: "comment must be a string" });
        }
        if (comment.length > 2000) {
          return res
            .status(400)
            .json({ message: "comment must be <= 2000 characters" });
        }
        $set.comment = comment;
      }

      if (Object.keys($set).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await Review.findByIdAndUpdate(
        reviewId,
        { $set },
        { new: true }
      ).populate({
        path: "customer",
        model: User,
        select: "-password -__v",
      });

      return res.status(200).json({
        message: "Review updated successfully",
        review: updated,
      });
    } catch (error) {
      console.error("Error updating review:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteReviewById: async (req, res) => {
    try {
      const { reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({ message: "Invalid reviewId" });
      }

      const deleted = await Review.findByIdAndDelete(reviewId);

      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }

      return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getHighlightedReviews: async (req, res) => {
    try {
      const reviews = await Review.find({ rating: 5 })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: "customer",
          model: User,
          select: "-password -__v",
        });

      return res.status(200).json({
        message: "Highlighted reviews fetched successfully",
        reviews,
      });
    } catch (error) {
      console.error("Error fetching highlighted reviews:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = reviewController;
