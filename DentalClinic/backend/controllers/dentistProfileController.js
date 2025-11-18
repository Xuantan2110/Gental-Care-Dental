const mongoose = require('mongoose');
const DentistProfile = require('../models/DentistProfile');
const User = require('../models/User');

const dentistProfileController = {
  createDentistProfile: async (req, res) => {
    try {
      const {
        dentistId,
        specialization,
        experienceYears,
        biography,
        education,
        awards
      } = req.body;

      if (!dentistId || !mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: 'Invalid dentistId' });
      }

      if (typeof specialization !== 'string' || !specialization.trim()) {
        return res.status(400).json({ message: 'specialization must be a non-empty string' });
      }
      if (specialization.trim().length > 100) {
        return res.status(400).json({ message: 'specialization must be <= 100 characters' });
      }

      const exp = Number(experienceYears);
      if (!Number.isInteger(exp) || exp < 0 || exp > 80) {
        return res.status(400).json({ message: 'experienceYears must be an integer between 0 and 80' });
      }

      if (biography !== undefined) {
        if (typeof biography !== 'string') {
          return res.status(400).json({ message: 'biography must be a string' });
        }
        if (biography.length > 2000) {
          return res.status(400).json({ message: 'biography must be <= 2000 characters' });
        }
      }

      let educationClean;
      if (education !== undefined) {
        if (typeof education !== "string") {
          return res.status(400).json({ message: "education must be a string" });
        }

        if (education.length > 2000) {
          return res.status(400).json({ message: "education must be <= 2000 characters" });
        }

        educationClean = education.trim();
      }

      let awardsClean;
      if (awards !== undefined) {
        if (typeof awards !== "string") {
          return res.status(400).json({ message: "awards must be a string" });
        }

        if (awards.length > 2000) {
          return res.status(400).json({ message: "awards must be <= 2000 characters" });
        }

        awardsClean = awards.trim();
      }

      const dentist = await User.findById(dentistId);
      if (!dentist) {
        return res.status(404).json({ message: 'Dentist not found' });
      }
      if (dentist.role !== 'Dentist') {
        return res.status(400).json({ message: 'User is not a dentist' });
      }

      const existingProfile = await DentistProfile.findOne({ dentistId });
      if (existingProfile) {
        return res.status(400).json({ message: 'Dentist profile already exists' });
      }

      const newProfile = new DentistProfile({
        dentistId,
        specialization: specialization.trim(),
        experienceYears: exp,
        biography,
        education: educationClean,
        awards: awardsClean
      });

      await newProfile.save();

      return res.status(201).json({
        message: 'Dentist profile created successfully',
        profile: newProfile
      });
    } catch (error) {
      console.error('Error creating dentist profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  getdentistProfileById: async (req, res) => {
    try {
      const { dentistId } = req.params;

      const profile = await DentistProfile.findOne({ dentistId })
        .populate({
          path: 'dentistId',
          model: User,
          select: '-password -__v'
        });

      if (!profile) {
        return res.status(404).json({ message: 'Dentist profile not found' });
      }

      return res.status(200).json({
        message: 'Dentist profile fetched successfully',
        profile
      });
    } catch (error) {
      console.error('Error fetching dentist profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  updateDentistProfileByDentistId: async (req, res) => {
    try {
      const { dentistId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: 'Invalid dentistId' });
      }

      const {
        dentistId: _omit,
        specialization,
        experienceYears,
        biography,
        education,
        awards
      } = req.body;

      const $set = {};

      if (specialization !== undefined) {
        if (typeof specialization !== 'string' || !specialization.trim()) {
          return res.status(400).json({ message: 'specialization must be a non-empty string' });
        }
        if (specialization.trim().length > 100) {
          return res.status(400).json({ message: 'specialization must be <= 100 characters' });
        }
        $set.specialization = specialization.trim();
      }

      if (experienceYears !== undefined) {
        const exp = Number(experienceYears);
        if (!Number.isInteger(exp) || exp < 0 || exp > 80) {
          return res.status(400).json({ message: 'experienceYears must be an integer between 0 and 80' });
        }
        $set.experienceYears = exp;
      }

      if (biography !== undefined) {
        if (typeof biography !== 'string') {
          return res.status(400).json({ message: 'biography must be a string' });
        }
        if (biography.length > 2000) {
          return res.status(400).json({ message: 'biography must be <= 2000 characters' });
        }
        $set.biography = biography;
      }

      if (education !== undefined) {
        if (typeof education !== "string") {
          return res.status(400).json({ message: 'education must be a string' });
        }

        if (education.length > 2000) {
          return res.status(400).json({ message: 'education must be <= 2000 characters' });
        }

        $set.education = education.trim();
      }

      if (awards !== undefined) {
        if (typeof awards !== "string") {
          return res.status(400).json({ message: 'awards must be a string' });
        }

        if (awards.length > 2000) {
          return res.status(400).json({ message: 'awards must be <= 2000 characters' });
        }

        $set.awards = awards.trim();
      }

      if (Object.keys($set).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      const updated = await DentistProfile.findOneAndUpdate(
        { dentistId },
        { $set },
        { new: true }
      )
        .populate({
          path: 'dentistId',
          model: User,
          select: '-password -__v'
        });

      if (!updated) {
        return res.status(404).json({ message: 'Dentist profile not found' });
      }

      return res.status(200).json({
        message: 'Dentist profile updated successfully',
        profile: updated
      });
    } catch (error) {
      console.error('Error updating dentist profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  deleteDentistProfileByDentistId: async (req, res) => {
    try {
      const { dentistId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: 'Invalid dentistId' });
      }

      const deleted = await DentistProfile.findOneAndDelete({ dentistId });
      if (!deleted) {
        return res.status(404).json({ message: 'Dentist profile not found' });
      }

      return res.status(200).json({ message: 'Dentist profile deleted successfully' });
    } catch (error) {
      console.error('Error deleting dentist profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  getAllDentistProfiles: async (req, res) => {
    try {
      const profiles = await DentistProfile.find()
        .populate({
          path: 'dentistId',
          model: User,
          match: { role: 'Dentist' },
          select: '-password -__v'
        });
      return res.status(200).json({
        message: 'Dentist profiles fetched successfully',
        profiles
      });
    } catch (error) {
      console.error('Error fetching dentist profiles:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = dentistProfileController;