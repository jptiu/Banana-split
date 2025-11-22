import { pool } from '../src/config/db.js'
import readline from 'readline'

const target = process.argv[2]

if (!target) {
  console.error('❌ Missing argument. Usage: yarn truncate:table <table_name|all>')
  process.exit(1)
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  )
}

async function tableExists(table: string): Promise<boolean> {
  const res = await pool.query(
    `
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = $1
      ) as exists
    `,
    [table]
  )

  return res.rows[0].exists
}

async function truncate() {
  try {
    // ==========================================
    // 🔹 TRUNCATE ALL TABLES
    // ==========================================
    if (target === 'all') {
      const res = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `)

      const tables = res.rows.map(r => r.tablename)

      if (tables.length === 0) {
        console.log('⚠️ No tables found to truncate.')
        return
      }

      console.log('⚠️ You are about to truncate ALL tables:')
      console.log(tables)
      console.log('----------------------------------------')

      const confirm = await ask('Type "yes" to proceed: ')
      if (confirm !== 'yes') {
        console.log('❌ Cancelled.')
        return
      }

      const joined = tables.join(', ')
      await pool.query(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE`)

      console.log('✅ Successfully truncated ALL tables:')
      console.log(tables)
      return
    }

    // ==========================================
    // 🔹 TRUNCATE SPECIFIC TABLE
    // ==========================================
    const exists = await tableExists(target)

    if (!exists) {
      console.error(`❌ Table '${target}' does not exist.`)
      return
    }

    console.log(`⚠️ You are about to truncate table: '${target}'`)
    console.log('----------------------------------------')

    const confirm = await ask('Type "yes" to proceed: ')
    if (confirm !== 'yes') {
      console.log('❌ Cancelled.')
      return
    }

    await pool.query(`TRUNCATE TABLE ${target} RESTART IDENTITY CASCADE`)
    console.log(`✅ Successfully truncated table: '${target}'`)

  } catch (err) {
    console.error('❌ Error truncating:', err)
  } finally {
    await pool.end()
  }
}

truncate()
