const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const Template = require('../models/Template');
const GeneratedDoc = require('../models/GeneratedDoc');
const auth = require('../middleware/auth');
const { anyRole, roleCheck } = require('../middleware/roleCheck');
const { generatePDF } = require('../utils/pdfGenerator');
const { generateDOCX } = require('../utils/docxGenerator');
const { sendEmail } = require('../utils/emailService');

const router = express.Router();

// Configure multer for CSV/Excel uploads
const upload = multer({
    dest: 'uploads/bulk/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'), false);
        }
    }
});

// @route   POST /api/documents/generate-single
// @desc    Generate single document
// @access  Private
router.post('/generate-single', auth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { templateId, data, format = 'pdf', sendEmail: shouldSendEmail = false } = req.body;
        
        // Validation
        if (!templateId || !data || !format) {
            return res.status(400).json({
                success: false,
                message: 'Template ID, data, and format are required'
            });
        }
        
        if (!['pdf', 'docx'].includes(format.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Format must be either PDF or DOCX'
            });
        }
        
        // Get template
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        if (!template.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot use inactive template'
            });
        }
        
        // Validate placeholder data
        const validationErrors = template.validatePlaceholderData(data);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Create document record
        const generatedDoc = new GeneratedDoc({
            templateId: template._id,
            templateName: template.name,
            templateType: template.type,
            recipientData: data,
            generatedBy: req.user._id,
            generationType: 'single',
            outputFormat: format.toLowerCase(),
            fileName: '', // Will be set after generation
            filePath: '',
            metadata: {
                generationTime: 0,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
        
        await generatedDoc.save();
        
        try {
            // Generate document based on format
            let filePath, fileName, fileSize;
            
            if (format.toLowerCase() === 'pdf') {
                const result = await generatePDF(template, data, generatedDoc.documentId);
                filePath = result.filePath;
                fileName = result.fileName;
                fileSize = result.fileSize;
            } else {
                const result = await generateDOCX(template, data, generatedDoc.documentId);
                filePath = result.filePath;
                fileName = result.fileName;
                fileSize = result.fileSize;
            }
            
            // Update document record with file info
            const generationTime = Date.now() - startTime;
            await generatedDoc.markAsCompleted(filePath, fileName, fileSize);
            generatedDoc.metadata.generationTime = generationTime;
            await generatedDoc.save();
            
            // Increment template usage count
            await template.incrementUsage();
            
            // Send email if requested
            if (shouldSendEmail && data.email) {
                try {
                    await sendEmail({
                        to: data.email,
                        subject: `Your ${template.name}`,
                        template: 'document-ready',
                        data: {
                            recipientName: data.name || 'Recipient',
                            documentType: template.name,
                            downloadUrl: `${req.protocol}://${req.get('host')}/api/documents/download/${generatedDoc._id}`
                        },
                        attachments: [{
                            filename: fileName,
                            path: filePath
                        }]
                    });
                    
                    await generatedDoc.markEmailSent(data.email);
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);
                    // Continue without failing the request
                }
            }
            
            res.json({
                success: true,
                message: 'Document generated successfully',
                data: {
                    document: {
                        id: generatedDoc._id,
                        documentId: generatedDoc.documentId,
                        fileName,
                        format: format.toLowerCase(),
                        downloadUrl: `/api/documents/download/${generatedDoc._id}`,
                        fileSize,
                        generationTime,
                        emailSent: generatedDoc.emailSent
                    }
                }
            });
            
        } catch (generationError) {
            console.error('Document generation failed:', generationError);
            
            // Mark document as failed
            await generatedDoc.markAsFailed(generationError.message);
            
            res.status(500).json({
                success: false,
                message: 'Document generation failed',
                error: generationError.message
            });
        }
        
    } catch (error) {
        console.error('Single document generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during document generation'
        });
    }
});

