const mongoose = require('mongoose');

/**
 * Database configuration and connection handler
 */
class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/docgen-mongo';
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    if (this.isConnected) {
      console.log('💾 Database already connected');
      return;
    }

    try {
      console.log('🔄 Connecting to MongoDB...');
      
      await mongoose.connect(this.connectionString, this.options);
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📍 Database: ${this.getDatabaseName()}`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get database name from connection string
   */
  getDatabaseName() {
    try {
      const url = new URL(this.connectionString);
      return url.pathname.substring(1) || 'docgen-mongo';
    } catch {
      return 'docgen-mongo';
    }
  }

  /**
   * Setup MongoDB connection event listeners
   */
  setupEventListeners() {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      console.log('\n⚠️  Received SIGINT. Gracefully closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⚠️  Received SIGTERM. Gracefully closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Check if database is connected
   */
  isDbConnected() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      status: states[mongoose.connection.readyState],
      database: this.getDatabaseName(),
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        message: 'Database connection is working',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
