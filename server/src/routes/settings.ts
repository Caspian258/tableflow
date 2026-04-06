import type { FastifyInstance } from 'fastify'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import {
  getRestaurant,
  updateRestaurant,
  createTable,
  updateTable,
  deleteTable,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listStaff,
  createStaff,
  toggleStaffActive,
  resetStaffPin,
  getOnboardingStatus,
} from '../controllers/settings.controller.js'

const managerRoles = requireRole('owner', 'manager')

export async function settingsRoutes(app: FastifyInstance) {
  // ─── Restaurante ───────────────────────────────────────────────────────────
  app.get('/restaurant', { preHandler: [authenticate, managerRoles] }, getRestaurant)
  app.patch('/restaurant', { preHandler: [authenticate, managerRoles] }, updateRestaurant)

  // ─── Mesas ─────────────────────────────────────────────────────────────────
  app.post('/tables', { preHandler: [authenticate, managerRoles] }, createTable)
  app.patch('/tables/:id', { preHandler: [authenticate, managerRoles] }, updateTable)
  app.delete('/tables/:id', { preHandler: [authenticate, managerRoles] }, deleteTable)

  // ─── Menú ──────────────────────────────────────────────────────────────────
  app.get('/menu/categories', { preHandler: [authenticate, managerRoles] }, listCategories)
  app.post('/menu/categories', { preHandler: [authenticate, managerRoles] }, createCategory)
  app.patch('/menu/categories/:id', { preHandler: [authenticate, managerRoles] }, updateCategory)
  app.delete('/menu/categories/:id', { preHandler: [authenticate, managerRoles] }, deleteCategory)

  app.post('/menu/items', { preHandler: [authenticate, managerRoles] }, createMenuItem)
  app.patch('/menu/items/:id', { preHandler: [authenticate, managerRoles] }, updateMenuItem)
  app.delete('/menu/items/:id', { preHandler: [authenticate, managerRoles] }, deleteMenuItem)

  // ─── Personal ──────────────────────────────────────────────────────────────
  app.get('/staff', { preHandler: [authenticate, managerRoles] }, listStaff)
  app.post('/staff', { preHandler: [authenticate, managerRoles] }, createStaff)
  app.patch('/staff/:id/toggle-active', { preHandler: [authenticate, managerRoles] }, toggleStaffActive)
  app.patch('/staff/:id/reset-pin', { preHandler: [authenticate, managerRoles] }, resetStaffPin)

  // ─── Onboarding ────────────────────────────────────────────────────────────
  app.get('/onboarding', { preHandler: authenticate }, getOnboardingStatus)
}
