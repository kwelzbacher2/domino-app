/**
 * AWS Secrets Manager integration
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

/**
 * Get database credentials from AWS Secrets Manager
 */
export async function getDatabaseCredentials(): Promise<DatabaseCredentials> {
  const secretArn = process.env.DB_SECRET_ARN;
  
  if (!secretArn) {
    throw new Error('DB_SECRET_ARN environment variable not set');
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const secret = JSON.parse(response.SecretString);
    return secret as DatabaseCredentials;
  } catch (error) {
    console.error('Failed to get database credentials from Secrets Manager:', error);
    throw error;
  }
}

/**
 * Build PostgreSQL connection string from credentials
 */
export function buildConnectionString(creds: DatabaseCredentials): string {
  return `postgresql://${creds.username}:${creds.password}@${creds.host}:${creds.port}/${creds.dbname}`;
}
