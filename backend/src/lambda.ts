/**
 * Lambda handler for serverless deployment
 * Wraps the Express app using serverless-http
 */

import serverless from 'serverless-http';
import { app } from './server';

// Wrap Express app for Lambda
export const handler = serverless(app);
