# Claude Instructions

## Project Structure
```
puzzle-book/                    # Monorepo for puzzle-book.games
├── apps/
│   └── lander/                 # Rocket Lander game (lander.puzzle-book.games)
│       ├── frontend/           # Next.js frontend
│       └── deploy/             # App-specific deployment
├── shared/                     # Shared types across apps
│   └── types/                  # TypeScript type definitions
├── shared-infra/               # Shared AWS infrastructure (DNS, etc.)
└── .env                        # Environment configuration
```

## Development Server
- NEVER start the dev server (`yarn dev`, `npm run dev`, etc.) - user manages this separately
- From root: `yarn dev:lander` or `cd apps/lander/frontend && yarn dev`

## Game Design Rules
- Level timer and total run timer (bottom corners) must ALWAYS run - including in start bubble, never pause
- Time bonus is awarded at end of each level based on completion time
- Multiplier bubbles increase end-of-stage score multiplier (riskier routes = higher multipliers)
- End-of-level screen: overlay with animated score counting up (time -> multiplier -> final score)

## Deployment
- NEVER run deploy commands - user manages deployments
- Deploy lander: `yarn deploy:lander:prod`
- Deploy shared infra: `yarn deploy:shared-infra:prod`

## Bootstrap Resources (one-time setup)
The following AWS resources must exist before deployment:

1. **S3 Bucket**: `rocket-lander-deploy-templates` (ap-southeast-2) - stores CloudFormation templates
2. **IAM Role**: `rocket-lander-cfn-role` - CloudFormation execution role with AdministratorAccess
3. **IAM User**: `puzzle-book-deploy` - deployment user with minimal permissions

### Create Deploy User (CloudShell)
```bash
aws iam create-user --user-name puzzle-book-deploy

aws iam put-user-policy --user-name puzzle-book-deploy --policy-name puzzle-book-deploy-policy --policy-document '{"Version":"2012-10-17","Statement":[{"Sid":"CloudFormationManagement","Effect":"Allow","Action":["cloudformation:CreateStack","cloudformation:UpdateStack","cloudformation:DeleteStack","cloudformation:DescribeStacks","cloudformation:DescribeStackEvents","cloudformation:DescribeStackResources","cloudformation:GetTemplate","cloudformation:ValidateTemplate","cloudformation:ListStackResources"],"Resource":["arn:aws:cloudformation:ap-southeast-2:*:stack/puzzle-book-*/*","arn:aws:cloudformation:us-east-1:*:stack/puzzle-book-*/*"]},{"Sid":"TemplateBucketAccess","Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],"Resource":["arn:aws:s3:::rocket-lander-deploy-templates","arn:aws:s3:::rocket-lander-deploy-templates/*"]},{"Sid":"PassCfnRole","Effect":"Allow","Action":"iam:PassRole","Resource":"arn:aws:iam::*:role/rocket-lander-cfn-role"},{"Sid":"GetCfnRole","Effect":"Allow","Action":["iam:GetRole","iam:GetUser"],"Resource":["arn:aws:iam::*:role/rocket-lander-cfn-role","arn:aws:iam::*:user/puzzle-book-deploy"]},{"Sid":"STSAssumeRole","Effect":"Allow","Action":"sts:AssumeRole","Resource":"arn:aws:iam::*:role/puzzle-book-*-seed-role-*"},{"Sid":"STSGetCallerIdentity","Effect":"Allow","Action":"sts:GetCallerIdentity","Resource":"*"},{"Sid":"S3GetBucketLocation","Effect":"Allow","Action":"s3:GetBucketLocation","Resource":"arn:aws:s3:::rocket-lander-deploy-templates"}]}'

aws iam create-access-key --user-name puzzle-book-deploy
```

Then add credentials to `.env`:
```
AWS_ACCESS_KEY_ID=<access key>
AWS_SECRET_ACCESS_KEY=<secret key>
```
