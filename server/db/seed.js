require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // Create admin user (Jason)
    const adminHash = await bcrypt.hash('admin123', 10);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['Jason', 'jason@ramproperties.com', adminHash, '850-555-0001', 'admin']
    );

    // Create field user
    const fieldHash = await bcrypt.hash('field123', 10);
    const fieldResult = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['Field User', 'field@ramproperties.com', fieldHash, '850-555-0002', 'field']
    );

    const adminId = adminResult.rows[0]?.id || 1;
    const fieldId = fieldResult.rows[0]?.id || 2;

    // Create sample clients
    const clients = [
      ['Henderson Property', '123 Scenic Hwy 30A, Santa Rosa Beach, FL', '850-555-1001', 'henderson@email.com', 'Monthly maintenance contract'],
      ['Coastal Condos HOA', '456 Beach Blvd, Destin, FL', '850-555-1002', 'coastal@email.com', 'Weekly mowing + monthly maintenance'],
      ['Beachside Rentals', '789 Gulf Dr, Panama City Beach, FL', '850-555-1003', 'beachside@email.com', 'Bi-weekly maintenance'],
    ];

    const clientIds = [];
    for (const [name, address, phone, email, notes] of clients) {
      const result = await client.query(
        `INSERT INTO clients (name, address, phone, email, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [name, address, phone, email, notes]
      );
      clientIds.push(result.rows[0].id);
    }

    // Create sample contracts
    await client.query(
      `INSERT INTO contracts (client_id, description, frequency, day_of_week, assigned_user_id)
       VALUES ($1, $2, 'weekly', 1, $3)`,
      [clientIds[0], 'Lawn mowing - Henderson', fieldId]
    );

    await client.query(
      `INSERT INTO contracts (client_id, description, frequency, day_of_week, assigned_user_id)
       VALUES ($1, $2, 'weekly', 3, $3)`,
      [clientIds[1], 'Lawn mowing - Coastal Condos', fieldId]
    );

    await client.query(
      `INSERT INTO contracts (client_id, description, frequency, day_of_month, assigned_user_id)
       VALUES ($1, $2, 'monthly', 15, $3)`,
      [clientIds[0], 'Monthly maintenance inspection - Henderson', adminId]
    );

    await client.query(
      `INSERT INTO contracts (client_id, description, frequency, day_of_month, assigned_user_id)
       VALUES ($1, $2, 'monthly', 1, $3)`,
      [clientIds[1], 'Monthly landscape maintenance - Coastal Condos', fieldId]
    );

    console.log('Seed completed successfully.');
    console.log(`Created ${clientIds.length} clients, 4 contracts, 2 users`);
    console.log('Admin login: jason@ramproperties.com / admin123');
    console.log('Field login: field@ramproperties.com / field123');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
