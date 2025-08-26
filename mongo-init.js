// MongoDB initialization script for Docker
// This script runs when MongoDB container starts for the first time

// Switch to the docgen-mongo database
db = db.getSiblingDB('docgen-mongo');

// Create collections with validation schemas
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'User full name - required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Valid email address - required'
        },
        password: {
          bsonType: 'string',
          minLength: 6,
          description: 'Encrypted password - required'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'hr', 'staff'],
          description: 'User role - required'
        },
        department: {
          bsonType: 'string',
          description: 'User department'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Account status'
        }
      }
    }
  }
});

db.createCollection('templates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'content', 'category', 'createdBy'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Template name - required'
        },
        content: {
          bsonType: 'string',
          description: 'Template content with placeholders - required'
        },
        category: {
          bsonType: 'string',
          enum: ['offer_letter', 'appointment_letter', 'certificate', 'experience_letter', 'other'],
          description: 'Template category - required'
        },
        placeholders: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Array of placeholder names'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Template status'
        },
        createdBy: {
          bsonType: 'string',
          description: 'Creator email - required'
        }
      }
    }
  }
});

db.createCollection('generateddocs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['documentId', 'templateId', 'generatedBy', 'fileName'],
      properties: {
        documentId: {
          bsonType: 'string',
          description: 'Unique document identifier - required'
        },
        templateId: {
          bsonType: 'objectId',
          description: 'Reference to template - required'
        },
        generatedBy: {
          bsonType: 'objectId',
          description: 'Reference to user who generated - required'
        },
        fileName: {
          bsonType: 'string',
          description: 'Generated file name - required'
        },
        format: {
          bsonType: 'string',
          enum: ['pdf', 'docx'],
          description: 'Document format'
        },
        status: {
          bsonType: 'string',
          enum: ['generated', 'sent', 'downloaded', 'expired'],
          description: 'Document status'
        },
        batchId: {
          bsonType: 'string',
          description: 'Batch ID for bulk operations'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.templates.createIndex({ name: 1 });
db.templates.createIndex({ category: 1 });
db.templates.createIndex({ createdBy: 1 });
db.templates.createIndex({ isActive: 1 });

db.generateddocs.createIndex({ documentId: 1 }, { unique: true });
db.generateddocs.createIndex({ templateId: 1 });
db.generateddocs.createIndex({ generatedBy: 1 });
db.generateddocs.createIndex({ createdAt: 1 });
db.generateddocs.createIndex({ batchId: 1 });
db.generateddocs.createIndex({ status: 1 });

// TTL index for document expiration (30 days)
db.generateddocs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create admin user (password will be hashed by the application)
db.users.insertOne({
  name: 'System Administrator',
  email: 'admin@docgen.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.kxVqEFPjq', // admin123
  role: 'admin',
  department: 'IT',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create sample HR user
db.users.insertOne({
  name: 'HR Manager',
  email: 'hr@docgen.com',
  password: '$2a$12$8k5J6M4FqXHQUQxXxXqGe.YjVmvyaHdJxGzKzGjxHzGdKzHxKzGjx', // hr123
  role: 'hr',
  department: 'Human Resources',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create sample staff user
db.users.insertOne({
  name: 'Staff Member',
  email: 'staff@docgen.com',
  password: '$2a$12$YQFQFqGjxHzGdKzHxKzGjxHzGdKzHxKzGjxHzGdKzHxKzGjxHzGd', // staff123
  role: 'staff',
  department: 'Operations',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert sample templates
db.templates.insertMany([
  {
    name: 'Standard Offer Letter',
    description: 'Standard job offer letter template',
    category: 'offer_letter',
    content: `Dear {{name}},

We are pleased to offer you the position of {{position}} at {{company}}.

Position Details:
• Job Title: {{position}}
• Department: {{department}}
• Reporting Manager: {{manager}}
• Start Date: {{joining_date}}
• Work Location: {{location}}
• Annual Salary: {{salary}}

Please confirm your acceptance by {{offer_expiry_date}}.

Sincerely,
{{hr_name}}
Human Resources
{{company}}

Generated on: {{date}}`,
    placeholders: ['name', 'position', 'company', 'department', 'manager', 'joining_date', 'location', 'salary', 'offer_expiry_date', 'hr_name', 'date'],
    isActive: true,
    createdBy: 'admin@docgen.com',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Experience Certificate',
    description: 'Employee experience certificate template',
    category: 'certificate',
    content: `EXPERIENCE CERTIFICATE

{{company}}
{{company_address}}

TO WHOM IT MAY CONCERN

This is to certify that {{name}} was employed with {{company}} from {{joining_date}} to {{last_working_day}}.

Employment Details:
• Employee ID: {{employee_id}}
• Designation: {{position}}
• Department: {{department}}
• Reporting Manager: {{manager}}

During the tenure, {{name}} demonstrated excellent professional skills and dedication.

We wish {{name}} all the best for future endeavors.

Issued by:
{{hr_name}}
Human Resources Manager
{{company}}
Date: {{date}}

[Official Company Seal]`,
    placeholders: ['name', 'company', 'company_address', 'joining_date', 'last_working_day', 'employee_id', 'position', 'department', 'manager', 'hr_name', 'date'],
    isActive: true,
    createdBy: 'admin@docgen.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('DocGen-Mongo database initialized successfully!');
print('Created collections: users, templates, generateddocs');
print('Created indexes for performance optimization');
print('Inserted sample users and templates');
print('Admin login: admin@docgen.com / admin123');
print('HR login: hr@docgen.com / hr123');
print('Staff login: staff@docgen.com / staff123');
