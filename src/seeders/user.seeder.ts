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
        user_type: null,
      },
      {
        first_name: 'Creator',
        last_name: 'User',
        email: 'creator@example.com',
        password: 'creator123',
        role: 'user',
        user_type: 'creator',
      },
      {
        first_name: 'Member',
        last_name: 'User',
        email: 'member@example.com',
        password: 'member123',
        role: 'user',
        user_type: 'member',
      },
    ]

    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 10)

      // Insert or update user
      const userRes = await pool.query(
        `
        INSERT INTO users (id, first_name, last_name, email, password, is_email_verified, role, user_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET 
          role = EXCLUDED.role,
          user_type = EXCLUDED.user_type
        RETURNING id, user_type, first_name
      `,
        [
          uuidv4(),
          u.first_name,
          u.last_name,
          u.email,
          passwordHash,
          true,
          u.role,
          u.user_type,
        ]
      )

      const userId = userRes.rows[0].id
      const userType = userRes.rows[0].user_type
      const firstName = userRes.rows[0].first_name

      console.log(`✅ User seeded: ${u.first_name} ${u.last_name} (${u.email})`)

      // If the user is a creator, create a group automatically
      if (userType === 'creator') {
        const groupId = uuidv4()
        const groupName = `${firstName}'s Group`

        await pool.query(
          `
          INSERT INTO groups (id, name, owner_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (owner_id) DO NOTHING
        `,
          [groupId, groupName, userId]
        )

        console.log(`🏆 Group created for creator: ${groupName}`)
      }
    }

    console.log('🎉 Users and groups seeded successfully!')
  } catch (err) {
    console.error('❌ Error seeding users/groups:', err)
  }
}
