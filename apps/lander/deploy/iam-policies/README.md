# IAM Policies for Rocket Lander Deployment

This folder contains the IAM policies needed for secure deployment.

## Security Principle: Least Privilege

The deployment user has MINIMAL permissions:
- Create/update CloudFormation stacks (scoped to rocket-lander-* stacks only)
- Upload templates to ONE specific S3 bucket
- Pass the CloudFormation service role
- Assume the seed role for frontend deployment

All actual resource creation is done BY CloudFormation using a SERVICE ROLE
that has broader permissions.

## Bootstrap Resources Required

### 1. S3 Bucket: rocket-lander-deploy-templates

```bash
aws s3 mb s3://rocket-lander-deploy-templates --region ap-southeast-2
```

### 2. IAM Role: rocket-lander-cfn-role

Create via AWS Console:
1. Go to IAM > Roles > Create role
2. Trusted entity: AWS service
3. Service: CloudFormation
4. Attach policy: AdministratorAccess
5. Role name: rocket-lander-cfn-role
6. Create role

### 3. IAM User: rocket-lander-deploy

Create via AWS Console:
1. Go to IAM > Users > Create user
2. User name: rocket-lander-deploy
3. Do NOT enable console access
4. Create user
5. Go to user > Permissions > Add permissions > Create inline policy
6. JSON tab: paste contents of rocket-lander-deploy-policy.json
7. Create access key for CLI usage
8. Save the access key ID and secret

## Environment Variables

After creating bootstrap resources, set these in .env:

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=ap-southeast-2
DEPLOY_USER_ARN=arn:aws:iam::<account-id>:user/rocket-lander-deploy

# Optional: For custom domain (prod only)
DOMAIN_NAME=rocketlander.com
HOSTED_ZONE_ID=Z1234567890ABC
CERTIFICATE_ARN=arn:aws:acm:us-east-1:xxx:certificate/xxx
```
