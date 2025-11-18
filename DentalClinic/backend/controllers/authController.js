const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const redisClient = require("../config/redisClient");
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
});

const authController = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

            if (!user.isActive) {
                return res.status(403).json({ message: 'Account is inactive. Please contact the administrator.' });
            }

            const token = jwt.sign(
                { userId: user._id, role: user.role, fullName: user.fullName },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            if (user.firstLogin) {
                return res.status(200).json({
                    message: "You need to change your password before continuing.",
                    user: {
                        id: user._id,
                        role: user.role,
                        fullName: user.fullName,
                        firstLogin: user.firstLogin
                    },
                    token
                });
            }

            return res.status(200).json({
                user: {
                    id: user._id,
                    role: user.role,
                    fullName: user.fullName,
                    firstLogin: user.firstLogin
                },
                token
            });

        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ message: 'Server error', error });
        }
    },

    changePasswordFirstLogin: async (req, res) => {
        try {
            const userId = req.user.id
            const { newPassword, confirmNewPassword } = req.body;

            if (!newPassword || !confirmNewPassword) {
                return res.status(400).json({ message: 'Please enter your new password and confirm new password' });
            }

            if (newPassword !== confirmNewPassword) {
                return res.status(400).json({ message: 'Confirm new password does not match' });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

            if (!newPassword || !passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message: 'Password must be at least 8 characters, including lowercase letters, uppercase letters and numbers'
                });
            }

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.firstLogin = false;
            await user.save();

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error("Change password error:", error);
            res.status(500).json({ message: 'Server error', error });
        }
    },

    changePassword: async (req, res) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword, confirmNewPassword } = req.body;

            if (!currentPassword || !newPassword || !confirmNewPassword) {
                return res.status(400).json({ message: 'Please enter your current password, new password and confirm new password' });
            }

            if (newPassword !== confirmNewPassword) {
                return res.status(400).json({ message: 'Confirm new password does not match' });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message: 'New password must be at least 8 characters, including lowercase letters, uppercase letters and numbers'
                });
            }

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Old password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error("Change password error:", error);
            res.status(500).json({ message: 'Server error', error });
        }
    },

    requestOTP: async (req, res) => {
        try {
            const { email } = req.body;

            if(!email){
                return res.status(400).json({message: "Please enter email"})
            }

            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ message: "Email not found" });

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedOTP = await bcrypt.hash(otp, 10);

            await redisClient.set(`otp:${email}`, hashedOTP, { EX: 60 });

            await transporter.sendMail({
                from: `"Gentle Care Dental" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Password Reset OTP",
                text: `Your OTP is: ${otp}. It will expire in 1 minute.`
            });

            res.json({ message: "OTP sent to your email" });
        } catch (error) {
            console.error("Request OTP error:", error);
            res.status(500).json({ message: 'Server error', error });;
        }
    },

    verifyOTP: async (req, res) => {
        try {
            const { email, otp } = req.body;

            if(!otp){
                return res.status(400).json({ message: "Please enter OTP"})
            }

            const storedOTP = await redisClient.get(`otp:${email}`);
            if (!storedOTP) {
                return res.status(400).json({ message: "OTP expired or not found" });
            }

            const isMatch = await bcrypt.compare(otp, storedOTP);
            if (!isMatch) return res.status(400).json({ message: "Invalid OTP" });

            await redisClient.del(`otp:${email}`);

            res.json({ message: "OTP verified, you can reset password now" });
        } catch (error) {
            console.error("Verify OTP error:", error);
            res.status(500).json({ message: 'Server error', error });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { email, newPassword, confirmNewPassword } = req.body;

            if(!newPassword || !confirmNewPassword){
                return res.status(400).json({ message: "Please enter new password and confirm new password"})
            }

            if (newPassword !== confirmNewPassword) {
                return res.status(400).json({ message: 'Confirm new password does not match' });
            }

            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ message: "Email not found" });

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message: 'New password must be at least 8 characters, including lowercase letters, uppercase letters and numbers'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            res.json({ message: "Password reset successfully" });
        } catch (error) {
            console.error("Reset password error:", error);
            res.status(500).json({ message: 'Server error', error });
        }
    },
}

module.exports = authController;