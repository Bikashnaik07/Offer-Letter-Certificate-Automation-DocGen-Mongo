const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const { roleCheck, anyRole } = require('../middleware/roleCheck');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/templates');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.docx', '.doc', '.html'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Only .docx, .doc, and .html files are allowed'), false);
        }
    }
});

// @route   GET /api/templates
// @desc    Get all templates
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const {
            type,
            isActive = 'true',
            search,
            page = 1,
            limit = 10,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;
        
        const query = {};
        
        // Filter by type if specified
        if (type) query.type = type;
        
        // Filter by active status
        if (isActive !== 'all') {
            query.isActive = isActive === 'true';
        }
        
        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        // Role-based filtering
        if (req.user.role === 'staff') {
            query.isActive = true; // Staff can only see active templates
        }
        
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const templates = await Template.find(query)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Template.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                templates,
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
        console.error('Templates fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching templates'
        });
    }
});

// @route   GET /api/templates/:id
// @desc    Get single template
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const template = await Template.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');
        
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        // Staff users can only view active templates
        if (req.user.role === 'staff' && !template.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to inactive template'
            });
        }
        
        res.json({
            success: true,
            data: { template }
        });
        
    } catch (error) {
        console.error('Template fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching template'
        });
    }
});

// @route   POST /api/templates
// @desc    Create new template
// @access  Private (Admin, HR)
router.post('/', auth, anyRole(['admin', 'hr']), upload.single('templateFile'), async (req, res) => {
    try {
        const {
            name,
            type,
            description,
            content,
            placeholders,
            tags
        } = req.body;
        
        // Validation
        if (!name || !type || !content) {
            return res.status(400).json({
                success: false,
                message: 'Name, type, and content are required'
            });
        }
        
        // Check for duplicate template name
        const existingTemplate = await Template.findOne({ name: name.trim() });
        if (existingTemplate) {
            return res.status(400).json({
                success: false,
                message: 'Template with this name already exists'
            });
        }
        
        const templateData = {
            name: name.trim(),
            type,
            description: description?.trim(),
            content,
            createdBy: req.user._id,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
        };
        
        // Handle file upload
        if (req.file) {
            templateData.fileUrl = `/uploads/templates/${req.file.filename}`;
        }
        
        // Parse placeholders if provided
        if (placeholders) {
            try {
                templateData.placeholders = JSON.parse(placeholders);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid placeholders format'
                });
            }
        }
        
        const template = new Template(templateData);
        await template.save();
        
        // Populate the created template
        await template.populate('createdBy', 'name email');
        
        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: { template }
        });
        
    } catch (error) {
        console.error('Template creation error:', error);
        
        // Clean up uploaded file if template creation fails
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error creating template'
        });
    }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private (Admin, HR)
router.put('/:id', auth, anyRole(['admin', 'hr']), upload.single('templateFile'), async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        // Only admin or template creator can update
        if (req.user.role !== 'admin' && template.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this template'
            });
        }
        
        const {
            name,
            type,
            description,
            content,
            placeholders,
            tags,
            isActive
        } = req.body;
        
        const updateData = {
            updatedBy: req.user._id,
            version: template.version + 1
        };
        
        // Update fields if provided
        if (name) updateData.name = name.trim();
        if (type) updateData.type = type;
        if (description !== undefined) updateData.description = description.trim();
        if (content) updateData.content = content;
        if (isActive !== undefined) updateData.isActive = isActive === 'true';
        
        // Handle tags
        if (tags) {
            updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }
        
        // Handle placeholders
        if (placeholders) {
            try {
                updateData.placeholders = JSON.parse(placeholders);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid placeholders format'
                });
            }
        }
        
        // Handle file upload
        if (req.file) {
            // Delete old file if exists
            if (template.fileUrl) {
                const oldFilePath = path.join(__dirname, '..', template.fileUrl);
                try {
                    fs.unlinkSync(oldFilePath);
                } catch (error) {
                    console.error('Error deleting old file:', error);
                }
            }
            
            updateData.fileUrl = `/uploads/templates/${req.file.filename}`;
        }
        
        const updatedTemplate = await Template.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email').populate('updatedBy', 'name email');
        
        res.json({
            success: true,
            message: 'Template updated successfully',
            data: { template: updatedTemplate }
        });
        
    } catch (error) {
        console.error('Template update error:', error);
        
        // Clean up uploaded file if update fails
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error updating template'
        });
    }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template
