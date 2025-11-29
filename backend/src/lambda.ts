/**
 * Lambda handler for serverless deployment
 * Wraps the Express app using serverless-http
 */

import serverless from 'serverless-http';
import { app } from './server';

// Wrap Express app for Lambda with error handling
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  console.log('Lambda invoked:', {
    path: event.rawPath || event.path,
    method: event.requestContext?.http?.method || event.httpMethod,
  });

  try {
    const result = await serverlessHandler(event, context);
    console.log('Lambda response:', {
      statusCode: (result as any).statusCode,
    });
    return result;
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
