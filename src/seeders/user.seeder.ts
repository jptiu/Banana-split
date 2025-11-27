import { pool } from '../config/db.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

export async function seed() {
  try {
    const users = [
      {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        first_name: 'Creator',
        last_name: 'User',
        email: 'creator@example.com',
        password: 'creator123',
        role: 'creator',
      },
      {
        first_name: 'Member',
        last_name: 'User',
        email: 'member@example.com',
        password: 'member123',
        role: 'member',
      },
    ]

    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 10)

      await pool.query(
        `
        INSERT INTO users (id, first_name, last_name, email, password, is_email_verified, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE 
        SET 
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          password = EXCLUDED.password,
          role = EXCLUDED.role
        `,
        [
          uuidv4(),
          u.first_name,
          u.last_name,
          u.email,
          passwordHash,
          true,
          u.role,
        ]
      )

      console.log(`✅ User seeded: ${u.first_name} ${u.last_name} (${u.email}) as ${u.role}`)
    }

    console.log('🎉 Users seeded successfully!')
  } catch (err) {
    console.error('❌ Error seeding users:', err)
  }
}
