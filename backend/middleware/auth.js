const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        
        // Find user by ID from token payload
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is valid but user no longer exists'
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account has been deactivated'
            });
        }
        
        // Attach user to request object
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

module.exports = auth;
