import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class PlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOwner = new cdk.CfnParameter(this, 'GitHubOwner', {
      type: 'String',
      description: 'GitHub organization/user name',
    });
    const githubRepo = new cdk.CfnParameter(this, 'GitHubRepository', {
      type: 'String',
      description: 'GitHub repository name',
    });
    const githubBranch = new cdk.CfnParameter(this, 'GitHubBranch', {
      type: 'String',
      default: 'main',
      description: 'GitHub branch to deploy from',
    });
    const cognitoDomainPrefix = new cdk.CfnParameter(this, 'CognitoDomainPrefix', {
      type: 'String',
      description: 'Unique Cognito Hosted UI domain prefix',
    });
    const callbackUrl = new cdk.CfnParameter(this, 'CognitoCallbackUrl', {
      type: 'String',
      description: 'OAuth callback URL (e.g. https://example.com/api/auth/callback)',
    });
    const logoutUrl = new cdk.CfnParameter(this, 'CognitoLogoutUrl', {
      type: 'String',
      description: 'OAuth logout URL (e.g. https://example.com/)',
    });

    const connection = new codestarconnections.CfnConnection(this, 'GitHubConnection', {
      connectionName: `${this.stackName}-github`,
      providerType: 'GitHub',
    });

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const appRepository = new ecr.Repository(this, 'AppRepository', {
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 30 }],
      repositoryName: `${this.stackName.toLowerCase()}-app`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      publicLoadBalancer: true,
      desiredCount: 2,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        containerName: 'app',
        containerPort: 3000,
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/python:3.12-alpine'),
        command: ['python', '-m', 'http.server', '3000'],
      },
    });
    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200-399',
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: { userSrp: true },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        callbackUrls: [callbackUrl.valueAsString],
        logoutUrls: [logoutUrl.valueAsString],
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool,
      cognitoDomain: { domainPrefix: cognitoDomainPrefix.valueAsString },
    });

    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    const project = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: appRepository.repositoryUri },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws --version',
              'AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)',
              'AWS_REGION=${AWS_DEFAULT_REGION}',
              'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com',
              'IMAGE_TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
              'IMAGE_TAG=${IMAGE_TAG:0:7}',
            ],
          },
          build: {
            commands: [
              'echo Build started on $(date)',
              'docker build -t ${REPOSITORY_URI}:${IMAGE_TAG} .',
              'docker push ${REPOSITORY_URI}:${IMAGE_TAG}',
              'printf \'[{"name":"app","imageUri":"%s"}]\' "${REPOSITORY_URI}:${IMAGE_TAG}" > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
    });
    appRepository.grantPullPush(project);

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${this.stackName}-pipeline`,
      crossAccountKeys: false,
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeStarConnectionsSourceAction({
          actionName: 'GitHub_Source',
          owner: githubOwner.valueAsString,
          repo: githubRepo.valueAsString,
          branch: githubBranch.valueAsString,
          output: sourceOutput,
          connectionArn: connection.attrConnectionArn,
          triggerOnPush: true,
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'Docker_Build',
          project,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipelineActions.EcsDeployAction({
          actionName: 'ECS_Deploy',
          service: fargateService.service,
          input: buildOutput,
        }),
      ],
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: appRepository.repositoryUri,
    });
    new cdk.CfnOutput(this, 'CodeStarConnectionArn', {
      value: connection.attrConnectionArn,
    });
    new cdk.CfnOutput(this, 'ConnectionStatus', {
      value: connection.attrConnectionStatus,
      description: 'PENDING の場合は AWS Console で接続を承認してください',
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'CognitoAppClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'CognitoHostedUiDomain', {
      value: userPoolDomain.baseUrl(),
    });
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
    });
  }
}
