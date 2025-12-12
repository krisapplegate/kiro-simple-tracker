#!/usr/bin/env node

import { query, closePool } from '../backend/database.js'
import { User } from '../backend/models/User.js'

const commands = {
  async createUser(email, password, role = 'user', tenantId = 1) {
    try {
      const user = await User.create(email, password, role, tenantId)
      console.log('User created:', { id: user.id, email: user.email, role: user.role })
    } catch (error) {
      console.error('Error creating user:', error.message)
    }
  },

  async listUsers() {
    try {
      const result = await query(`
        SELECT u.id, u.email, u.role, t.name as tenant_name 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        ORDER BY u.id
      `)
      console.log('Users:')
      result.rows.forEach(user => {
        console.log(`  ${user.id}: ${user.email} (${user.role}) - ${user.tenant_name}`)
      })
    } catch (error) {
      console.error('Error listing users:', error.message)
    }
  },

  async listObjects() {
    try {
      const result = await query(`
        SELECT o.id, o.name, o.type, o.status, t.name as tenant_name, u.email as created_by_email
        FROM objects o 
        JOIN tenants t ON o.tenant_id = t.id 
        LEFT JOIN users u ON o.created_by = u.id
        ORDER BY o.id
      `)
      console.log('Objects:')
      result.rows.forEach(obj => {
        console.log(`  ${obj.id}: ${obj.name} (${obj.type}) - ${obj.status} - ${obj.tenant_name} - Created by: ${obj.created_by_email || 'Unknown'}`)
      })
    } catch (error) {
      console.error('Error listing objects:', error.message)
    }
  },

  async deleteObject(objectId) {
    try {
      const result = await query('DELETE FROM objects WHERE id = $1 RETURNING name', [objectId])
      if (result.rows.length > 0) {
        console.log('Object deleted:', result.rows[0].name)
      } else {
        console.log('Object not found:', objectId)
      }
    } catch (error) {
      console.error('Error deleting object:', error.message)
    }
  },

  async stats() {
    try {
      const userCount = await query('SELECT COUNT(*) FROM users')
      const objectCount = await query('SELECT COUNT(*) FROM objects')
      const historyCount = await query('SELECT COUNT(*) FROM location_history')
      const tenantCount = await query('SELECT COUNT(*) FROM tenants')
      
      // Object types breakdown
      const typeStats = await query(`
        SELECT type, COUNT(*) as count 
        FROM objects 
        GROUP BY type 
        ORDER BY count DESC, type ASC
      `)

      console.log('Database Statistics:')
      console.log(`  Tenants: ${tenantCount.rows[0].count}`)
      console.log(`  Users: ${userCount.rows[0].count}`)
      console.log(`  Objects: ${objectCount.rows[0].count}`)
      console.log(`  Location History: ${historyCount.rows[0].count}`)
      
      if (typeStats.rows.length > 0) {
        console.log('\nObject Types:')
        typeStats.rows.forEach(type => {
          console.log(`  ${type.type}: ${type.count}`)
        })
      }
    } catch (error) {
      console.error('Error getting stats:', error.message)
    }
  },

  async createTenant(name) {
    try {
      const result = await query('INSERT INTO tenants (name) VALUES ($1) RETURNING *', [name])
      console.log('Tenant created:', { id: result.rows[0].id, name: result.rows[0].name })
    } catch (error) {
      console.error('Error creating tenant:', error.message)
    }
  },

  async listTenants() {
    try {
      const result = await query('SELECT * FROM tenants ORDER BY id')
      console.log('Tenants:')
      result.rows.forEach(tenant => {
        console.log(`  ${tenant.id}: ${tenant.name}`)
      })
    } catch (error) {
      console.error('Error listing tenants:', error.message)
    }
  },

  async deleteUser(email) {
    try {
      const result = await query('DELETE FROM users WHERE email = $1 RETURNING email', [email])
      if (result.rows.length > 0) {
        console.log('User deleted:', result.rows[0].email)
      } else {
        console.log('User not found:', email)
      }
    } catch (error) {
      console.error('Error deleting user:', error.message)
    }
  },

  async resetDatabase() {
    try {
      console.log('⚠️  This will delete ALL data!')
      const readline = await import('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise(resolve => {
        rl.question('Are you sure? Type "yes" to confirm: ', resolve)
      })
      rl.close()

      if (answer.toLowerCase() === 'yes') {
        await query('TRUNCATE location_history, objects, users, tenants RESTART IDENTITY CASCADE')
        
        // Re-insert default data
        await query("INSERT INTO tenants (id, name) VALUES (1, 'Demo Company')")
        await User.create('admin@demo.com', 'password', 'admin', 1)
        
        console.log('✅ Database reset complete')
        console.log('Default admin user: admin@demo.com / password')
      } else {
        console.log('❌ Reset cancelled')
      }
    } catch (error) {
      console.error('Error resetting database:', error.message)
    }
  },

  async migrate() {
    try {
      const fs = await import('fs')
      const path = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const migrationFile = path.join(__dirname, 'migrate_add_created_by.sql')
      
      const migrationSQL = fs.readFileSync(migrationFile, 'utf8')
      await query(migrationSQL)
      console.log('✅ Migration completed successfully')
    } catch (error) {
      console.error('Error running migration:', error.message)
    }
  },

  async backup(filename) {
    try {
      const fs = await import('fs')
      const { spawn } = await import('child_process')
      
      const backupFile = filename || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
      
      const pg_dump = spawn('pg_dump', [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', process.env.DB_PORT || '5432',
        '-U', process.env.DB_USER || 'tracker_user',
        '-d', process.env.DB_NAME || 'location_tracker',
        '-f', backupFile
      ], {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      })

      pg_dump.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Database backed up to: ${backupFile}`)
        } else {
          console.error(`❌ Backup failed with code: ${code}`)
        }
      })
    } catch (error) {
      console.error('Error creating backup:', error.message)
    }
  },

  help() {
    console.log('Location Tracker Database Management')
    console.log('====================================')
    console.log('')
    console.log('User Management:')
    console.log('  createUser <email> <password> [role] [tenantId] - Create a new user')
    console.log('  listUsers - List all users')
    console.log('  deleteUser <email> - Delete a user')
    console.log('')
    console.log('Tenant Management:')
    console.log('  createTenant <name> - Create a new tenant')
    console.log('  listTenants - List all tenants')
    console.log('')
    console.log('Object Management:')
    console.log('  listObjects - List all objects')
    console.log('  deleteObject <id> - Delete an object')
    console.log('')
    console.log('Database Operations:')
    console.log('  stats - Show database statistics')
    console.log('  migrate - Run database migrations')
    console.log('  backup [filename] - Create database backup')
    console.log('  reset - Reset database (⚠️  removes all data)')
    console.log('')
    console.log('General:')
    console.log('  help - Show this help message')
    console.log('')
    console.log('Examples:')
    console.log('  node database/manage.js createUser user@example.com password123 user 1')
    console.log('  node database/manage.js createTenant "New Company"')
    console.log('  node database/manage.js deleteObject 5')
    console.log('  node database/manage.js backup my_backup.sql')
  }
}

async function main() {
  const [,, command, ...args] = process.argv

  if (!command || !commands[command]) {
    commands.help()
    process.exit(1)
  }

  try {
    await commands[command](...args)
  } catch (error) {
    console.error('Command failed:', error.message)
    process.exit(1)
  } finally {
    await closePool()
  }
}

main()