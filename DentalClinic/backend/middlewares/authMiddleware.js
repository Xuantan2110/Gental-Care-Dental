const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "You do not have access" });
        }
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "You do not have access" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.firstLogin) {
            if (req.originalUrl !== "/auth/change-password-first-login") {
                return res.status(403).json({ message: "You need to change your password before continuing." });
            }
        } else {
            if (req.originalUrl === "/auth/change-password-first-login") {
                return res.status(403).json({ message: "You changed your password during your first login. This action is not allowed.", });
            }
        }

            if (!user.isActive) {
                return res.status(403).json({ message: "Your account has been deactivated. Please contact admin." });
            }

            req.user = {
                id: user._id.toString(),
                role: user.role,
                fullName: user.fullName,
                email: user.email,
                firstLogin: user.firstLogin
            };

            next();
        } catch (err) {
            console.error("verifyToken error:", err);
            return res.status(403).json({ message: "Invalid or expired token" });
        }
    };

    const verifyAdmin = (req, res, next) => {
        verifyToken(req, res, () => {
            if (req.user && req.user.role === 'Admin') {
                next();
            } else {
                res.status(403).json({ message: "You do not have access" });
            }
        });
    };

    const verifyRole = (allowedRoles) => {
        return (req, res, next) => {
            const { role } = req.user;

            if (!allowedRoles || allowedRoles.length === 0) {
                return res.status(500).json({ message: "No role" });
            }

            if (allowedRoles.includes(role)) {
                return next();
            } else {
                return res.status(403).json({ message: "You do not have access" });
            }
        };
    };


    module.exports = { verifyToken, verifyAdmin, verifyRole };