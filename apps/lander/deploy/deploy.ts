#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root (3 levels up: deploy -> lander -> apps -> project root)
const DEPLOY_DIR = import.meta.dirname;
const APP_DIR = path.resolve(DEPLOY_DIR, '..');
const PROJECT_ROOT = path.resolve(APP_DIR, '..', '..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} from '@aws-sdk/client-cloudformation';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import {
  STSClient,
  AssumeRoleCommand,
} from '@aws-sdk/client-sts';
import { execSync } from 'child_process';
import * as mimeTypes from 'mime-types';
import {
  checkBootstrapResources,
  printBootstrapInstructions,
  getBootstrapConfig,
  checkCredentials,
  promptForCredentials,
} from './bootstrap-check.js';
import { logger, setLogFile, closeLogFile } from './utils/logger.js';

// Parse command line arguments
const args = process.argv.slice(2);
function getStage(): string {
  const stageIdx = args.indexOf('--stage');
  if (stageIdx !== -1 && args[stageIdx + 1]) {
    return args[stageIdx + 1];
  }
  const stageArg = args.find((arg) => arg.startsWith('--stage='));
  if (stageArg) {
    return stageArg.replace('--stage=', '');
  }
  return 'dev';
}
const stage = getStage();
const frontendOnly = args.includes('--frontend-only');

// Configuration
const APP_NAME = 'puzzle-book-lander';
const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const CERTIFICATE_REGION = 'us-east-1';
const bootstrapConfig = getBootstrapConfig();
const TEMPLATE_BUCKET = bootstrapConfig.templateBucketName;
const STACK_NAME = `${APP_NAME}-${stage}`;
const CERTIFICATE_STACK_NAME = `${APP_NAME}-certificate-${stage}`;
const CFN_ROLE_ARN = bootstrapConfig.cfnRoleArn;

// Clients
const cfnClient = new CloudFormationClient({ region: REGION });
const cfnClientUsEast1 = new CloudFormationClient({ region: CERTIFICATE_REGION });
const s3Client = new S3Client({ region: REGION });
const stsClient = new STSClient({ region: REGION });

// Paths
const FRONTEND_DIR = path.join(APP_DIR, 'frontend');

interface StackOutputs {
  CloudFrontDistributionId?: string;
  CloudFrontDomainName?: string;
  WebsiteBucket?: string;
  SeedRoleArn?: string;
  [key: string]: string | undefined;
}

interface CertificateOutputs {
  MainCertificateArn?: string;
}

async function uploadFile(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  }));
}

async function uploadTemplates(): Promise<void> {
  console.log('\nUploading CloudFormation templates...');

  // Upload main template
  const mainTemplate = fs.readFileSync(path.join(DEPLOY_DIR, 'cfn-template.yaml'), 'utf-8');
  await uploadFile(TEMPLATE_BUCKET, 'cfn-template.yaml', mainTemplate, 'application/x-yaml');

  // Upload nested templates
  const resourcesDir = path.join(DEPLOY_DIR, 'resources');
  const dirs = fs.readdirSync(resourcesDir);

  for (const dir of dirs) {
    const dirPath = path.join(resourcesDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.yaml'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        await uploadFile(TEMPLATE_BUCKET, `resources/${dir}/${file}`, content, 'application/x-yaml');
        console.log(`  Uploaded: resources/${dir}/${file}`);
      }
    }
  }
}

