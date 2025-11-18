const User = require('../models/User');
const DentistProfile = require('../models/DentistProfile');
const DentistWorkingTime = require('../models/DentistWorkingTime');
const MedicalRecord = require('../models/MedicalRecord')
const bcrypt = require('bcrypt');
const { get } = require('mongoose');
require('dotenv').config();
const nodemailer = require('nodemailer');
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
});

const userController = {
    register: async (req, res) => {
        try {
            const { email, fullName, phoneNumber, gender, dateOfBirth, address, avatar } = req.body;

            const randomDigits = Math.floor(10000 + Math.random() * 90000);
            const base = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
            const generatedPassword = `${base}${randomDigits}`;

            const hashed = await bcrypt.hash(generatedPassword, 10);
            const newUser = new User({ email, fullName, phoneNumber, gender, dateOfBirth, address, avatar, role: "Customer", password: hashed });
            await newUser.save();
            const mailOptions = {
                from: `"Gentle Care Dental" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Welcome to Our Service - Your Account Information',
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f6f9; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

                        <!-- Header -->
                        <div style="background-color: #0077cc; color: white; padding: 40px 20px; text-align: center;">
                        <h2 style="margin: 0;">Welcome to Gentle Care Dental</h2>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>${fullName}</strong>,</p>
                        <p>Thank you for registering with Gentle Care Dental! Below are your login details:</p>

                        <table style="width: 100%; margin: 20px 0;">
                            <tr>
                            <td style="padding: 8px 0;"><strong>Email:</strong></td>
                            <td>${email}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Password:</strong></td>
                            <td style="color: #d9534f;">${generatedPassword}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">Please log in and change your password after your first login for security.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f0f0f0; color: #777; text-align: center; padding: 15px; font-size: 13px;">
                        &copy; 2025 Gentle Care Dental. All rights reserved.<br/>
                        Ha Noi, Viet Nam
                        </div>
                    </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            res.status(201).json({ message: 'User registered successfully', user: newUser });
        } catch (err) {
            console.error("Registration error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    createUser: async (req, res) => {
        try {
            const { email, fullName, phoneNumber, gender, dateOfBirth, address, avatar, role } = req.body;

            const randomDigits = Math.floor(10000 + Math.random() * 90000);
            const base = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
            const generatedPassword = `${base}${randomDigits}`;

            const hashed = await bcrypt.hash(generatedPassword, 10);
            const newUser = new User({ email, fullName, phoneNumber, gender, dateOfBirth, address, avatar, role, password: hashed });
            await newUser.save();
            const mailOptions = {
                from: `"Gentle Care Dental" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Welcome to Our Service - Your Account Information',
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f6f9; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

                        <!-- Header -->
                        <div style="background-color: #0077cc; color: white; padding: 40px 20px; text-align: center;">
                        <h2 style="margin: 0;">Welcome to Gentle Care Dental</h2>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>${fullName}</strong>,</p>
                        <p>Thank you for registering with Gentle Care Dental! Below are your login details:</p>

                        <table style="width: 100%; margin: 20px 0;">
                            <tr>
                            <td style="padding: 8px 0;"><strong>Email:</strong></td>
                            <td>${email}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Password:</strong></td>
                            <td style="color: #d9534f;">${generatedPassword}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">Please log in and change your password after your first login for security.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f0f0f0; color: #777; text-align: center; padding: 15px; font-size: 13px;">
                        &copy; 2025 Gentle Care Dental. All rights reserved.<br/>
                        Ha Noi, Viet Nam
                        </div>
                    </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            res.status(201).json({ message: 'User registered successfully', user: newUser });
        } catch (err) {
            console.error("Registration error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await User.find().select('-password');

            if (!users) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'Users fetched successfully', users });
        } catch (err) {
            console.error("Error fetching users:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedUser = await User.findByIdAndDelete(id);

            if (!deletedUser) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'User deleted successfully' });
        } catch (err) {
            console.error("Error deleting user:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    toggleStatus: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (req.user.id === id) {
                return res.status(400).json({ message: "You cannot deactivate your own account" });
            }

            user.isActive = !user.isActive;
            await user.save();

            return res.status(200).json({
                message: user.isActive ? "Account activated successfully" : "Account deactivated successfully",
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive
                }
            });
        } catch (error) {
            console.error("toggleActive error:", error);
            res.status(500).json({ message: "Server error", error });
        }
    },

    getUserById: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findById(id).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            let extraInfo = null;
            let workingTime = null;

            if (user.role === 'Dentist') {
                extraInfo = await DentistProfile.findOne({ dentistId: id });

                workingTime = await DentistWorkingTime.findOne({
                    dentistId: id,
                    isFixed: true
                }).select('workingDays morning afternoon');
            }

            res.status(200).json({
                message: 'User fetched successfully',
                user,
                extraInfo,
                workingTime
            });
        } catch (err) {
            console.error("Error fetching user:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },


    getProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ message: 'Profile fetched successfully', user });
        } catch (err) {
            console.error("Error fetching profile:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { email, fullName, phoneNumber, gender, dateOfBirth, address } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.email = email || user.email;
            user.fullName = fullName || user.fullName;
            user.phoneNumber = phoneNumber || user.phoneNumber;
            user.gender = gender || user.gender;
            user.dateOfBirth = dateOfBirth || user.dateOfBirth;
            user.address = address || user.address;

            await user.save();
            res.status(200).json({ message: 'Profile updated successfully', user });
        } catch (err) {
            console.error("Error updating profile:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    updatePhoto: async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            let imageUrl = user.avatar;
            if (req.file) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: "user_avatars", resource_type: "image" },
                        (err, result) => (err ? reject(err) : resolve(result))
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
                imageUrl = result.secure_url;
            }

            user.avatar = imageUrl;
            await user.save();

            res.status(200).json({
                message: "Photo updated successfully",
                avatar: user.avatar,
            });
        } catch (error) {
            console.error("Failed to update photo:", error);
            res.status(500).json({
                message: "An error occurred while updating the photo",
                error,
            });
        }
    },

    getAllDentists: async (req, res) => {
        try {
            const dentists = await User.find({ role: 'Dentist' }).select('-password');

            if (!dentists || dentists.length === 0) {
                return res.status(404).json({ message: 'No dentists found' });
            }

            res.status(200).json({
                message: 'Dentists fetched successfully',
                dentists
            });
        } catch (err) {
            console.error("Error fetching dentists:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    getAllCustomers: async (req, res) => {
        try {
            const customers = await User.find({ role: 'Customer' }).select('-password');

            if (!customers || customers.length === 0) {
                return res.status(404).json({ message: 'No customers found' });
            }

            res.status(200).json({
                message: 'Customers fetched successfully',
                customers
            });
        } catch (err) {
            console.error("Error fetching customers:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },
}

module.exports = userController;