// Frontend JavaScript for DocGen Mongo
class DocGenApp {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuth();
    }
    
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('[data-section]').dataset.section;
                this.showSection(section);
            });
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        // Template form
        document.getElementById('saveTemplate').addEventListener('click', () => {
            this.handleSaveTemplate();
        });
        
        // Single document form
        document.getElementById('singleDocForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSingleDocGeneration();
        });
        
        // Bulk generation form
        document.getElementById('bulkGenerationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBulkGeneration();
        });
        
        // Template selection change
        document.getElementById('singleTemplate').addEventListener('change', (e) => {
            this.handleTemplateSelection(e.target.value);
        });
        
        document.getElementById('bulkTemplate').addEventListener('change', (e) => {
            this.handleBulkTemplateSelection(e.target.value);
        });
        
        // File upload change
        document.getElementById('bulkDataFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        // Email checkbox toggles
        document.getElementById('sendEmail').addEventListener('change', (e) => {
            document.getElementById('recipientEmail').style.display = 
                e.target.checked ? 'block' : 'none';
        });
        
        document.getElementById('bulkSendEmail').addEventListener('change', (e) => {
            document.getElementById('bulkRecipientEmail').style.display = 
                e.target.checked ? 'block' : 'none';
        });
        
        // Refresh audit
        document.getElementById('refreshAudit').addEventListener('click', () => {
            this.loadAuditTrail();
        });
    }
    
    checkAuth() {
        if (this.token) {
            this.validateToken();
        } else {
            this.showLogin();
        }
    }
    
    async validateToken() {
        try {
            const response = await fetch(`${this.apiBase}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                this.showMainApp();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.showLogin();
        }
    }
    
    showLogin() {
        document.getElementById('mainApp').style.display = 'none';
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }
    
    showMainApp() {
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userInfo').textContent = this.currentUser.name;
        document.getElementById('userRole').textContent = this.currentUser.role;
        
        // Hide login modal if showing
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        // Load initial data
        this.loadDashboard();
        this.loadTemplates();
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = data.user;
                this.showMainApp();
                this.showAlert('Login successful!', 'success');
            } else {
                this.showAlert(data.message || 'Login failed', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Login failed. Please try again.', 'danger');
        }
    }
    
    handleLogout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.showLogin();
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        document.getElementById(sectionName).classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'templates':
                this.loadTemplates();
                break;
            case 'generate-single':
                this.loadTemplateOptions();
                break;
            case 'generate-bulk':
                this.loadBulkTemplateOptions();
                break;
            case 'audit':
                this.loadAuditTrail();
                break;
        }
    }
    
    async loadDashboard() {
        try {
            const response = await fetch(`${this.apiBase}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalTemplates').textContent = stats.totalTemplates || 0;
                document.getElementById('totalGenerated').textContent = stats.totalGenerated || 0;
                document.getElementById('todayGenerated').textContent = stats.todayGenerated || 0;
                document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
                
                // Load recent activity
                this.loadRecentActivity();
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }
    
    async loadRecentActivity() {
        try {
            const response = await fetch(`${this.apiBase}/documents/recent`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const activities = await response.json();
                const activityContainer = document.getElementById('recentActivity');
                
                if (activities.length === 0) {
                    activityContainer.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-3x mb-3"></i>
                            <p>No recent activity</p>
                        </div>
                    `;
                } else {
                    activityContainer.innerHTML = activities.map(activity => `
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                                <strong>${activity.templateName}</strong>
                                <br><small class="text-muted">Generated by ${activity.generatedBy}</small>
                            </div>
                            <small class="text-muted">${new Date(activity.generatedAt).toLocaleDateString()}</small>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }
    
    async loadTemplates() {
        try {
            const response = await fetch(`${this.apiBase}/templates`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const templates = await response.json();
                const tableContainer = document.getElementById('templatesTable');
                
                if (templates.length === 0) {
                    tableContainer.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-file-code fa-3x mb-3"></i>
                            <p>No templates found</p>
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#templateModal">
                                <i class="fas fa-plus me-2"></i>Create First Template
                            </button>
                        </div>
                    `;
                } else {
                    tableContainer.innerHTML = `
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${templates.map(template => `
                                        <tr>
                                            <td>
                                                <strong>${template.name}</strong>
                                                ${template.description ? `<br><small class="text-muted">${template.description}</small>` : ''}
                                            </td>
                                            <td><span class="badge bg-secondary">${template.type}</span></td>
                                            <td>${new Date(template.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1" onclick="app.editTemplate('${template._id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" onclick="app.deleteTemplate('${template._id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showAlert('Failed to load templates', 'danger');
        }
    }
    
    async handleSaveTemplate() {
        const name = document.getElementById('templateName').value;
        const type = document.getElementById('templateType').value;
        const content = document.getElementById('templateContent').value;
        const description = document.getElementById('templateDescription').value;
        
        if (!name || !type || !content) {
            this.showAlert('Please fill in all required fields', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/templates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, type, content, description })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert('Template saved successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('templateModal'));
                modal.hide();
                
                // Clear form
                document.getElementById('templateForm').reset();
                
                // Reload templates
                this.loadTemplates();
                this.loadTemplateOptions();
                this.loadBulkTemplateOptions();
            } else {
                this.showAlert(result.message || 'Failed to save template', 'danger');
            }
        } catch (error) {
            console.error('Save template error:', error);
            this.showAlert('Failed to save template', 'danger');
        }
    }
    
    async loadTemplateOptions() {
        try {
            const response = await fetch(`${this.apiBase}/templates`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const templates = await response.json();
                const select = document.getElementById('singleTemplate');
                
                select.innerHTML = '<option value="">Select Template</option>';
                templates.forEach(template => {
                    select.innerHTML += `<option value="${template._id}">${template.name}</option>`;
                });
            }
        } catch (error) {
            console.error('Failed to load template options:', error);
        }
    }
    
    async loadBulkTemplateOptions() {
        try {
            const response = await fetch(`${this.apiBase}/templates`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const templates = await response.json();
                const select = document.getElementById('bulkTemplate');
                
                select.innerHTML = '<option value="">Select Template</option>';
                templates.forEach(template => {
                    select.innerHTML += `<option value="${template._id}">${template.name}</option>`;
                });
            }
        } catch (error) {
            console.error('Failed to load bulk template options:', error);
        }
    }
    
    async handleTemplateSelection(templateId) {
        if (!templateId) {
            document.getElementById('templatePreview').innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-eye fa-3x mb-3"></i>
                    <p>Select a template to see preview</p>
                </div>
            `;
            document.getElementById('singleDocFields').innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const template = await response.json();
                
                // Show template preview
                const previewContent = template.content.replace(
                    /{{(\w+)}}/g, 
                    '<span class="placeholder-tag">{{$1}}</span>'
                );
                document.getElementById('templatePreview').innerHTML = previewContent;
                
                // Generate form fields based on placeholders
                const placeholders = template.content.match(/{{(\w+)}}/g);
                const fieldsContainer = document.getElementById('singleDocFields');
                
                if (placeholders) {
                    const uniquePlaceholders = [...new Set(placeholders.map(p => p.replace(/[{}]/g, '')))];
                    fieldsContainer.innerHTML = uniquePlaceholders.map(field => `
                        <div class="mb-3">
                            <label class="form-label">${this.formatFieldLabel(field)}</label>
                            <input type="text" class="form-control" name="${field}" 
                                   placeholder="Enter ${field}" required>
                        </div>
                    `).join('');
                } else {
                    fieldsContainer.innerHTML = '<p class="text-muted">No placeholders found in template</p>';
                }
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            this.showAlert('Failed to load template', 'danger');
        }
    }
    
    async handleBulkTemplateSelection(templateId) {
        if (!templateId) {
            document.getElementById('columnMapping').style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const template = await response.json();
                this.currentTemplate = template;
                
                // If file is already uploaded, show mapping
                const fileInput = document.getElementById('bulkDataFile');
                if (fileInput.files.length > 0) {
                    this.showColumnMapping();
                }
            }
        } catch (error) {
            console.error('Failed to load bulk template:', error);
        }
    }
    
    async handleFileUpload(file) {
        if (!file) return;
        
        if (!this.currentTemplate) {
            this.showAlert('Please select a template first', 'warning');
            return;
        }
        
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showAlert('Please upload a CSV or Excel file', 'warning');
            return;
        }
        
        this.uploadedFile = file;
        this.showColumnMapping();
    }
    
    showColumnMapping() {
        if (!this.currentTemplate || !this.uploadedFile) return;
        
        // Extract placeholders from template
        const placeholders = this.currentTemplate.content.match(/{{(\w+)}}/g);
        if (!placeholders) {
            this.showAlert('No placeholders found in template', 'warning');
            return;
        }
        
        const uniquePlaceholders = [...new Set(placeholders.map(p => p.replace(/[{}]/g, '')))];
        
        // For demo purposes, assume common column names
        const sampleColumns = ['name', 'role', 'company', 'date', 'joining_date', 'salary', 'email'];
        
        const mappingContainer = document.getElementById('mappingFields');
        mappingContainer.innerHTML = uniquePlaceholders.map(placeholder => `
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label small">${this.formatFieldLabel(placeholder)}</label>
                </div>
                <div class="col-md-6">
                    <select class="form-select form-select-sm" name="mapping_${placeholder}" required>
                        <option value="">Select Column</option>
                        ${sampleColumns.map(col => `
                            <option value="${col}" ${col === placeholder ? 'selected' : ''}>${col}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `).join('');
        
        document.getElementById('columnMapping').style.display = 'block';
    }
    
    async handleSingleDocGeneration() {
        const templateId = document.getElementById('singleTemplate').value;
        const generatePDF = document.getElementById('generatePDF').checked;
        const generateDOCX = document.getElementById('generateDOCX').checked;
        const sendEmail = document.getElementById('sendEmail').checked;
        const recipientEmail = document.getElementById('recipientEmail').value;
        
        if (!templateId) {
            this.showAlert('Please select a template', 'warning');
            return;
        }
        
        if (!generatePDF && !generateDOCX) {
            this.showAlert('Please select at least one output format', 'warning');
            return;
        }
        
        if (sendEmail && !recipientEmail) {
            this.showAlert('Please enter recipient email', 'warning');
            return;
        }
        
        // Collect form data
        const formData = new FormData(document.getElementById('singleDocForm'));
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key !== 'templateId') {
                data[key] = value;
            }
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/documents/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateId,
                    data,
                    formats: {
                        pdf: generatePDF,
                        docx: generateDOCX
                    },
                    email: sendEmail ? { to: recipientEmail } : null
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert('Document generated successfully!', 'success');
                
                // Download files if available
                if (result.files) {
                    result.files.forEach(file => {
                        this.downloadFile(file.url, file.filename);
                    });
                }
                
                // Reset form
                document.getElementById('singleDocForm').reset();
                document.getElementById('singleDocFields').innerHTML = '';
                document.getElementById('templatePreview').innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-eye fa-3x mb-3"></i>
                        <p>Select a template to see preview</p>
                    </div>
                `;
                
                // Hide email field
                document.getElementById('recipientEmail').style.display = 'none';
                
            } else {
                this.showAlert(result.message || 'Document generation failed', 'danger');
            }
        } catch (error) {
            console.error('Single document generation error:', error);
            this.showAlert('Document generation failed', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleBulkGeneration() {
        const templateId = document.getElementById('bulkTemplate').value;
        const file = document.getElementById('bulkDataFile').files[0];
        const generatePDF = document.getElementById('bulkGeneratePDF').checked;
        const generateDOCX = document.getElementById('bulkGenerateDOCX').checked;
        const sendEmail = document.getElementById('bulkSendEmail').checked;
        const recipientEmail = document.getElementById('bulkRecipientEmail').value;
        
        if (!templateId) {
            this.showAlert('Please select a template', 'warning');
            return;
        }
        
        if (!file) {
            this.showAlert('Please upload a data file', 'warning');
            return;
        }
        
        if (!generatePDF && !generateDOCX) {
            this.showAlert('Please select at least one output format', 'warning');
            return;
        }
        
        if (sendEmail && !recipientEmail) {
            this.showAlert('Please enter notification email', 'warning');
            return;
        }
        
        // Collect column mapping
        const mappingElements = document.querySelectorAll('[name^="mapping_"]');
        const columnMapping = {};
        mappingElements.forEach(element => {
            const placeholder = element.name.replace('mapping_', '');
            const column = element.value;
            if (column) {
                columnMapping[placeholder] = column;
            }
        });
        
        if (Object.keys(columnMapping).length === 0) {
            this.showAlert('Please map at least one column', 'warning');
            return;
        }
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('templateId', templateId);
        formData.append('columnMapping', JSON.stringify(columnMapping));
        formData.append('formats', JSON.stringify({
            pdf: generatePDF,
            docx: generateDOCX
        }));
        
        if (sendEmail) {
            formData.append('email', JSON.stringify({ to: recipientEmail }));
        }
        
        this.showBulkProgress(true);
        
        try {
            const response = await fetch(`${this.apiBase}/documents/generate-bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showBulkResults(result);
                this.showAlert(`Bulk generation completed! ${result.successCount} documents generated.`, 'success');
                
                // Reset form
                document.getElementById('bulkGenerationForm').reset();
                document.getElementById('columnMapping').style.display = 'none';
                document.getElementById('bulkRecipientEmail').style.display = 'none';
                
            } else {
                this.showAlert(result.message || 'Bulk generation failed', 'danger');
            }
        } catch (error) {
            console.error('Bulk generation error:', error);
            this.showAlert('Bulk generation failed', 'danger');
        } finally {
            this.showBulkProgress(false);
        }
    }
    
    showBulkProgress(show) {
        const progressContainer = document.getElementById('bulkProgress');
        const resultsContainer = document.getElementById('bulkResults');
        
        if (show) {
            progressContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
            
            // Simulate progress
            let progress = 0;
            const progressBar = progressContainer.querySelector('.progress-bar');
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                
                progressBar.style.width = `${progress}%`;
                progressPercent.textContent = `${Math.round(progress)}%`;
                progressText.textContent = 'Processing documents...';
            }, 200);
            
            // Store interval for cleanup
            this.progressInterval = interval;
            
        } else {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            
            // Complete progress
            const progressBar = progressContainer.querySelector('.progress-bar');
            const progressPercent = document.getElementById('progressPercent');
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            document.getElementById('progressText').textContent = 'Completed!';
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);
        }
    }
    
    showBulkResults(result) {
        const resultsContainer = document.getElementById('bulkResults');
        
        resultsContainer.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="fas fa-check-circle me-2"></i>Generation Complete</h6>
                <p class="mb-1"><strong>Success:</strong> ${result.successCount} documents</p>
                ${result.errorCount > 0 ? `<p class="mb-1"><strong>Errors:</strong> ${result.errorCount} documents</p>` : ''}
                <p class="mb-0"><strong>Total:</strong> ${result.totalCount} documents</p>
            </div>
            
            ${result.downloadUrl ? `
                <div class="d-grid">
                    <a href="${result.downloadUrl}" class="btn btn-primary" target="_blank">
                        <i class="fas fa-download me-2"></i>Download All Documents
                    </a>
                </div>
            ` : ''}
        `;
        
        resultsContainer.style.display = 'block';
    }
    
    async loadAuditTrail() {
        try {
            const dateFilter = document.getElementById('auditDateFilter').value;
            let url = `${this.apiBase}/documents/audit`;
            
            if (dateFilter) {
                url += `?date=${dateFilter}`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const auditLogs = await response.json();
                const tableContainer = document.getElementById('auditTable');
                
                if (auditLogs.length === 0) {
                    tableContainer.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-history fa-3x mb-3"></i>
                            <p>No audit logs found</p>
                        </div>
                    `;
                } else {
                    tableContainer.innerHTML = `
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Template</th>
                                        <th>Generated By</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${auditLogs.map(log => `
                                        <tr>
                                            <td><strong>${log.templateName}</strong></td>
                                            <td>${log.generatedBy}</td>
                                            <td>
                                                <span class="badge ${log.type === 'bulk' ? 'bg-info' : 'bg-primary'}">
                                                    ${log.type === 'bulk' ? 'Bulk' : 'Single'}
                                                </span>
                                            </td>
                                            <td>${new Date(log.generatedAt).toLocaleString()}</td>
                                            <td>
                                                <span class="badge ${log.status === 'success' ? 'bg-success' : 'bg-danger'}">
                                                    ${log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load audit trail:', error);
            this.showAlert('Failed to load audit trail', 'danger');
        }
    }
    
    async editTemplate(templateId) {
        try {
            const response = await fetch(`${this.apiBase}/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const template = await response.json();
                
                // Populate modal with template data
                document.getElementById('templateName').value = template.name;
                document.getElementById('templateType').value = template.type;
                document.getElementById('templateContent').value = template.content;
                document.getElementById('templateDescription').value = template.description || '';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('templateModal'));
                modal.show();
                
                // Store template ID for update
                this.editingTemplateId = templateId;
            }
        } catch (error) {
            console.error('Failed to load template for editing:', error);
            this.showAlert('Failed to load template', 'danger');
        }
    }
    
    async deleteTemplate(templateId) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/templates/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.showAlert('Template deleted successfully', 'success');
                this.loadTemplates();
                this.loadTemplateOptions();
                this.loadBulkTemplateOptions();
            } else {
                const result = await response.json();
                this.showAlert(result.message || 'Failed to delete template', 'danger');
            }
        } catch (error) {
            console.error('Failed to delete template:', error);
            this.showAlert('Failed to delete template', 'danger');
        }
    }
    
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showLoading(show) {
        const loadingOverlay = document.querySelector('.loading');
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-dismissible');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '400px';
        
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    formatFieldLabel(field) {
        return field.replace(/_/g, ' ')
                   .replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DocGenApp();
});
