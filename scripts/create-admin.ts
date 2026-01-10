import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = 'admin'
    const password = '123456'
    const name = 'Admin'
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('Admin user already exists!')
      console.log('Email:', existingUser.email)
      console.log('Name:', existingUser.name)
      console.log('Role:', existingUser.role)
      
      // Update to admin role if not already
      if (existingUser.role !== UserRole.ADMIN) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: UserRole.ADMIN }
        })
        console.log('Updated user role to ADMIN')
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      })
      console.log('Password updated to: 123456')
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.ADMIN,
      },
    })

    console.log('Admin user created successfully!')
    console.log('Email:', admin.email)
    console.log('Name:', admin.name)
    console.log('Role:', admin.role)
    console.log('Password: 123456')
  } catch (error) {
    console.error('Error creating admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()