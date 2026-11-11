
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

async function readJson(file, fallback) {
  try {
    return JSON.parse(
      await fs.readFile(path.join(DATA_DIR, file), 'utf8')
    )
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function main() {
  const admin = await readJson('admin.json', null)
  const projects = await readJson('projects.json', [])

  if (admin) {
    await prisma.admin.upsert({
      where: { id: 'admin' },
      update: {
        username: admin.username,
        salt: admin.salt,
        hash: admin.hash
      },
      create: {
        id: 'admin',
        username: admin.username,
        salt: admin.salt,
        hash: admin.hash
      }
    })
  }

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt)
      },
      create: {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt)
      }
    })
  }

  await prisma.menu.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      header: [
        { id: 'home', label: 'Home', url: '/#home' },
        { id: 'about', label: 'About', url: '/#about' },
        { id: 'projects', label: 'Projects', url: '/#projects' },
        { id: 'journal', label: 'Journal', url: '/#blogs' },
        { id: 'opportunities', label: 'Opportunities', url: '/#opportunities' },
        { id: 'approach', label: 'Approach', url: '/#approach' },
        { id: 'contact', label: 'Contact', url: '/#contact' }
      ],
      footer: [
        { id: 'about', label: 'About', url: '/#about' },
        { id: 'projects', label: 'Projects', url: '/#projects' },
        { id: 'contact', label: 'Contact', url: '/#contact' }
      ]
    }
  })

  const defaultForms = [
    {
      id: 'contact',
      title: 'Contact form',
      submitLabel: 'Send enquiry',
      successMessage: 'Thank you. We will be in touch.',
      fields: [
        { name: 'name', label: 'Your name', type: 'text', required: true },
        { name: 'email', label: 'Email address', type: 'email', required: true },
        { name: 'phone', label: 'Phone number', type: 'tel' },
        { name: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    },
    {
      id: 'landowner',
      title: 'Landowner enquiry',
      submitLabel: 'Submit land details',
      successMessage: 'Thank you. We will review your details.',
      fields: [
        { name: 'name', label: 'Your name', type: 'text', required: true },
        { name: 'email', label: 'Email address', type: 'email', required: true },
        { name: 'phone', label: 'Phone number', type: 'tel' },
        { name: 'location', label: 'Land location', type: 'text' },
        { name: 'message', label: 'Property details', type: 'textarea' }
      ]
    },
    {
      id: 'partner',
      title: 'Channel partner enquiry',
      submitLabel: 'Start a conversation',
      successMessage: 'Thank you. We will contact you shortly.',
      fields: [
        { name: 'name', label: 'Your name', type: 'text', required: true },
        { name: 'email', label: 'Email address', type: 'email' },
        { name: 'phone', label: 'Phone number', type: 'tel' },
        { name: 'message', label: 'How can we work together?', type: 'textarea' }
      ]
    }
  ]

  for (const form of defaultForms) {
    await prisma.form.upsert({
      where: { id: form.id },
      update: {},
      create: form
    })
  }

  await prisma.siteSetting.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      siteName: '46Spaces',
      logoUrl: '/assets/logo.png',
      faviconUrl: '/favicon.svg',
      tagline: 'Land. Ideas. Possibility.',
      contactEmail: 'hello@46spaces.com',
      blogSectionTitle: 'Notes & perspectives',
      blogSectionDescription: 'Ideas, insights and stories from 46Spaces.',
      postsPerPage: 6,
      showBlogSection: true,
      seoTitle: '46Spaces — Land. Ideas. Possibility.'
    }
  })

  console.log('46Spaces seed completed successfully.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
