const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private (Admin only)
router.post('/register', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        // Create user
        const user = new User({
            name,
            email: email.toLowerCase(),
            password,
            role: role || 'staff',
            department,
            createdBy: req.user._id
        });
        
        await user.save();
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.profile
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        // Find user and include password for comparison
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
        }).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        await user.updateLastLogin();
        
        // Generate JWT token
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role
        };
        
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: user.profile,
                tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('createdBy', 'name email');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                user: {
                    ...user.profile,
                    createdBy: user.createdBy
                }
            }
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, department } = req.body;
        const allowedUpdates = { name, department };
        
        // Remove undefined values
        Object.keys(allowedUpdates).forEach(key => 
            allowedUpdates[key] === undefined && delete allowedUpdates[key]
        );
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            allowedUpdates,
            { new: true, runValidators: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.profile
            }
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile'
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both current and new password'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        
        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/users', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const { role, isActive, page = 1, limit = 10, search } = req.query;
        
        const query = {};
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    ...user.profile,
                    createdBy: user.createdBy
                })),
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
        
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users'
        });
    }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user (Admin only)
// @access  Private (Admin)
router.put('/users/:id', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const { name, email, role, department, isActive } = req.body;
        const userId = req.params.id;
        
        // Don't allow changing admin user's role if it's the last admin
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ 
                role: 'admin', 
                isActive: true,
                _id: { $ne: userId }
            });
            
            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change role of the last admin user'
                });
            }
        }
        
        const allowedUpdates = { name, email, role, department, isActive };
        
        // Remove undefined values
        Object.keys(allowedUpdates).forEach(key => 
            allowedUpdates[key] === undefined && delete allowedUpdates[key]
        );
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            allowedUpdates,
            { new: true, runValidators: true }
        );
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: updatedUser.profile
            }
        });
        
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user'
        });
    }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete('/users/:id', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if this is the last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ 
                role: 'admin', 
                isActive: true,
                _id: { $ne: userId }
            });
            
            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last admin user'
                });
            }
        }
        
        await User.findByIdAndDelete(userId);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user'
        });
    }
});

// @route   GET /api/auth/stats
// @desc    Get user statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const stats = await User.getStatistics();
        
        res.json({
            success: true,
            data: { stats }
        });
        
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching statistics'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
    // In a real-world scenario, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
