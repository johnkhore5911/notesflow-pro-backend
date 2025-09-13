// // server.js
// require('dotenv').config();
// const app = require('./src/app');
// const connectDB = require('./src/config/database');
// const seedDatabase = require('./src/scripts/seedData');
// const PORT = process.env.PORT || 5000;

// // Connect to MongoDB
// connectDB();

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
//   console.log(`📊 Health check: http://localhost:${PORT}/health`);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err, promise) => {
//   console.log('💥 Unhandled Rejection at:', promise, 'reason:', err);
//   // Close server & exit process
//   server.close(() => {
//     process.exit(1);
//   });
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', (err) => {
//   console.log('💥 Uncaught Exception:', err);
//   process.exit(1);
// });


// server.js
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
// const seedDatabase = require('./src/scripts/seedData');

const PORT = process.env.PORT || 5000;

// Function to initialize the application
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Seed the database with test accounts [1]
    // console.log('🌱 Seeding database...');
    // await seedDatabase();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`👤 Test accounts ready!`);
    });
    
    return server;
    
  } catch (error) {
    console.error('💥 Failed to initialize app:', error);
    process.exit(1);
  }
};

// Initialize the application
const server = initializeApp();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('💥 Unhandled Rejection at:', promise, 'reason:', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('💥 Uncaught Exception:', err);
  process.exit(1);
});
