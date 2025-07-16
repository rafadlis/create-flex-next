# `create-flex-next`

**Build Next.js apps that go anywhere. No vendor lock-in, no headaches.**

`create-flex-next` is a CLI tool that kickstarts your Next.js project with a powerful and flexible stack, designed to keep you in control of your deployment and database choices. Say goodbye to the headaches of initial project setup and vendor lock-in.

## The "Flex" Philosophy

In a world of integrated platforms, it's easy to get locked into a specific hosting or database provider. This can be great for a quick start, but can lead to problems with scalability, pricing, and portability down the line.

`create-flex-next` is built on a simple idea: **You should own your stack.**

- **Hosting Freedom**: Your application is a standard Next.js app. Deploy it on Vercel, Netlify, AWS, your own server, or any other provider that supports Node.js.
- **Database Portability**: We use Drizzle ORM with a standard PostgreSQL setup. This means you can point your app to any Postgres provider—be it a major cloud service like Neon, a self-hosted instance, or your local machine—with just a change to your connection string.
- **No "Magic"**: The code generated is straightforward and extensible. We avoid overly-opinionated frameworks that hide implementation details. You get a clean, understandable foundation to build upon.

## What's Inside?

This CLI sets up a production-ready Next.js project with:

- **Next.js**: The React Framework for the Web.
- **Better Auth**: A simple, self-hostable authentication library.
- **Drizzle ORM**: A modern, TypeScript-native ORM for PostgreSQL.
- **shadcn/ui**: Beautifully designed UI components that you can copy and paste into your apps.
- **PostgreSQL**: Configured and ready to connect to your database instance.

## Usage

To create a new project, run:

```bash
npx create-flex-next <your-project-name>
```

The CLI will guide you through the setup process, asking for your preferred package manager and local PostgreSQL details if available.

### Options

- `--pnpm`: Use pnpm as the package manager.
- `--npm`: Use npm as the package manager.
- `--help`: Show the help message.

## Getting Started

Once the setup is complete:

1.  **Navigate to your project:**

    ```bash
    cd <your-project-name>
    ```

2.  **Check your environment variables:**
    The installer creates a `.env` file for you with a `DATABASE_URL` and other necessary secrets. Make sure it points to your desired database.

3.  **Start the development server:**
    ```bash
    npm run dev # or pnpm dev
    ```

Your Next.js app is now running at `http://localhost:3000`.

## Why `create-flex-next`?

Starting new projects should be exciting, not a chore. This tool was built to automate the tedious parts of setup so you can focus on what matters: building your application. By providing a flexible, non-proprietary foundation, `create-flex-next` empowers you to build applications that can adapt and grow without being tied down.
