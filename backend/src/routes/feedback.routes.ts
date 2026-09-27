import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbacksQuerySchema,
} from '../schemas/feedback.schema';
import * as controller from '../controllers/feedback.controller';

export const feedbackRouter = Router();

feedbackRouter.post('/', validate(createFeedbackSchema, 'body'), controller.create);
feedbackRouter.get('/', validate(listFeedbacksQuerySchema, 'query'), controller.list);
// Registrada antes de /:id para não colidir (D-04).
feedbackRouter.get('/metrics', controller.metrics);
feedbackRouter.get('/:id', validate(feedbackIdParamSchema, 'params'), controller.getById);
