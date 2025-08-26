const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Template = require('./models/Template');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docgen-mongo', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Template.deleteMany({});
    console.log('Existing data cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const usersData = [
      {
        name: "System Administrator",
        email: "admin@docgen.com",
        password: "admin123",
        role: "admin",
        department: "IT",
        isActive: true
      },
      {
        name: "HR Manager",
        email: "hr@docgen.com", 
        password: "hr123",
        role: "hr",
        department: "Human Resources",
        isActive: true
      },
      {
        name: "Staff Member",
        email: "staff@docgen.com",
        password: "staff123", 
        role: "staff",
        department: "Operations",
        isActive: true
      },
      {
        name: "John Smith",
        email: "john.smith@docgen.com",
        password: "john123",
        role: "hr",
        department: "Human Resources",
        isActive: true
      },
      {
        name: "Sarah Wilson",
        email: "sarah.wilson@docgen.com",
        password: "sarah123",
        role: "staff",
        department: "Marketing",
        isActive: true
      }
    ];

    // Hash passwords and create users
    const users = await Promise.all(
      usersData.map(async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        return {
          ...userData,
          password: hashedPassword
        };
      })
    );

    await User.insertMany(users);
    console.log(`✅ Successfully seeded ${users.length} users`);
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

// Seed templates
const seedTemplates = async () => {
  try {
    // Read templates from JSON file
    const templatesPath = path.join(__dirname, '../seed/templates.json');
    const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

    // Add metadata to templates
    const templates = templatesData.map(template => ({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await Template.insertMany(templates);
    console.log(`✅ Successfully seeded ${templates.length} templates`);
  } catch (error) {
    console.error('Error seeding templates:', error);
  }
};

// Create required directories
const createDirectories = () => {
  const dirs = [
    'uploads',
    'generated',
    'uploads/templates',
    'uploads/bulk',
    'generated/pdf',
    'generated/docx'
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Main seeding function
const runSeed = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await clearDatabase();
    
    // Create directories
    console.log('📁 Creating required directories...');
    createDirectories();
    
    // Seed data
    console.log('👥 Seeding users...');
    await seedUsers();
    
    console.log('📄 Seeding templates...');
    await seedTemplates();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('Admin: admin@docgen.com / admin123');
    console.log('HR: hr@docgen.com / hr123');
    console.log('Staff: staff@docgen.com / staff123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️ Seeding interrupted');
  await mongoose.connection.close();
  process.exit(1);
});

// Run seeding if this file is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = {
  runSeed,
  seedUsers,
  seedTemplates,
  createDirectories
};