async function stackExists(): Promise<boolean> {
  try {
    await cfnClient.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

async function certificateStackExists(): Promise<boolean> {
  try {
    await cfnClientUsEast1.send(new DescribeStacksCommand({ StackName: CERTIFICATE_STACK_NAME }));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

async function getCertificateStackOutputs(): Promise<CertificateOutputs> {
  const response = await cfnClientUsEast1.send(new DescribeStacksCommand({ StackName: CERTIFICATE_STACK_NAME }));
  const outputs: CertificateOutputs = {};

  for (const output of response.Stacks?.[0]?.Outputs || []) {
    if (output.OutputKey && output.OutputValue) {
      outputs[output.OutputKey as keyof CertificateOutputs] = output.OutputValue;
    }
  }

  return outputs;
}

async function deployCertificateStack(): Promise<CertificateOutputs> {
  const domainName = process.env.DOMAIN_NAME || '';
  const hostedZoneId = process.env.HOSTED_ZONE_ID || '';

  if (!domainName || !hostedZoneId) {
    console.log('  Skipping certificate stack (no domain configured)');
    return {};
  }

  console.log('\nDeploying certificate stack to us-east-1...');

  // Upload certificate template to S3
  const certTemplate = fs.readFileSync(path.join(DEPLOY_DIR, 'resources', 'Certificate', 'certificate.yaml'), 'utf-8');
  await uploadFile(TEMPLATE_BUCKET, 'resources/Certificate/certificate.yaml', certTemplate, 'application/x-yaml');
  console.log('  Uploaded: resources/Certificate/certificate.yaml');

  const templateUrl = `https://${TEMPLATE_BUCKET}.s3.${REGION}.amazonaws.com/resources/Certificate/certificate.yaml`;

  const parameters = [
    { ParameterKey: 'Stage', ParameterValue: stage },
    { ParameterKey: 'AppName', ParameterValue: APP_NAME },
    { ParameterKey: 'DomainName', ParameterValue: domainName },
    { ParameterKey: 'HostedZoneId', ParameterValue: hostedZoneId },
  ];

  const exists = await certificateStackExists();

  try {
    if (exists) {
      console.log(`  Updating certificate stack: ${CERTIFICATE_STACK_NAME}`);
      await cfnClientUsEast1.send(new UpdateStackCommand({
        StackName: CERTIFICATE_STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        RoleARN: CFN_ROLE_ARN,
      }));
      await waitUntilStackUpdateComplete(
        { client: cfnClientUsEast1, maxWaitTime: 600 },
        { StackName: CERTIFICATE_STACK_NAME }
      );
    } else {
      console.log(`  Creating certificate stack: ${CERTIFICATE_STACK_NAME}`);
      console.log('  Note: DNS validation may take a few minutes...');
      await cfnClientUsEast1.send(new CreateStackCommand({
        StackName: CERTIFICATE_STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        RoleARN: CFN_ROLE_ARN,
        DisableRollback: true,
      }));
      await waitUntilStackCreateComplete(
        { client: cfnClientUsEast1, maxWaitTime: 600 },
        { StackName: CERTIFICATE_STACK_NAME }
      );
    }
    console.log('  Certificate stack deployment complete!');
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('No updates are to be performed')) {
      console.log('  No certificate updates needed');
    } else {
      throw error;
    }
  }

  return getCertificateStackOutputs();
}

async function getStackOutputs(): Promise<StackOutputs> {
  const response = await cfnClient.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const outputs: StackOutputs = {};

  for (const output of response.Stacks?.[0]?.Outputs || []) {
    if (output.OutputKey && output.OutputValue) {
      outputs[output.OutputKey] = output.OutputValue;
    }
  }

  return outputs;
}

async function deployStack(certificateOutputs: CertificateOutputs): Promise<void> {
  console.log('\nDeploying CloudFormation stack...');

  const templateUrl = `https://${TEMPLATE_BUCKET}.s3.${REGION}.amazonaws.com/cfn-template.yaml`;
  const deployUserArn = process.env.DEPLOY_USER_ARN || '';
  const domainName = stage === 'prod' ? (process.env.DOMAIN_NAME || '') : '';
  const hostedZoneId = stage === 'prod' ? (process.env.HOSTED_ZONE_ID || '') : '';
  const certificateArn = stage === 'prod' ? (certificateOutputs.MainCertificateArn || process.env.CERTIFICATE_ARN || '') : '';

  const parameters = [
    { ParameterKey: 'Stage', ParameterValue: stage },
    { ParameterKey: 'AppName', ParameterValue: APP_NAME },
    { ParameterKey: 'TemplateBucketName', ParameterValue: TEMPLATE_BUCKET },
    { ParameterKey: 'DeployUserArn', ParameterValue: deployUserArn },
    { ParameterKey: 'DomainName', ParameterValue: domainName },
    { ParameterKey: 'HostedZoneId', ParameterValue: hostedZoneId },
    { ParameterKey: 'CertificateArn', ParameterValue: certificateArn },
  ];

  const exists = await stackExists();

  try {
    if (exists) {
      console.log(`Updating stack: ${STACK_NAME}`);
      console.log(`Using CFN Role: ${CFN_ROLE_ARN}`);
      await cfnClient.send(new UpdateStackCommand({
        StackName: STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        RoleARN: CFN_ROLE_ARN,
      }));
      await waitUntilStackUpdateComplete(
        { client: cfnClient, maxWaitTime: 900 },
        { StackName: STACK_NAME }
      );
    } else {
      console.log(`Creating stack: ${STACK_NAME}`);
      console.log(`Using CFN Role: ${CFN_ROLE_ARN}`);
      await cfnClient.send(new CreateStackCommand({
        StackName: STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        RoleARN: CFN_ROLE_ARN,
        DisableRollback: true,
      }));
      await waitUntilStackCreateComplete(
        { client: cfnClient, maxWaitTime: 900 },
        { StackName: STACK_NAME }
      );
    }
    console.log('Stack deployment complete!');
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('No updates are to be performed')) {
      console.log('No infrastructure updates needed');
    } else {
      throw error;
    }
  }
}

async function buildFrontend(): Promise<void> {
  console.log('\nBuilding frontend...');

  // Build Next.js static export
  execSync('yarn build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
}

async function deployFrontend(outputs: StackOutputs): Promise<void> {
  console.log('\nDeploying frontend to S3...');

  const outDir = path.join(FRONTEND_DIR, 'out');
  if (!fs.existsSync(outDir)) {
    throw new Error('Frontend build output not found. Run build first. Make sure next.config.js has output: "export"');
  }

  // Assume the seed role for S3/CloudFront access
  if (!outputs.SeedRoleArn) {
    throw new Error('SeedRoleArn not found in stack outputs. Make sure DEPLOY_USER_ARN is set in .env');
  }

  console.log('  Assuming seed role for deployment...');
  const assumeRoleResponse = await stsClient.send(new AssumeRoleCommand({
    RoleArn: outputs.SeedRoleArn,
    RoleSessionName: 'deploy-frontend',
    ExternalId: `${APP_NAME}-seed-${stage}`,
    DurationSeconds: 3600,
  }));

  const credentials = assumeRoleResponse.Credentials!;

  // Create clients with assumed role credentials
  const seedS3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: credentials.AccessKeyId!,
      secretAccessKey: credentials.SecretAccessKey!,
      sessionToken: credentials.SessionToken!,
    },
  });

  const seedCfClient = new CloudFrontClient({
    region: REGION,
    credentials: {
      accessKeyId: credentials.AccessKeyId!,
      secretAccessKey: credentials.SecretAccessKey!,
      sessionToken: credentials.SessionToken!,
    },
  });

  const bucket = outputs.WebsiteBucket!;

  // Upload all files using assumed role
  const uploadDir = async (dir: string, prefix: string = ''): Promise<void> => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await uploadDir(fullPath, key);
      } else {
        const content = fs.readFileSync(fullPath);
        const contentType = mimeTypes.lookup(entry.name) || 'application/octet-stream';
        await seedS3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content,
          ContentType: contentType,
        }));
      }
    }
  };

  await uploadDir(outDir);
  console.log('  Frontend uploaded to S3');

  // Invalidate CloudFront
  console.log('  Invalidating CloudFront cache...');
  await seedCfClient.send(new CreateInvalidationCommand({
    DistributionId: outputs.CloudFrontDistributionId,
    InvalidationBatch: {
      Paths: {
        Quantity: 1,
        Items: ['/*'],
      },
      CallerReference: Date.now().toString(),
    },
  }));

  console.log(`\nFrontend deployed to: https://${outputs.CloudFrontDomainName}`);
}

