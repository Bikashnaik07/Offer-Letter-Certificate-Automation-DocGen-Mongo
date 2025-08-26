const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'hr', 'staff'],
            message: 'Role must be either admin, hr, or staff'
        },
        default: 'staff',
        lowercase: true
    },
    department: {
        type: String,
        trim: true,
        maxlength: [50, 'Department cannot exceed 50 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's full profile
userSchema.virtual('profile').get(function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        department: this.department,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return this.save({ validateBeforeSave: false });
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
    return this.find({ 
        role: role.toLowerCase(), 
        isActive: true 
    }).select('-password');
};

// Static method to get user statistics
userSchema.statics.getStatistics = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                    }
                }
            }
        }
    ]);
    
    return stats;
};

// Method to check if user has permission for action
userSchema.methods.hasPermission = function(action) {
    const permissions = {
        admin: ['read', 'write', 'delete', 'manage_users', 'manage_templates', 'generate_docs', 'view_audit'],
        hr: ['read', 'write', 'manage_templates', 'generate_docs', 'view_audit'],
        staff: ['read', 'generate_docs']
    };
    
    return permissions[this.role]?.includes(action) || false;
};

// Middleware to prevent deletion of last admin
userSchema.pre('remove', async function(next) {
    if (this.role === 'admin') {
        const adminCount = await this.constructor.countDocuments({ 
            role: 'admin', 
            isActive: true,
            _id: { $ne: this._id }
        });
        
        if (adminCount === 0) {
            return next(new Error('Cannot delete the last admin user'));
        }
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
