import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkDuplicates, dashboard, getMap, create, getAll, getMine, getOne, remove, statisticsMine, update, updateMine, updateStatus, updatesMine } from '../controllers/issue.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { issuePriorities, issueStatuses } from '../models/Issue.js';
import { imageUpload, validateImageContent } from '../middleware/upload.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

export const issueRouter = Router();
const imageUploadRateLimit = createRateLimiter({
  ...env.rateLimits.imageUpload,
  message: 'Too many issue image uploads. Please try again later.',
});
const duplicateCheckRateLimit = createRateLimiter({
  ...env.rateLimits.duplicateCheck,
  message: 'Too many similar report checks. Please try again later.',
});

const listQueryValidation = [
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Page must be between 1 and 100000.'),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).withMessage('Page size must be between 1 and 50.'),
  query('status').optional().isIn(issueStatuses).withMessage('Select a valid complaint status.'),
  query('priority').optional().isIn(issuePriorities).withMessage('Select a valid complaint priority.'),
  query('category').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Category filter must be between 2 and 80 characters.'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search text cannot exceed 100 characters.'),
  query('sort').optional().isIn(['newest', 'oldest', 'priority']).withMessage('Sort must be newest, oldest, or priority.'),
  query('department').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Department filter must be between 2 and 120 characters.'),
  validateRequest,
];

issueRouter.use(authenticate);

const validateCoordinates = [
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.').toFloat(),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.').toFloat(),
  body().custom((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const hasLatitude = value.latitude !== undefined;
    const hasLongitude = value.longitude !== undefined;
    return hasLatitude === hasLongitude;
  }).withMessage('Latitude and longitude must be provided together.'),
];

issueRouter.get('/map', authorize('citizen', 'authority', 'admin'), getMap);
issueRouter.get('/dashboard', authorize('authority', 'admin'), dashboard);
issueRouter.post('/duplicates', authorize('citizen'), duplicateCheckRateLimit, [
  body('title').trim().isLength({ min: 5, max: 160 }).withMessage('Title must be between 5 and 160 characters.'),
  body('description').trim().isLength({ min: 15, max: 5000 }).withMessage('Description must be between 15 and 5000 characters.'),
  body('category').trim().isLength({ min: 2, max: 80 }).withMessage('Category is required.'),
  ...validateCoordinates,
  validateRequest,
], checkDuplicates);

issueRouter.post('/', authorize('citizen'), imageUploadRateLimit, imageUpload.single('image'), validateImageContent, [
  body('title').trim().isLength({ min: 5, max: 160 }).withMessage('Title must be between 5 and 160 characters.'),
  body('description').trim().isLength({ min: 15, max: 5000 }).withMessage('Description must be between 15 and 5000 characters.'),
  body('category').trim().isLength({ min: 2, max: 80 }).withMessage('Category is required.'),
  body('priority').isIn(issuePriorities).withMessage('A valid priority is required.'),
  body('location').trim().isLength({ min: 2, max: 250 }).withMessage('Location is required.'),
  body('anonymous').optional().isBoolean().toBoolean(),
  body('emergency').optional().isBoolean().toBoolean(),
  ...validateCoordinates,
  body('analysisToken').optional().isString().isLength({ min: 20, max: 4096 }).withMessage('A valid AI analysis receipt is required.'),
  body('aiReviewState').optional().isIn(['accepted', 'edited', 'rejected']).withMessage('A valid AI review state is required.'),
  body('aiSummary').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('AI summary must be between 1 and 2000 characters.'),
  validateRequest,
], create);

issueRouter.get('/mine', authorize('citizen'), listQueryValidation, getMine);
issueRouter.get('/mine/stats', authorize('citizen'), statisticsMine);
issueRouter.get('/mine/updates', authorize('citizen'), updatesMine);
issueRouter.patch('/mine/:issueId', [
  param('issueId').isMongoId().withMessage('A valid issue identifier is required.'),
  body('title').optional().trim().isLength({ min: 5, max: 160 }).withMessage('Title must be between 5 and 160 characters.'),
  body('description').optional().trim().isLength({ min: 15, max: 5000 }).withMessage('Description must be between 15 and 5000 characters.'),
  body('category').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Category must be between 2 and 80 characters.'),
  body('priority').optional().isIn(issuePriorities).withMessage('A valid priority is required.'),
  body('location').optional().trim().isLength({ min: 2, max: 250 }).withMessage('Location must be between 2 and 250 characters.'),
  body('anonymous').optional().isBoolean().toBoolean(),
  body('emergency').optional().isBoolean().toBoolean(),
  body().custom((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value as Record<string, unknown>);
    const editable = ['title', 'description', 'category', 'priority', 'location', 'anonymous', 'emergency'];
    return keys.length > 0 && keys.every((key) => editable.includes(key));
  }).withMessage('Provide editable complaint fields only.'),
  validateRequest,
], authorize('citizen'), updateMine);

issueRouter.get('/', authorize('authority', 'admin'), listQueryValidation, getAll);

issueRouter.patch('/:issueId/status', [
  param('issueId').isMongoId().withMessage('A valid issue identifier is required.'),
  body('status').isIn(['Assigned', 'In Progress', 'Resolved', 'Rejected']).withMessage('A valid next status is required.'),
  body().custom((value) => Object.keys(value as Record<string, unknown>).length === 1 && Object.hasOwn(value, 'status')).withMessage('Only a status update is allowed.'),
  validateRequest,
], authorize('authority', 'admin'), updateStatus);

issueRouter.get('/:issueId', [param('issueId').isMongoId().withMessage('A valid issue identifier is required.'), validateRequest], authorize('authority', 'admin'), getOne);

issueRouter.patch('/:issueId', [
  param('issueId').isMongoId().withMessage('A valid issue identifier is required.'),
  body('status').optional().isIn(['Assigned', 'In Progress', 'Resolved', 'Rejected']).withMessage('A valid next status is required.'),
  body('assignedDepartment').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Department must be between 2 and 120 characters.'),
  body('remarks').optional().isString().trim().isLength({ max: 2000 }).withMessage('Remarks cannot exceed 2000 characters.'),
  body().custom((value, { req }) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value as Record<string, unknown>);
    const allowed = req.auth?.role === 'admin' ? ['status', 'assignedDepartment', 'remarks'] : ['status', 'remarks'];
    return keys.length > 0 && keys.every((key) => allowed.includes(key));
  }).withMessage('Provide supported issue update fields only.'),
  validateRequest,
], authorize('authority', 'admin'), update);

issueRouter.delete('/:issueId', [param('issueId').isMongoId().withMessage('A valid issue identifier is required.'), validateRequest], authorize('admin'), remove);