function cleanupOldFiles(dir: string, pattern: RegExp, keepLatest: number = 0): void {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir)
    .filter((f) => pattern.test(f))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(keepLatest);
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
      console.log(`  Deleted old file: ${file.name}`);
    } catch {
      // Ignore deletion errors
    }
  }
}

async function main(): Promise<void> {
  // Set up logging to file
  const logDir = path.join(PROJECT_ROOT, '.cache', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Clean up old log files
  console.log('Cleaning up old log files...');
  cleanupOldFiles(logDir, /^deploy-rocket-.*\.log$/, 0);

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const action = frontendOnly ? 'frontend' : 'full';
  const logFile = path.join(logDir, `deploy-rocket-${stage}-${action}-${timestamp}.log`);
  setLogFile(logFile);
  logger.info(`Logging to: ${logFile}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Puzzle Book Lander Deployment - Stage: ${stage}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Check AWS credentials first
    console.log('Checking AWS credentials...');
    const { valid } = await checkCredentials();

    if (!valid) {
      const success = await promptForCredentials();
      if (!success) {
        process.exit(1);
      }
    } else {
      console.log('AWS credentials OK\n');
    }

    // Check bootstrap resources (unless frontend-only)
    if (!frontendOnly) {
      console.log('Checking bootstrap resources...');
      const bootstrap = await checkBootstrapResources();

      if (!bootstrap.ready) {
        printBootstrapInstructions(bootstrap);
        process.exit(1);
      }
      console.log('Bootstrap resources OK\n');
    }

    if (frontendOnly) {
      const outputs = await getStackOutputs();
      await buildFrontend();
      await deployFrontend(outputs);
    } else {
      // Deploy certificate stack first (only for prod with custom domain)
      let certificateOutputs: CertificateOutputs = {};
      if (stage === 'prod') {
        certificateOutputs = await deployCertificateStack();
      }

      await uploadTemplates();
      await deployStack(certificateOutputs);

      const outputs = await getStackOutputs();
      console.log('\nStack Outputs:', JSON.stringify(outputs, null, 2));

      await buildFrontend();
      await deployFrontend(outputs);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Deployment complete!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\nDeployment failed:', error);
    closeLogFile();
    process.exit(1);
  } finally {
    closeLogFile();
  }
}

main();
