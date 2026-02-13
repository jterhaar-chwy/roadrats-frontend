# Chirp Application Template

Reach out to `#cds-public` if you have questions.

✅ Ready-to-build Next.js application with Chirp

✅ Saves time setting up

✅ Enabled with Chirp styles

✅ Example usage of Chirp components

✅ Utilize Jest/React Testing Library test suite

This was created with
[`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with
[`yarn pnp`](https://yarnpkg.com/features/pnp).

## Getting Started

### Artifactory Access

We're using [Chewy's JFrog Artifactory](https://chewyinc.jfrog.io) as our private NPM registry. You
will need access to this for development and publishing.

Retrieve your identity key from your
[profile page](https://chewyinc.jfrog.io/ui/admin/artifactory/user_profile). You may have to
"Generate an Identity Token".

Create your global `.yarnrc.yml`:

```yml
npmScopes:
  chewy:
    npmAlwaysAuth: true
    npmAuthToken: 'YOUR_IDENTITY_TOKEN'
    npmRegistryServer: 'https://chewyinc.jfrog.io/chewyinc/api/npm/npm/'
```

### VSCode

We're using [yarn plug'n'play](https://yarnpkg.com/features/pnp) which require us to use a special
typescript version. Start from step 3: https://yarnpkg.com/getting-started/editor-sdks#vscode