// @route   POST /api/documents/generate-bulk
// @desc    Generate documents in bulk from CSV/Excel
// @access  Private (Admin, HR)
router.post('/generate-bulk', auth, anyRole(['admin', 'hr']), upload.single('dataFile'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { templateId, format = 'pdf', columnMapping } = req.body;
        
        if (!templateId || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Template ID and data file are required'
            });
        }
        
        // Get template
        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        if (!template.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot use inactive template'
            });
        }
        
        // Parse column mapping
        let mapping = {};
        if (columnMapping) {
            try {
                mapping = JSON.parse(columnMapping);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid column mapping format'
                });
            }
        }
        
        // Parse data file
        let records = [];
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        
        try {
            if (fileExt === '.csv') {
                records = await parseCsvFile(req.file.path);
            } else if (['.xlsx', '.xls'].includes(fileExt)) {
                records = await parseExcelFile(req.file.path);
            }
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to parse data file',
                error: parseError.message
            });
        }
        
        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid data found in file'
            });
        }
        
        if (records.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 500 records allowed in bulk generation'
            });
        }
        
        // Generate batch ID for grouping documents
        const batchId = `BATCH-${Date.now()}-${uuidv4().substr(0, 8)}`;
        
        // Process records and generate documents
        const results = {
            batchId,
            total: records.length,
            successful: 0,
            failed: 0,
            documents: [],
            errors: []
        };
        
        // Start bulk generation
        res.json({
            success: true,
            message: 'Bulk generation started',
            data: {
                batchId,
                total: records.length,
                status: 'processing'
            }
        });
        
        // Process in background
        processBulkGeneration(template, records, mapping, format, req.user._id, batchId, req);
        
    } catch (error) {
        console.error('Bulk generation error:', error);
        
        // Clean up uploaded file
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during bulk generation'
        });
    }
});

// Background function to process bulk generation
async function processBulkGeneration(template, records, mapping, format, userId, batchId, req) {
    const results = {
        successful: 0,
        failed: 0,
        documents: []
    };
    
    for (let i = 0; i < records.length; i++) {
        try {
            const record = records[i];
            
            // Map columns to placeholders
            const mappedData = {};
            if (Object.keys(mapping).length > 0) {
                Object.keys(mapping).forEach(placeholder => {
                    const column = mapping[placeholder];
                    mappedData[placeholder] = record[column] || '';
                });
            } else {
                // Auto-map if no mapping provided
                template.placeholders.forEach(placeholder => {
                    mappedData[placeholder.key] = record[placeholder.key] || record[placeholder.label] || '';
                });
            }
            
            // Validate data
            const validationErrors = template.validatePlaceholderData(mappedData);
            if (validationErrors.length > 0) {
                results.failed++;
                continue;
            }
            
            // Create document record
            const generatedDoc = new GeneratedDoc({
                templateId: template._id,
                templateName: template.name,
                templateType: template.type,
                recipientData: mappedData,
                generatedBy: userId,
                generationType: 'bulk',
                batchId,
                outputFormat: format.toLowerCase(),
                fileName: '',
                filePath: '',
                metadata: {
                    batchIndex: i + 1,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            await generatedDoc.save();
            
            // Generate document
            let filePath, fileName, fileSize;
            
            if (format.toLowerCase() === 'pdf') {
                const result = await generatePDF(template, mappedData, generatedDoc.documentId);
                filePath = result.filePath;
                fileName = result.fileName;
                fileSize = result.fileSize;
            } else {
                const result = await generateDOCX(template, mappedData, generatedDoc.documentId);
                filePath = result.filePath;
                fileName = result.fileName;
                fileSize = result.fileSize;
            }
            
            // Update document record
            await generatedDoc.markAsCompleted(filePath, fileName, fileSize);
            
            results.successful++;
            results.documents.push({
                id: generatedDoc._id,
                documentId: generatedDoc.documentId,
                fileName,
                recipientName: mappedData.name || 'Unknown'
            });
            
        } catch (error) {
            console.error(`Error generating document ${i + 1}:`, error);
            results.failed++;
        }
    }
    
    // Update template usage count
    await template.incrementUsage(results.successful);
    
    console.log(`Bulk generation completed: ${results.successful} successful, ${results.failed} failed`);
}

// Helper function to parse CSV file
function parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        const records = [];
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                // Clean up keys (remove extra spaces)
                const cleanData = {};
                Object.keys(data).forEach(key => {
                    cleanData[key.trim()] = data[key];
                });
                records.push(cleanData);
            })
            .on('end', () => {
                // Clean up file
                fs.unlinkSync(filePath);
                resolve(records);
            })
            .on('error', (error) => {
                // Clean up file
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
                reject(error);
            });
    });
}

// Helper function to parse Excel file
function parseExcelFile(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const records = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
            
            // Clean up file
            fs.unlinkSync(filePath);
            
            resolve(records);
        } catch (error) {
            // Clean up file
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
            reject(error);
        }
    });
}

// @route   GET /api/documents/batch/:batchId
// @desc    Get bulk generation status
// @access  Private
router.get('/batch/:batchId', auth, async (req, res) => {
    try {
        const { batchId } = req.params;
        
        const documents = await GeneratedDoc.findByBatch(batchId);
        
        if (documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }
        
        // Check if user has access to this batch
        const firstDoc = documents[0];
        if (req.user.role !== 'admin' && firstDoc.generatedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this batch'
            });
        }
        
        const stats = {
            batchId,
            total: documents.length,
            completed: documents.filter(d => d.status === 'completed').length,
            failed: documents.filter(d => d.status === 'failed').length,
            processing: documents.filter(d => d.status === 'generating').length
        };
        
        res.json({
            success: true,
            data: {
                stats,
                documents: documents.map(doc => doc.summary)
            }
        });
        
    } catch (error) {
        console.error('Batch status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching batch status'
        });
    }
});

