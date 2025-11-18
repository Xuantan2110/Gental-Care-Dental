const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const validateLogin = [
    body('email')
        .notEmpty().withMessage('Email cannot be blank')
        .isEmail().withMessage('Invalid email'),

    body('password')
        .notEmpty().withMessage('Password cannot be blank'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateRegister = [
    body('email')
        .notEmpty().withMessage('Email cannot be blank')
        .isEmail().withMessage('Invalid email')
        .normalizeEmail()
        .custom(async (value) => {
            const existingUser = await User.findOne({ email: value.toLowerCase() });
            if (existingUser) {
                throw new Error('Email already exists');
            }
            return true;
        }),

    body('fullName')
        .notEmpty().withMessage('Full name cannot be blank')
        .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage('Full name can only contain letters and spaces')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Full name cannot be empty');
            }
            return true;
        }),

    body('phoneNumber')
        .notEmpty().withMessage('Phone number cannot be blank')
        .matches(/^0[0-9]{9}$/).withMessage('Phone number must start with 0 and have 10 digits'),

    body('gender')
        .notEmpty().withMessage('Gender cannot be blank')
        .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),

    body('dateOfBirth')
        .notEmpty().withMessage('Date of birth cannot be blank')
        .isISO8601().withMessage('Invalid date of birth')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            if (birthDate > today) {
                throw new Error('Date of birth cannot be in the future');
            }
            return true;
        }),

    body('address')
        .notEmpty().withMessage('Address cannot be blank')
        .isLength({ min: 5, max: 255 }).withMessage('Address must be between 5 and 255 characters')
        .matches(/^[a-zA-Z0-9À-ỹ\s,.-]+$/).withMessage('Address can only contain letters, numbers, spaces, commas, periods, and hyphens')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Address cannot be empty');
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateCreateUser = [
    body('email')
        .notEmpty().withMessage('Email cannot be blank')
        .isEmail().withMessage('Invalid email')
        .normalizeEmail()
        .custom(async (value) => {
            const existingUser = await User.findOne({ email: value.toLowerCase() });
            if (existingUser) {
                throw new Error('Email already exists');
            }
            return true;
        }),

    body('fullName')
        .notEmpty().withMessage('Full name cannot be blank')
        .isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage('Full name can only contain letters and spaces')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Full name cannot be empty');
            }
            return true;
        }),

    body('phoneNumber')
        .notEmpty().withMessage('Phone number cannot be blank')
        .matches(/^0[0-9]{9}$/).withMessage('Phone number must start with 0 and have 10 digits'),

    body('gender')
        .notEmpty().withMessage('Gender cannot be blank')
        .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),

    body('dateOfBirth')
        .notEmpty().withMessage('Date of birth cannot be blank')
        .isISO8601().withMessage('Invalid date of birth')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            if (birthDate > today) {
                throw new Error('Date of birth cannot be in the future');
            }
            return true;
        }),

    body('role')
        .notEmpty().withMessage('Role cannot be blank'),

    body('address')
        .notEmpty().withMessage('Address cannot be blank')
        .isLength({ min: 5, max: 255 }).withMessage('Address must be between 5 and 255 characters')
        .matches(/^[a-zA-Z0-9À-ỹ\s,.-]+$/).withMessage('Address can only contain letters, numbers, spaces, commas, periods, and hyphens')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Address cannot be empty');
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateUpdateProfile = [
    body("email")
        .optional()
        .isEmail().withMessage("Invalid email")
        .normalizeEmail()
        .custom(async (value, { req }) => {
            const existingUser = await User.findOne({ email: value.toLowerCase() });
            if (existingUser && existingUser._id.toString() !== req.user.id) {
                throw new Error("Email already exists");
            }
            return true;
        }),

    body("fullName")
        .optional()
        .isLength({ min: 2, max: 50 }).withMessage("Full name must be between 2 and 50 characters")
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage("Full name can only contain letters and spaces")
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error("Full name cannot be empty");
            }
            return true;
        }),

    body("phoneNumber")
        .optional()
        .matches(/^0[0-9]{9}$/).withMessage("Phone number must start with 0 and have 10 digits"),

    body("gender")
        .optional()
        .isIn(["male", "female", "other"]).withMessage("Invalid gender"),

    body("dateOfBirth")
        .optional()
        .isISO8601().withMessage("Invalid date of birth")
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            if (birthDate > today) {
                throw new Error("Date of birth cannot be in the future");
            }
            return true;
        }),

    body("address")
        .optional()
        .isLength({ min: 5, max: 255 }).withMessage("Address must be between 5 and 255 characters")
        .matches(/^[a-zA-Z0-9À-ỹ\s,.-]+$/).withMessage("Address can only contain letters, numbers, spaces, commas, periods, and hyphens")
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error("Address cannot be empty");
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateCreateService = [
    body('name')
        .notEmpty().withMessage('Name cannot be blank')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Name cannot be empty');
            }
            return true;
        }),

    body('description')
        .notEmpty().withMessage('Description cannot be blank')
        .isLength({ min: 10, max: 10000 }).withMessage('Description must be between 10 and 10000 characters')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Description cannot be empty');
            }
            return true;
        }),

    body('duration')
        .notEmpty().withMessage('Duration cannot be blank')
        .isInt({ min: 15 }).withMessage('Duration must be a positive integer'),

    body('price')
        .notEmpty().withMessage('Price cannot be blank')
        .isFloat({ min: 200000 }).withMessage('Price must be a non-negative number'),

    body('type')
        .notEmpty().withMessage('Type cannot be blank')
        .isIn(['Check-up', 'Treatment', 'Aesthetics', 'Surgery', 'Orthodontics']).withMessage('Invalid service type'),

    body('guarantee')
        .notEmpty().withMessage('Guarantee cannot be blank')
        .isLength({ min: 2, max: 100 }).withMessage('Guarantee must be between 2 and 100 characters')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Guarantee cannot be empty');
            }
            return true;
        }),
    body('isBookingService')
        .notEmpty().withMessage('IsBookingService cannot be blank'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateLogin, validateRegister, validateCreateUser, validateCreateService, validateUpdateProfile };