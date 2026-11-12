# Demeisen Auth

One sign-in for all Demeisen sites: sign in once (password plus authenticator-app code) and you're signed in to
the CRM, the intranet and future apps. Built on AWS Cognito, using standard OpenID Connect, so an app can also use
another provider (Microsoft Entra ID, Okta, Google) by changing settings only.

Nothing in this repo is specific to Demeisen: no user lists, passwords, account numbers or addresses. It can be
shared with other organisations as it is.

## Contents

- `cognito/user-pool.yaml`: creates a sign-in (Cognito user pool) for invited users only, with an authenticator-app
  code required and a 14-character password policy. Only needed for a new organisation.
- `cognito/app-client.yaml`: registers one app with an existing user pool. One stack per app.
- `python/demeisen_auth.py`: sign-in for Flask apps (single file; needs `PyJWT[crypto]`). Adds `/auth/login`,
  `/auth/callback`, `/auth/logout`; `auth.email()` returns the signed-in person's verified email.
  Each app decides what that person may do (e.g. the intranet only admits people in its own user list).

## Adding an app

1. Register it:
   ```
   aws cloudformation deploy --template-file cognito/app-client.yaml --stack-name <app>-signin \
     --parameter-overrides UserPoolId=<pool id> AppName=<app> BaseUrl=https://<app address>
   ```
2. Read the client's ID and secret (`aws cognito-idp describe-user-pool-client`) and give the app:
   `OIDC_ISSUER=https://cognito-idp.<region>.amazonaws.com/<pool id>`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`,
   `PUBLIC_URL=https://<app address>`, `OIDC_LOGOUT_URL=https://<domain>.auth.<region>.amazoncognito.com/logout`.
3. Copy `python/demeisen_auth.py` into the app (each app keeps its own copy) and create `OIDC(app, ...)`.

Single-page apps (like the CRM) use the user pool directly from the browser with a public client and an
API Gateway JWT authorizer; they don't need the Python file.

## Inviting and removing people

Invite: Cognito console → user pool → Users → Create user (send an email invitation). Remove access to everything:
disable or delete the user there. Each app can additionally restrict who it admits.

## Current Demeisen set-up

The shared user pool is the one created by the CRM's stack (`demeisen-crm-poc`). The intranet is registered with
it through `cognito/app-client.yaml` (stack `demeisen-intranet-signin`). Moving the pool's ownership out of the CRM
stack into its own stack (CloudFormation resource import, with `DeletionPolicy: Retain`) is a later, separate step;
until then, don't delete the CRM stack. The CRM can still be deployed elsewhere on its own: its template creates
its own user pool.
