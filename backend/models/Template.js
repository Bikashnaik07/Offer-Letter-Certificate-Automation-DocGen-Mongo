const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Template name is required'],
        trim: true,
        maxlength: [100, 'Template name cannot exceed 100 characters']
    },
    type: {
        type: String,
        required: [true, 'Template type is required'],
        enum: {
            values: ['offer_letter', 'appointment_letter', 'experience_letter', 'completion_certificate', 'relieving_letter', 'salary_certificate'],
            message: 'Invalid template type'
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    content: {
        type: String,
        required: [true, 'Template content is required']
    },
    placeholders: [{
        key: {
            type: String,
            required: true,
            trim: true
        },
        label: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['text', 'number', 'date', 'email'],
            default: 'text'
        },
        required: {
            type: Boolean,
            default: true
        },
        defaultValue: {
            type: String,
            trim: true
        }
    }],
    fileUrl: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    version: {
        type: Number,
        default: 1
    },
    usageCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
templateSchema.index({ type: 1 });
templateSchema.index({ isActive: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ name: 'text', description: 'text' });

// Virtual for template summary
templateSchema.virtual('summary').get(function() {
    return {
        id: this._id,
        name: this.name,
        type: this.type,
        description: this.description,
        placeholders: this.placeholders.length,
        isActive: this.isActive,
        usageCount: this.usageCount,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
});

// Pre-save middleware to extract placeholders from content
templateSchema.pre('save', function(next) {
    // Extract placeholders from content using regex
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const matches = [...this.content.matchAll(placeholderRegex)];
    
    // Get unique placeholder keys
    const foundPlaceholders = [...new Set(matches.map(match => match[1]))];
    
    // If this is a new document or placeholders have changed, update them
    if (this.isNew || this.isModified('content')) {
        // Preserve existing placeholder configurations
        const existingPlaceholders = this.placeholders || [];
        const existingKeys = existingPlaceholders.map(p => p.key);
        
        // Add new placeholders that weren't configured before
        foundPlaceholders.forEach(key => {
            if (!existingKeys.includes(key)) {
                this.placeholders.push({
                    key,
                    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    type: key.includes('date') ? 'date' : 
                          key.includes('email') ? 'email' : 
                          key.includes('salary') || key.includes('amount') ? 'number' : 'text',
                    required: true
                });
            }
        });
        
        // Remove placeholders that are no longer in the content
        this.placeholders = this.placeholders.filter(p => foundPlaceholders.includes(p.key));
    }
    
    next();
});

// Instance method to increment usage count
templateSchema.methods.incrementUsage = async function() {
    this.usageCount += 1;
    return this.save({ validateBeforeSave: false });
};

// Instance method to get required placeholders
templateSchema.methods.getRequiredPlaceholders = function() {
    return this.placeholders.filter(p => p.required);
};

// Instance method to validate placeholder data
templateSchema.methods.validatePlaceholderData = function(data) {
    const errors = [];
    const requiredPlaceholders = this.getRequiredPlaceholders();
    
    requiredPlaceholders.forEach(placeholder => {
        if (!data[placeholder.key] || data[placeholder.key].toString().trim() === '') {
            errors.push(`${placeholder.label} is required`);
        }
        
        // Type validation
        if (data[placeholder.key]) {
            switch (placeholder.type) {
                case 'email':
                    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
                    if (!emailRegex.test(data[placeholder.key])) {
                        errors.push(`${placeholder.label} must be a valid email`);
                    }
                    break;
                case 'number':
                    if (isNaN(data[placeholder.key])) {
                        errors.push(`${placeholder.label} must be a number`);
                    }
                    break;
                case 'date':
                    if (isNaN(Date.parse(data[placeholder.key]))) {
                        errors.push(`${placeholder.label} must be a valid date`);
                    }
                    break;
            }
        }
    });
    
    return errors;
};

// Instance method to replace placeholders in content
templateSchema.methods.replacePlaceholders = function(data) {
    let processedContent = this.content;
    
    // Replace each placeholder with provided data
    this.placeholders.forEach(placeholder => {
        const regex = new RegExp(`\\{\\{${placeholder.key}\\}\\}`, 'g');
        let value = data[placeholder.key] || placeholder.defaultValue || '';
        
        // Format based on type
        if (value) {
            switch (placeholder.type) {
                case 'date':
                    value = new Date(value).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    break;
                case 'number':
                    if (placeholder.key.includes('salary') || placeholder.key.includes('amount')) {
                        value = new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR'
                        }).format(value);
                    }
                    break;
            }
        }
        
        processedContent = processedContent.replace(regex, value);
    });
    
    return processedContent;
};

// Static method to get templates by type
templateSchema.statics.findByType = function(type, isActive = true) {
    return this.find({ 
        type: type, 
        isActive: isActive 
    }).populate('createdBy', 'name email');
};

// Static method to get template statistics
templateSchema.statics.getStatistics = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                    }
                },
                totalUsage: { $sum: '$usageCount' }
            }
        },
        {
            $sort: { totalUsage: -1 }
        }
    ]);
    
    return stats;
};

// Static method for search functionality
templateSchema.statics.search = function(query, options = {}) {
    const {
        type,
        isActive = true,
        createdBy,
        tags,
        page = 1,
        limit = 10
    } = options;
    
    const searchCriteria = {
        isActive,
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    
    if (type) searchCriteria.type = type;
    if (createdBy) searchCriteria.createdBy = createdBy;
    if (tags && tags.length > 0) searchCriteria.tags = { $in: tags };
    
    return this.find(searchCriteria)
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
};

module.exports = mongoose.model('Template', templateSchema);
