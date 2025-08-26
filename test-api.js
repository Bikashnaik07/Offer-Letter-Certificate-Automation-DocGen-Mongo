const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_BASE = 'http://localhost:5000/api';
let authToken = '';

// Test credentials
const testCredentials = {
  admin: { email: 'admin@docgen.com', password: 'admin123' },
  hr: { email: 'hr@docgen.com', password: 'hr123' },
  staff: { email: 'staff@docgen.com', password: 'staff123' }
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        ...headers
      }
    };

    if (data) {
      if (data instanceof FormData) {
        config.data = data;
        config.headers = { ...config.headers, ...data.getHeaders() };
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test 1: Authentication
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  // Test login with admin credentials
  const loginResult = await makeRequest('POST', '/auth/login', testCredentials.admin);
  
  if (loginResult.success) {
    authToken = loginResult.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
  } else {
    console.log('❌ Login failed:', loginResult.error);
    return false;
  }

  // Test profile retrieval
  const profileResult = await makeRequest('GET', '/auth/profile');
  
  if (profileResult.success) {
    console.log('✅ Profile retrieval successful');
    console.log(`   User: ${profileResult.data.user.name} (${profileResult.data.user.role})`);
  } else {
    console.log('❌ Profile retrieval failed:', profileResult.error);
  }

  return true;
};

// Test 2: Template Management
const testTemplateManagement = async () => {
  console.log('\n📄 Testing Template Management...');
  
  // Get all templates
  const templatesResult = await makeRequest('GET', '/templates');
  
  if (templatesResult.success) {
    console.log('✅ Templates retrieved successfully');
    console.log(`   Found ${templatesResult.data.templates.length} templates`);
    
    if (templatesResult.data.templates.length > 0) {
      const template = templatesResult.data.templates[0];
      console.log(`   Sample template: ${template.name} (${template.placeholders.length} placeholders)`);
      return template._id;
    }
  } else {
    console.log('❌ Template retrieval failed:', templatesResult.error);
  }

  return null;
};

// Test 3: Single Document Generation
const testSingleDocumentGeneration = async (templateId) => {
  console.log('\n📋 Testing Single Document Generation...');
  
  if (!templateId) {
    console.log('❌ No template ID available for testing');
    return;
  }

  const testData = {
    templateId: templateId,
    data: {
      name: 'John Doe',
      position: 'Software Developer',
      company: 'TechCorp Inc.',
      department: 'Engineering',
      manager: 'Jane Smith',
      joining_date: '2024-01-15',
      location: 'New York',
      salary: '$75,000',
      date: new Date().toLocaleDateString(),
      hr_name: 'HR Manager'
    },
    format: 'pdf'
  };

  const generateResult = await makeRequest('POST', '/documents/generate-single', testData);
  
  if (generateResult.success) {
    console.log('✅ Single document generation successful');
    console.log(`   Document ID: ${generateResult.data.document.documentId}`);
    console.log(`   File: ${generateResult.data.document.fileName}`);
    return generateResult.data.document._id;
  } else {
    console.log('❌ Single document generation failed:', generateResult.error);
  }

  return null;
};

// Test 4: Bulk Document Generation
const testBulkDocumentGeneration = async (templateId) => {
  console.log('\n📊 Testing Bulk Document Generation...');
  
  if (!templateId) {
    console.log('❌ No template ID available for testing');
    return;
  }

  // Create sample CSV data
  const csvData = `name,position,company,department,salary,joining_date
John Doe,Software Developer,TechCorp Inc.,Engineering,$75000,2024-01-15
Jane Smith,Product Manager,TechCorp Inc.,Product,$80000,2024-01-20
Bob Johnson,Designer,TechCorp Inc.,Design,$70000,2024-01-25`;

  const csvPath = path.join(__dirname, 'test-bulk-data.csv');
  fs.writeFileSync(csvPath, csvData);

  // Create form data
  const formData = new FormData();
  formData.append('templateId', templateId);
  formData.append('format', 'pdf');
  formData.append('file', fs.createReadStream(csvPath));

  const bulkResult = await makeRequest('POST', '/documents/generate-bulk', formData);
  
  if (bulkResult.success) {
    console.log('✅ Bulk document generation successful');
    console.log(`   Batch ID: ${bulkResult.data.batchId}`);
    console.log(`   Total: ${bulkResult.data.total}, Successful: ${bulkResult.data.successful}`);
  } else {
    console.log('❌ Bulk document generation failed:', bulkResult.error);
  }

  // Clean up
  if (fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
  }
};

// Test 5: Audit Trail
const testAuditTrail = async () => {
  console.log('\n📈 Testing Audit Trail...');
  
  const auditResult = await makeRequest('GET', '/documents/audit');
  
  if (auditResult.success) {
    console.log('✅ Audit trail retrieved successfully');
    console.log(`   Found ${auditResult.data.auditLogs.length} audit entries`);
    
    if (auditResult.data.auditLogs.length > 0) {
      const latestEntry = auditResult.data.auditLogs[0];
      console.log(`   Latest: ${latestEntry.action} by ${latestEntry.userId?.name || 'Unknown'}`);
    }
  } else {
    console.log('❌ Audit trail retrieval failed:', auditResult.error);
  }
};

// Test 6: Health Check
const testHealthCheck = async () => {
  console.log('\n🏥 Testing Health Check...');
  
  const healthResult = await makeRequest('GET', '/health');
  
  if (healthResult.success) {
    console.log('✅ Health check successful');
    console.log(`   Status: ${healthResult.data.status}`);
    console.log(`   Message: ${healthResult.data.message}`);
  } else {
    console.log('❌ Health check failed:', healthResult.error);
  }
};

// Test 7: Role-based Access
const testRoleBasedAccess = async () => {
  console.log('\n👥 Testing Role-based Access...');
  
  // Test with staff credentials
  const staffLoginResult = await makeRequest('POST', '/auth/login', testCredentials.staff);
  
  if (staffLoginResult.success) {
    const staffToken = staffLoginResult.data.token;
    console.log('✅ Staff login successful');
    
    // Try to access admin-only endpoint (should fail)
    const config = {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    };
    
    const adminResult = await axios.get(`${API_BASE}/templates`, config)
      .catch(error => ({ error: error.response?.data || error.message }));
    
    if (adminResult.error) {
      console.log('✅ Role-based access control working (staff cannot access admin endpoints)');
    } else {
      console.log('⚠️  Role-based access control may not be working properly');
    }
  } else {
    console.log('❌ Staff login failed:', staffLoginResult.error);
  }
  
  // Restore admin token
  const adminLoginResult = await makeRequest('POST', '/auth/login', testCredentials.admin);
  if (adminLoginResult.success) {
    authToken = adminLoginResult.data.token;
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🧪 Starting DocGen-Mongo API Tests...');
  console.log('=' .repeat(50));
  
  try {
    // Check if server is running
    const serverCheck = await makeRequest('GET', '/health');
    if (!serverCheck.success) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm start (from backend directory)');
      return;
    }

    // Run tests
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Authentication failed. Cannot continue with other tests.');
      return;
    }

    const templateId = await testTemplateManagement();
    const documentId = await testSingleDocumentGeneration(templateId);
    await testBulkDocumentGeneration(templateId);
    await testAuditTrail();
    await testHealthCheck();
    await testRoleBasedAccess();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed!');
    console.log('\nNext steps:');
    console.log('1. Check the generated documents in the backend/generated folder');
    console.log('2. Review audit logs in the database');
    console.log('3. Test the frontend by opening frontend/index.html');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
};

// Export for use as module
module.exports = {
  runAllTests,
  testAuthentication,
  testTemplateManagement,
  testSingleDocumentGeneration,
  testBulkDocumentGeneration,
  testAuditTrail,
  makeRequest
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
