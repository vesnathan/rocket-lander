/**
 * Bootstrap Resource Checker for Puzzle Book
 *
 * Checks that the required bootstrap resources exist before deployment can proceed.
 * These resources must be created manually (one-time setup) for security reasons.
 *
 * BOOTSTRAP RESOURCES:
 * ===================
 *
 * 1. S3 Bucket: rocket-lander-deploy-templates (in ap-southeast-2)
 *    - Stores CloudFormation templates
 *    - Only the deploy user and CloudFormation need access
 *
 * 2. IAM Role: rocket-lander-cfn-role
 *    - CloudFormation assumes this role to create resources
 *    - Has permissions to create all required AWS resources
 *
 * 3. IAM User: puzzle-book-deploy
 *    - The deployment user with minimal permissions
 *    - Inline policy from deploy/iam-policies/puzzle-book-deploy-policy.json
 */

import {
  S3Client,
  GetBucketLocationCommand,
} from "@aws-sdk/client-s3";
import {
  IAMClient,
  GetRoleCommand,
  GetUserCommand,
} from "@aws-sdk/client-iam";
import {
  STSClient,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || "430118819356";
const MAIN_REGION = "ap-southeast-2";
const TEMPLATE_BUCKET_NAME = "rocket-lander-deploy-templates";
const DEPLOY_USER_NAME = "puzzle-book-deploy";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function updateEnvFile(accessKeyId: string, secretAccessKey: string): void {
  const envPath = path.resolve(import.meta.dirname, '..', '..', '..', '.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  if (content.includes('AWS_ACCESS_KEY_ID=')) {
    content = content.replace(/AWS_ACCESS_KEY_ID=.*/g, `AWS_ACCESS_KEY_ID=${accessKeyId}`);
  } else {
    content = `AWS_ACCESS_KEY_ID=${accessKeyId}\n${content}`;
  }

  if (content.includes('AWS_SECRET_ACCESS_KEY=')) {
    content = content.replace(/AWS_SECRET_ACCESS_KEY=.*/g, `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
  } else {
    content = `AWS_SECRET_ACCESS_KEY=${secretAccessKey}\n${content}`;
  }

  fs.writeFileSync(envPath, content);
}

export async function checkCredentials(): Promise<{ valid: boolean; identity?: string }> {
  const sts = new STSClient({ region: MAIN_REGION });
  try {
    const response = await sts.send(new GetCallerIdentityCommand({}));
    return { valid: true, identity: response.Arn };
  } catch {
    return { valid: false };
  }
}

export async function promptForCredentials(): Promise<boolean> {
  const policyJson = JSON.stringify({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "CloudFormationManagement",
        "Effect": "Allow",
        "Action": ["cloudformation:CreateStack","cloudformation:UpdateStack","cloudformation:DeleteStack","cloudformation:DescribeStacks","cloudformation:DescribeStackEvents","cloudformation:DescribeStackResources","cloudformation:GetTemplate","cloudformation:ValidateTemplate","cloudformation:ListStackResources"],
        "Resource": ["arn:aws:cloudformation:ap-southeast-2:*:stack/puzzle-book-*/*","arn:aws:cloudformation:us-east-1:*:stack/puzzle-book-*/*"]
      },
      {
        "Sid": "TemplateBucketAccess",
        "Effect": "Allow",
        "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
        "Resource": ["arn:aws:s3:::rocket-lander-deploy-templates","arn:aws:s3:::rocket-lander-deploy-templates/*"]
      },
      {
        "Sid": "PassCfnRole",
        "Effect": "Allow",
        "Action": "iam:PassRole",
        "Resource": "arn:aws:iam::*:role/rocket-lander-cfn-role"
      },
      {
        "Sid": "GetCfnRole",
        "Effect": "Allow",
        "Action": ["iam:GetRole","iam:GetUser"],
        "Resource": ["arn:aws:iam::*:role/rocket-lander-cfn-role","arn:aws:iam::*:user/puzzle-book-deploy"]
      },
      {
        "Sid": "STSAssumeRole",
        "Effect": "Allow",
        "Action": "sts:AssumeRole",
        "Resource": "arn:aws:iam::*:role/puzzle-book-*-seed-role-*"
      },
      {
        "Sid": "STSGetCallerIdentity",
        "Effect": "Allow",
        "Action": "sts:GetCallerIdentity",
        "Resource": "*"
      },
      {
        "Sid": "S3GetBucketLocation",
        "Effect": "Allow",
        "Action": "s3:GetBucketLocation",
        "Resource": "arn:aws:s3:::rocket-lander-deploy-templates"
      }
    ]
  });

  console.log(`
${"=".repeat(70)}
  AWS CREDENTIALS INVALID OR MISSING
${"=".repeat(70)}

The AWS credentials in .env are invalid or expired.

You need access keys for the puzzle-book-deploy IAM user.

CloudShell Commands (copy & paste each line):

aws iam create-user --user-name puzzle-book-deploy

aws iam put-user-policy --user-name puzzle-book-deploy --policy-name puzzle-book-deploy-policy --policy-document '${policyJson}'

aws iam create-access-key --user-name puzzle-book-deploy

Then enter the access key credentials below:
`);

  const accessKeyId = await prompt("Enter AWS_ACCESS_KEY_ID: ");
  if (!accessKeyId) {
    console.log("\nNo access key provided. Exiting.");
    return false;
  }

  const secretAccessKey = await prompt("Enter AWS_SECRET_ACCESS_KEY: ");
  if (!secretAccessKey) {
    console.log("\nNo secret key provided. Exiting.");
    return false;
  }

  console.log("\nValidating credentials...");
  process.env.AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;

  const { valid, identity } = await checkCredentials();
  if (!valid) {
    console.log("Invalid credentials. Please check and try again.");
    return false;
  }

  console.log(`Credentials valid! Identity: ${identity}`);

  updateEnvFile(accessKeyId, secretAccessKey);
  console.log("Credentials saved to .env\n");

  return true;
}

export interface BootstrapConfig {
  templateBucketName: string;
  cfnRoleName: string;
  cfnRoleArn: string;
  deployUserName: string;
  region: string;
}

export function getBootstrapConfig(): BootstrapConfig {
  const cfnRoleArn = process.env.CFN_ROLE_ARN || `arn:aws:iam::${ACCOUNT_ID}:role/rocket-lander-cfn-role`;
  const cfnRoleName = cfnRoleArn.split('/').pop() || 'rocket-lander-cfn-role';

  return {
    templateBucketName: TEMPLATE_BUCKET_NAME,
    cfnRoleName,
    cfnRoleArn,
    deployUserName: DEPLOY_USER_NAME,
    region: MAIN_REGION,
  };
}

export interface BootstrapCheckResult {
  ready: boolean;
  missingBucket: boolean;
  missingRole: boolean;
  missingUser: boolean;
  config: BootstrapConfig;
}

export async function checkBootstrapResources(): Promise<BootstrapCheckResult> {
  const config = getBootstrapConfig();

  const s3 = new S3Client({ region: MAIN_REGION });
  const iam = new IAMClient({ region: MAIN_REGION });

  let missingBucket = false;
  let missingRole = false;
  let missingUser = false;

  try {
    await s3.send(new GetBucketLocationCommand({ Bucket: config.templateBucketName }));
  } catch {
    missingBucket = true;
  }

  try {
    await iam.send(new GetRoleCommand({ RoleName: config.cfnRoleName }));
  } catch {
    missingRole = true;
  }

  try {
    await iam.send(new GetUserCommand({ UserName: config.deployUserName }));
  } catch {
    missingUser = true;
  }

  const ready = !missingBucket && !missingRole && !missingUser;

  return {
    ready,
    missingBucket,
    missingRole,
    missingUser,
    config,
  };
}

export function printBootstrapInstructions(result: BootstrapCheckResult): void {
  const { missingBucket, missingRole, missingUser, config } = result;

  if (missingBucket) {
    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 1/3: S3 Template Bucket
${"=".repeat(70)}

Create an S3 bucket named: ${config.templateBucketName}

${"─".repeat(70)}
CloudShell Command (copy & paste):
${"─".repeat(70)}

aws s3 mb s3://${config.templateBucketName} --region ap-southeast-2

${"=".repeat(70)}
  After creating the bucket, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }

  if (missingRole) {
    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 2/3: CloudFormation Service Role
${"=".repeat(70)}

Create an IAM role named: ${config.cfnRoleName}

${"─".repeat(70)}
CloudShell Commands (copy & paste each line):
${"─".repeat(70)}

aws iam create-role --role-name ${config.cfnRoleName} --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"cloudformation.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy --role-name ${config.cfnRoleName} --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

${"=".repeat(70)}
  After creating the role, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }

  if (missingUser) {
    const policyJson = JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "CloudFormationManagement",
          "Effect": "Allow",
          "Action": [
            "cloudformation:CreateStack",
            "cloudformation:UpdateStack",
            "cloudformation:DeleteStack",
            "cloudformation:DescribeStacks",
            "cloudformation:DescribeStackEvents",
            "cloudformation:DescribeStackResources",
            "cloudformation:GetTemplate",
            "cloudformation:ValidateTemplate",
            "cloudformation:ListStackResources"
          ],
          "Resource": [
            "arn:aws:cloudformation:ap-southeast-2:*:stack/puzzle-book-*/*",
            "arn:aws:cloudformation:us-east-1:*:stack/puzzle-book-*/*"
          ]
        },
        {
          "Sid": "TemplateBucketAccess",
          "Effect": "Allow",
          "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
          "Resource": [
            "arn:aws:s3:::rocket-lander-deploy-templates",
            "arn:aws:s3:::rocket-lander-deploy-templates/*"
          ]
        },
        {
          "Sid": "PassCfnRole",
          "Effect": "Allow",
          "Action": "iam:PassRole",
          "Resource": "arn:aws:iam::*:role/rocket-lander-cfn-role"
        },
        {
          "Sid": "GetCfnRole",
          "Effect": "Allow",
          "Action": ["iam:GetRole", "iam:GetUser"],
          "Resource": [
            "arn:aws:iam::*:role/rocket-lander-cfn-role",
            "arn:aws:iam::*:user/puzzle-book-deploy"
          ]
        },
        {
          "Sid": "STSAssumeRole",
          "Effect": "Allow",
          "Action": "sts:AssumeRole",
          "Resource": "arn:aws:iam::*:role/puzzle-book-*-seed-role-*"
        },
        {
          "Sid": "STSGetCallerIdentity",
          "Effect": "Allow",
          "Action": "sts:GetCallerIdentity",
          "Resource": "*"
        },
        {
          "Sid": "S3GetBucketLocation",
          "Effect": "Allow",
          "Action": "s3:GetBucketLocation",
          "Resource": "arn:aws:s3:::rocket-lander-deploy-templates"
        }
      ]
    });

    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 3/3: Deploy IAM User
${"=".repeat(70)}

Create an IAM user named: ${config.deployUserName}

${"─".repeat(70)}
CloudShell Commands (copy & paste each line):
${"─".repeat(70)}

aws iam create-user --user-name ${config.deployUserName}

aws iam put-user-policy --user-name ${config.deployUserName} --policy-name ${config.deployUserName}-policy --policy-document '${policyJson}'

aws iam create-access-key --user-name ${config.deployUserName}

${"─".repeat(70)}
IMPORTANT: Save the AccessKeyId and SecretAccessKey from the output above!
Add them to your .env file:

  AWS_ACCESS_KEY_ID=<AccessKeyId>
  AWS_SECRET_ACCESS_KEY=<SecretAccessKey>
  DEPLOY_USER_ARN=arn:aws:iam::<account-id>:user/${config.deployUserName}
${"─".repeat(70)}

${"=".repeat(70)}
  After creating the user and saving credentials, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }
}
