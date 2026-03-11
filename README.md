This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

## Environment variables

This project supports switching env files via `APP_ENV`.

- `APP_ENV=local` (default unless `NODE_ENV=production`)
  - loads `.env.local` then `.env`
- `APP_ENV=develop`
  - loads `.env.develop.local` / `.env.development.local` then `.env.develop` / `.env.development` then `.env`
- `APP_ENV=production` (default when `NODE_ENV=production`)
  - loads `.env.production.local` then `.env.production` then `.env`

Notes:

- On Amplify, set `APP_ENV=develop` to use develop settings while still running `next build`.
- For `local`/`develop`, env file values override variables already loaded by Next.js during build.

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## AWS CDK (TypeScript) での自動デプロイ

このリポジトリには、以下リソースを作成する CDK スタックを追加しています。

- ALB (外部公開)
- ECS Fargate (アプリ本体)
- Cognito User Pool + Hosted UI
- CodeStar Connections (GitHub 連携)
- CodeBuild (Docker build/push)
- CodePipeline (Source/Build/Deploy)

### 追加ファイル

- `cdk.json`
- `infra/bin/app.ts`
- `infra/lib/platform-stack.ts`
- `infra/tsconfig.json`
- `Dockerfile`
- `.dockerignore`

### 事前準備

1. AWS 認証情報を設定
2. CDK ブートストラップ

```bash
npx cdk bootstrap
```

3. 依存をインストール（未実行の場合）

```bash
npm install
```

### デプロイ

`<...>` を実値で置き換えて実行してください。

```bash
npm run cdk:deploy -- \
  --parameters GitHubOwner=<github-owner> \
  --parameters GitHubRepository=<github-repo> \
  --parameters GitHubBranch=main \
  --parameters CognitoDomainPrefix=<globally-unique-prefix> \
  --parameters CognitoCallbackUrl=https://<your-domain>/api/auth/callback \
  --parameters CognitoLogoutUrl=https://<your-domain>/
```

### 初回デプロイ後に必須の作業

- AWS Console の `CodeStar Connections` で接続を `Available` に承認する
  - CloudFormation 作成直後は `PENDING` になるため、承認しないと Pipeline の Source ステージは失敗します

### Pipeline の挙動

- `main` ブランチ push で CodePipeline が起動
- CodeBuild で Docker イメージをビルドし ECR に push
- ECS Deploy アクションで Fargate サービスのイメージ更新
