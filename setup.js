#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Helper function for colored output
const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Check if command exists
const commandExists = (command) => {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Check system requirements
const checkSystemRequirements = () => {
  log('\n🔍 Checking system requirements...', 'blue');
  
  const requirements = [
    { name: 'Node.js', command: 'node', required: true },
    { name: 'npm', command: 'npm', required: true },
    { name: 'MongoDB', command: 'mongod', required: false }
  ];
  
  const missing = [];
  
  requirements.forEach(req => {
    if (commandExists(req.command)) {
      log(`✅ ${req.name} is installed`, 'green');
    } else {
      log(`❌ ${req.name} is not installed`, 'red');
      if (req.required) {
        missing.push(req.name);
      } else {
        log(`   Note: ${req.name} is optional if using MongoDB Atlas`, 'yellow');
      }
    }
  });
  
  if (missing.length > 0) {
    log(`\n❌ Missing required dependencies: ${missing.join(', ')}`, 'red');
    log('Please install them before continuing.', 'red');
    process.exit(1);
  }
  
  log('\n✅ System requirements check passed!', 'green');
};

// Create project directories
const createDirectories = () => {
  log('\n📁 Creating project directories...', 'blue');
  
  const directories = [
    'backend/uploads',
    'backend/uploads/templates',
    'backend/uploads/bulk',
    'backend/generated',
    'backend/generated/pdf',
    'backend/generated/docx',
    'frontend',
    'seed',
    'sample-templates',
    'logs'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ Created: ${dir}`, 'green');
    } else {
      log(`📁 Exists: ${dir}`, 'yellow');
    }
  });
};

// Install dependencies
const installDependencies = async () => {
  log('\n📦 Installing dependencies...', 'blue');
  
  try {
    log('Installing backend dependencies...', 'cyan');
    process.chdir('backend');
    execSync('npm install', { stdio: 'inherit' });
    process.chdir('..');
    log('✅ Backend dependencies installed', 'green');
    
    // Check if frontend has package.json
    if (fs.existsSync('frontend/package.json')) {
      log('Installing frontend dependencies...', 'cyan');
      process.chdir('frontend');
      execSync('npm install', { stdio: 'inherit' });
      process.chdir('..');
      log('✅ Frontend dependencies installed', 'green');
    }
    
  } catch (error) {
    log(`❌ Error installing dependencies: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Setup environment variables
const setupEnvironment = async () => {
  log('\n⚙️  Setting up environment variables...', 'blue');
  
  const envPath = 'backend/.env';
  const envExamplePath = 'backend/.env.example';
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('🤔 .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log('⏭️  Skipping environment setup', 'yellow');
      return;
    }
  }
  
  log('\n📝 Please provide configuration details:', 'cyan');
  
  const port = await question('🔌 Server port (default: 5000): ') || '5000';
  const mongoUri = await question('🍃 MongoDB URI (default: mongodb://localhost:27017/docgen-mongo): ') 
    || 'mongodb://localhost:27017/docgen-mongo';
  const jwtSecret = await question('🔐 JWT Secret (default: auto-generated): ') 
    || require('crypto').randomBytes(64).toString('hex');
  
  const emailHost = await question('📧 Email SMTP Host (default: smtp.gmail.com): ') || 'smtp.gmail.com';
  const emailPort = await question('📧 Email SMTP Port (default: 587): ') || '587';
  const emailUser = await question('📧 Email Username (optional): ') || 'your-email@gmail.com';
  const emailPass = await question('📧 Email Password (optional): ') || 'your-app-password';
  
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=development

# MongoDB Configuration  
MONGODB_URI=${mongoUri}

# JWT Configuration
JWT_SECRET=${jwtSecret}

# Email Configuration (for document delivery)
EMAIL_HOST=${emailHost}
EMAIL_PORT=${emailPort}
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}
EMAIL_FROM="DocGen Mongo <${emailUser}>"

# File Upload Configuration
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=csv,xlsx,xls

# Document Generation Configuration  
PDF_TIMEOUT=30000
DOCX_TIMEOUT=15000

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=24h

# Development Configuration
DEBUG=docgen:*
LOG_LEVEL=info
`;

  fs.writeFileSync(envPath, envContent);
  log('✅ Environment configuration saved', 'green');
};

// Initialize database
const initializeDatabase = async () => {
  log('\n🗄️  Initializing database...', 'blue');
  
  const seedDb = await question('🌱 Seed database with sample data? (Y/n): ');
  if (seedDb.toLowerCase() !== 'n') {
    try {
      log('Running database seeding...', 'cyan');
      process.chdir('backend');
      execSync('node seed.js', { stdio: 'inherit' });
      process.chdir('..');
      log('✅ Database seeded successfully', 'green');
    } catch (error) {
      log(`❌ Error seeding database: ${error.message}`, 'red');
      log('You can run "npm run seed" later to seed the database', 'yellow');
    }
  }
};

// Create sample templates
const createSampleTemplates = async () => {
  log('\n📄 Creating sample DOCX templates...', 'blue');
  
  const createTemplates = await question('📝 Create sample DOCX templates? (Y/n): ');
  if (createTemplates.toLowerCase() !== 'n') {
    try {
      log('Generating sample templates...', 'cyan');
      const { createAllTemplates } = require('./create-sample-templates');
      await createAllTemplates();
      log('✅ Sample templates created', 'green');
    } catch (error) {
      log(`❌ Error creating templates: ${error.message}`, 'red');
      log('You can create templates manually or run the script later', 'yellow');
    }
  }
};

// Run tests
const runTests = async () => {
  log('\n🧪 Running API tests...', 'blue');
  
  const runTestSuite = await question('🔬 Run API tests to verify setup? (Y/n): ');
  if (runTestSuite.toLowerCase() !== 'n') {
    log('\n⚠️  Make sure the server is running in another terminal before running tests!', 'yellow');
    const continueTests = await question('Continue with tests? (Y/n): ');
    
    if (continueTests.toLowerCase() !== 'n') {
      try {
        log('Running test suite...', 'cyan');
        const { runAllTests } = require('./test-api');
        await runAllTests();
        log('✅ Tests completed', 'green');
      } catch (error) {
        log(`❌ Error running tests: ${error.message}`, 'red');
        log('You can run "node test-api.js" later to test the API', 'yellow');
      }
    }
  }
};

// Display final instructions
const displayInstructions = () => {
  log('\n🎉 Setup completed successfully!', 'green');
  log('\n' + '='.repeat(60), 'cyan');
  log('📋 NEXT STEPS:', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log('\n1. 🚀 Start the backend server:', 'white');
  log('   cd backend && npm start', 'yellow');
  
  log('\n2. 🌐 Open the frontend:', 'white');
  log('   Open frontend/index.html in your browser', 'yellow');
  log('   Or serve it with: python -m http.server 3000', 'yellow');
  
  log('\n3. 🔐 Default login credentials:', 'white');
  log('   Admin: admin@docgen.com / admin123', 'yellow');
  log('   HR: hr@docgen.com / hr123', 'yellow');
  log('   Staff: staff@docgen.com / staff123', 'yellow');
  
  log('\n4. 📚 API Documentation:', 'white');
  log('   Health check: http://localhost:5000/api/health', 'yellow');
  log('   Full API docs: Check README.md', 'yellow');
  
  log('\n5. 🧪 Testing:', 'white');
  log('   Run tests: node test-api.js', 'yellow');
  
  log('\n6. 📁 Project Structure:', 'white');
  log('   📂 backend/ - Node.js API server', 'yellow');
  log('   📂 frontend/ - Simple web interface', 'yellow');
  log('   📂 sample-templates/ - DOCX template files', 'yellow');
  log('   📂 seed/ - Database seed data', 'yellow');
  
  log('\n💡 Tips:', 'magenta');
  log('• Check logs/ directory for application logs', 'white');
  log('• Use .env file to configure database and email settings', 'white');
  log('• Upload your own templates via the web interface', 'white');
  log('• Generated documents are saved in backend/generated/', 'white');
  
  log('\n🔗 Useful Commands:', 'magenta');
  log('• npm run seed - Reseed database', 'white');
  log('• npm run dev - Start with nodemon (auto-restart)', 'white');
  log('• node test-api.js - Run API tests', 'white');
  
  log('\n' + '='.repeat(60), 'cyan');
  log('Happy document generation! 📄✨', 'green');
};

// Main setup function
const runSetup = async () => {
  try {
    log('🚀 DocGen-Mongo Setup Wizard', 'magenta');
    log('='.repeat(50), 'magenta');
    log('This wizard will help you set up the DocGen-Mongo project', 'white');
    
    checkSystemRequirements();
    createDirectories();
    await installDependencies();
    await setupEnvironment();
    await initializeDatabase();
    await createSampleTemplates();
    displayInstructions();
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⚠️  Setup interrupted by user', 'yellow');
  rl.close();
  process.exit(0);
});

// Run setup if this file is executed directly
if (require.main === module) {
  runSetup();
}

module.exports = {
  runSetup,
  checkSystemRequirements,
  createDirectories,
  installDependencies,
  setupEnvironment,
  initializeDatabase
};