// @route   GET /api/documents/download/:id
// @desc    Download generated document
// @access  Private
router.get('/download/:id', auth, async (req, res) => {
    try {
        const document = await GeneratedDoc.findById(req.params.id)
            .populate('generatedBy', 'name email role');
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Check access permissions
        const canAccess = req.user.role === 'admin' || 
                         document.generatedBy._id.toString() === req.user._id.toString();
        
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this document'
            });
        }
        
        if (document.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Document is not ready for download',
                status: document.status
            });
        }
        
        const filePath = path.join(__dirname, '..', document.filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found'
            });
        }
        
        // Record download
        await document.recordDownload();
        
        // Set appropriate headers
        const mimeType = document.outputFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.setHeader('Content-Length', document.fileSize);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Document download error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error downloading document'
        });
    }
});

// @route   GET /api/documents/audit
// @desc    Get audit trail
// @access  Private
router.get('/audit', auth, async (req, res) => {
    try {
        const {
            templateId,
            templateType,
            status,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20
        } = req.query;
        
        const options = {
            templateId,
            templateType,
            status,
            dateFrom,
            dateTo,
            page: parseInt(page),
            limit: parseInt(limit)
        };
        
        // Role-based filtering
        if (req.user.role !== 'admin') {
            options.userId = req.user._id;
        }
        
        const auditTrail = await GeneratedDoc.getAuditTrail(options);
        const total = await GeneratedDoc.countDocuments(
            req.user.role === 'admin' ? {} : { generatedBy: req.user._id }
        );
        
        res.json({
            success: true,
            data: {
                audit: auditTrail,
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
        console.error('Audit trail error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching audit trail'
        });
    }
});

// @route   GET /api/documents/stats
// @desc    Get document generation statistics
// @access  Private (Admin, HR)
router.get('/stats', auth, anyRole(['admin', 'hr']), async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        
        const options = { dateFrom, dateTo };
        
        // Role-based filtering
        if (req.user.role === 'hr') {
            options.userId = req.user._id;
        }
        
        const stats = await GeneratedDoc.getStatistics(options);
        
        res.json({
            success: true,
            data: { stats }
        });
        
    } catch (error) {
        console.error('Document stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching statistics'
        });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Delete generated document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const document = await GeneratedDoc.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Check permissions
        const canDelete = req.user.role === 'admin' || 
                         document.generatedBy.toString() === req.user._id.toString();
        
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this document'
            });
        }
        
        // Delete file if exists
        if (document.filePath) {
            const filePath = path.join(__dirname, '..', document.filePath);
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error('Error deleting document file:', error);
            }
        }
        
        await GeneratedDoc.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
        
    } catch (error) {
        console.error('Document deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting document'
        });
    }
});

// @route   POST /api/documents/:id/resend-email
// @desc    Resend document via email
// @access  Private
router.post('/:id/resend-email', auth, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }
        
        const document = await GeneratedDoc.findById(req.params.id)
            .populate('templateId', 'name')
            .populate('generatedBy', 'name email');
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Check permissions
        const canResend = req.user.role === 'admin' || 
                         document.generatedBy._id.toString() === req.user._id.toString();
        
        if (!canResend) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to resend this document'
            });
        }
        
        if (document.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Document is not ready to be sent'
            });
        }
        
        const filePath = path.join(__dirname, '..', document.filePath);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found'
            });
        }
        
        // Send email
        await sendEmail({
            to: email,
            subject: `Your ${document.templateId.name}`,
            template: 'document-resend',
            data: {
                recipientName: document.recipientData.name || 'Recipient',
                documentType: document.templateId.name,
                senderName: req.user.name
            },
            attachments: [{
                filename: document.fileName,
                path: filePath
            }]
        });
        
        // Update document record
        await document.markEmailSent(email);
        
        res.json({
            success: true,
            message: 'Document sent successfully via email'
        });
        
    } catch (error) {
        console.error('Email resend error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error sending email'
        });
    }
});

// @route   GET /api/documents/cleanup
// @desc    Cleanup old documents (Admin only)
// @access  Private (Admin)
router.delete('/cleanup/old', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const deletedCount = await GeneratedDoc.cleanup(parseInt(days));
        
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} old documents`,
            deletedCount
        });
        
    } catch (error) {
        console.error('Document cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during cleanup'
        });
    }
});

module.exports = router;
