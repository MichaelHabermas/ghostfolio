# Ghostfolio Development Guide

## Development Environment  
  
### The Short Version

To start the application after its already been setup and working before:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
npm run start:server
npm run start:client 
```

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org/en/download) (version `>=22.18.0`)
- Create a local copy of this Git repository (clone)
- Copy the file `.env.dev` to `.env` and populate it with your data (`cp .env.dev .env`)

### Setup

1. Run `npm install`
2. Run `docker compose -f docker/docker-compose.dev.yml up -d` to start [PostgreSQL](https://www.postgresql.org) and [Redis](https://redis.io)
3. Run `npm run database:setup` to initialize the database schema
4. Start the [server](#start-server) and the [client](#start-client)
5. Open [https://localhost:4200/en](https://localhost:4200/en) in your browser
6. Create a new user via *Get Started* (this first user will get the role `ADMIN`)

### Start Server

#### Debug

Run `npm run watch:server` and click *Debug API* in [Visual Studio Code](https://code.visualstudio.com)

#### Serve

Run `npm run start:server`

### Start Client

#### English (Default)

Run `npm run start:client` and open [https://localhost:4200/en](https://localhost:4200/en) in your browser.

#### Other Languages

To start the client in a different language, such as German (`de`), adapt the `start:client` script in the `package.json` file by changing `--configuration=development-en` to `--configuration=development-de`. Then, run `npm run start:client` and open [https://localhost:4200/de](https://localhost:4200/de) in your browser.

### Start *Storybook*

Run `npm run start:storybook`

### Migrate Database

With the following command you can keep your database schema in sync:

```bash
npm run database:push
```

## Testing

Run `npm test`

## Experimental Features

New functionality can be enabled using a feature flag switch from the user settings.

### Backend

Remove permission in `UserService` using `without()`

### Frontend

Use `@if (user?.settings?.isExperimentalFeatures) {}` in HTML template

## Component Library (*Storybook*)

[https://ghostfol.io/development/storybook](https://ghostfol.io/development/storybook)

## Git

### Rebase

`git rebase -i --autosquash main`

## Dependencies

### Angular

#### Upgrade (minor versions)

1. Run `npx npm-check-updates --upgrade --target "minor" --filter "/@angular.*/"`

### Nx

#### Upgrade

1. Run `npx nx migrate latest`
2. Make sure `package.json` changes make sense and then run `npm install`
3. Run `npx nx migrate --run-migrations`

### Prisma

#### Access database via GUI

Run `npm run database:gui`

[https://www.prisma.io/studio](https://www.prisma.io/studio)

#### Synchronize schema with database for prototyping

Run `npm run database:push`

[https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push](https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push)

#### Create schema migration

Run `npm run prisma migrate dev --name added_job_title`

[https://www.prisma.io/docs/concepts/components/prisma-migrate#getting-started-with-prisma-migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate#getting-started-with-prisma-migrate)

## SSL

Generate `localhost.cert` and `localhost.pem` files.

```
openssl req -x509 -newkey rsa:2048 -nodes -keyout apps/client/localhost.pem -out apps/client/localhost.cert -days 365 \
  -subj "/C=CH/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
```

