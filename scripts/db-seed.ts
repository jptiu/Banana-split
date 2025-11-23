// src/seeders/run.ts
import { readdir } from 'fs/promises'
import path from 'path'
import { pool } from '../src/config/db.js'

const args = process.argv.slice(2)
let hasError = false

async function runSeeder(seederPath: string) {
  try {
    const seeder = await import(seederPath)

    if (typeof seeder.seed !== 'function') {
      console.warn(`⚠️ Seeder "${seederPath}" does NOT export seed()`)
      return
    }

    await seeder.seed()

    console.log(`✅ Seeder completed: ${path.basename(seederPath)}`)
  } catch (err) {
    hasError = true
    console.error(`❌ Seeder failed (${seederPath}):`, err)
  }
}

async function main() {
  const seedersDir = path.resolve('src/seeders')

  if (args.length > 0) {
    // run specific seeder
    const seederFile = path.resolve(seedersDir, args[0])
    await runSeeder(seederFile)
  } else {
    // run all .ts seeders
    const files = await readdir(seedersDir)

    const tsFiles = files
      .filter(f => f.endsWith('.ts'))
      .filter(f => !f.endsWith('.d.ts')) // ignore declaration files
      .sort()

    if (tsFiles.length === 0) {
      console.log('⚠️ No seeder files found.')
      return
    }

    console.log(`🚀 Running ${tsFiles.length} seeders...\n`)

    for (const file of tsFiles) {
      await runSeeder(path.resolve(seedersDir, file))
    }
  }

  await pool.end() // VERY IMPORTANT

  if (!hasError) {
    console.log('\n🎉 All seeders completed successfully!')
  } else {
    console.log('\n⚠️ Some seeders failed — read the logs above.')
    process.exit(1)
  }
}

main()