// @access  Private (Admin only)
router.delete('/:id', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        // Check if template is being used (has generated documents)
        const GeneratedDoc = require('../models/GeneratedDoc');
        const usageCount = await GeneratedDoc.countDocuments({ templateId: req.params.id });
        
        if (usageCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete template. It has been used to generate ${usageCount} documents. Consider deactivating instead.`,
                usageCount
            });
        }
        
        // Delete associated file
        if (template.fileUrl) {
            const filePath = path.join(__dirname, '..', template.fileUrl);
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error('Error deleting template file:', error);
            }
        }
        
        await Template.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
        
    } catch (error) {
        console.error('Template deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting template'
        });
    }
});

// @route   GET /api/templates/types/list
// @desc    Get available template types
// @access  Private
router.get('/types/list', auth, (req, res) => {
    const templateTypes = [
        {
            value: 'offer_letter',
            label: 'Offer Letter',
            description: 'Job offer letters for new hires'
        },
        {
            value: 'appointment_letter',
            label: 'Appointment Letter',
            description: 'Official appointment confirmation letters'
        },
        {
            value: 'experience_letter',
            label: 'Experience Letter',
            description: 'Work experience certificates'
        },
        {
            value: 'completion_certificate',
            label: 'Completion Certificate',
            description: 'Course or project completion certificates'
        },
        {
            value: 'relieving_letter',
            label: 'Relieving Letter',
            description: 'Employee relieving letters'
        },
        {
            value: 'salary_certificate',
            label: 'Salary Certificate',
            description: 'Salary confirmation certificates'
        }
    ];
    
    res.json({
        success: true,
        data: { templateTypes }
    });
});

// @route   GET /api/templates/stats/overview
// @desc    Get template statistics
// @access  Private (Admin, HR)
router.get('/stats/overview', auth, anyRole(['admin', 'hr']), async (req, res) => {
    try {
        const stats = await Template.getStatistics();
        
        const overview = {
            totalTemplates: await Template.countDocuments(),
            activeTemplates: await Template.countDocuments({ isActive: true }),
            inactiveTemplates: await Template.countDocuments({ isActive: false }),
            byType: stats,
            recentActivity: await Template.find()
                .populate('createdBy', 'name')
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('name type updatedAt createdBy')
        };
        
        res.json({
            success: true,
            data: { stats: overview }
        });
        
    } catch (error) {
        console.error('Template stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching template statistics'
        });
    }
});

// @route   POST /api/templates/:id/clone
// @desc    Clone an existing template
// @access  Private (Admin, HR)
router.post('/:id/clone', auth, anyRole(['admin', 'hr']), async (req, res) => {
    try {
        const originalTemplate = await Template.findById(req.params.id);
        
        if (!originalTemplate) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'New template name is required'
            });
        }
        
        // Check for duplicate name
        const existingTemplate = await Template.findOne({ name: name.trim() });
        if (existingTemplate) {
            return res.status(400).json({
                success: false,
                message: 'Template with this name already exists'
            });
        }
        
        // Create cloned template
        const clonedTemplate = new Template({
            name: name.trim(),
            type: originalTemplate.type,
            description: originalTemplate.description ? `Copy of ${originalTemplate.description}` : '',
            content: originalTemplate.content,
            placeholders: originalTemplate.placeholders,
            tags: [...originalTemplate.tags, 'cloned'],
            createdBy: req.user._id,
            version: 1,
            usageCount: 0
        });
        
        await clonedTemplate.save();
        await clonedTemplate.populate('createdBy', 'name email');
        
        res.status(201).json({
            success: true,
            message: 'Template cloned successfully',
            data: { template: clonedTemplate }
        });
        
    } catch (error) {
        console.error('Template clone error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cloning template'
        });
    }
});

module.exports = router;
