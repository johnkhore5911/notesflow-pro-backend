const { Tenant, User } = require('../models');
const { hashPassword } = require('../utils/bcrypt');

const seedDatabase = async () => {
  try {
    // Create tenants
    const acme = await Tenant.findOneAndUpdate(
      { slug: 'acme' },
      { slug: 'acme', name: 'Acme Corporation', subscription_plan: 'free' },
      { upsert: true, new: true }
    );
    
    const globex = await Tenant.findOneAndUpdate(
      { slug: 'globex' },
      { slug: 'globex', name: 'Globex Corporation', subscription_plan: 'free' },
      { upsert: true, new: true }
    );

    const hashedPassword = await hashPassword('password');

    // Create test users
    const testUsers = [
      { tenant_id: acme._id, email: 'admin@acme.test', password_hash: hashedPassword, role: 'admin' },
      { tenant_id: acme._id, email: 'user@acme.test', password_hash: hashedPassword, role: 'member' },
      { tenant_id: globex._id, email: 'admin@globex.test', password_hash: hashedPassword, role: 'admin' },
      { tenant_id: globex._id, email: 'user@globex.test', password_hash: hashedPassword, role: 'member' }
    ];

    for (const userData of testUsers) {
      await User.findOneAndUpdate(
        { email: userData.email },
        userData,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

module.exports = seedDatabase;
