#!/usr/bin/env node

const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const readline = require("readline")
const inquirer = require("inquirer")

const runCommand = (command, options = {}) => {
  console.log(`$ ${command}`)
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, [], {
      ...options,
      stdio: "inherit",
      shell: true,
    })

    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve(true)
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command}`))
      }
    })

    childProcess.on("error", (error) => {
      reject(error)
    })
  })
}

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  })
}

const fileContents = {
  auth: `import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"; // your drizzle instance
 
export const auth = betterAuth({
  database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
    }),
  emailAndPassword: {
    enabled: true, 
  }
})`,
  apiRoute: `import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
 
export const { POST, GET } = toNextJsHandler(auth)
`,
  authClient: `import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: "http://localhost:3000"
})`,
  schema: `import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});`,
  db: `import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL!,
})

client.connect()
export const db = drizzle(client)`,
  drizzleConfig: `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: './lib/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});`,
  page: `export default function Page() {
  return <h1>Hello World</h1>
}`,
}

const createEnvFileContent = (dbConfig) => {
  const secret = crypto.randomBytes(32).toString("hex")
  let databaseUrl = "postgres://postgres:postgres@localhost:5432/postgres"
  if (dbConfig) {
    const { user, password, host, port, name } = dbConfig
    databaseUrl = `postgres://${user}:${encodeURIComponent(
      password
    )}@${host}:${port}/${name}`
  }
  return `BETTER_AUTH_SECRET=${secret}
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL="${databaseUrl}"
`
}

const createFile = async (filePath, content) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  await fs.promises.writeFile(filePath, content)
}

const getProjectDetails = async () => {
  const args = process.argv.slice(2)
  let projectName = args.find((arg) => !arg.startsWith("--"))

  if (!projectName) {
    projectName = await askQuestion("What is your project named? ")
    if (!projectName) {
      console.error("Please provide a project name.")
      process.exit(1)
    }
  }

  let packageManager
  if (args.includes("--pnpm")) {
    packageManager = "pnpm"
  } else if (args.includes("--npm")) {
    packageManager = "npm"
  } else {
    const pmAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager would you like to use?",
        choices: ["pnpm", "npm"],
      },
    ])
    packageManager = pmAnswer.packageManager
  }

  const hasPostgresAnswer = await askQuestion(
    "Do you have PostgreSQL installed locally? (y/n) "
  )
  const hasPostgres =
    hasPostgresAnswer.toLowerCase() === "y" ||
    hasPostgresAnswer.toLowerCase() === "yes"

  let dbConfig = null
  if (hasPostgres) {
    const dbHost =
      (await askQuestion("Database host? (default: localhost) ")) || "localhost"
    const dbPort =
      (await askQuestion("Database port? (default: 5432) ")) || "5432"
    const dbUser =
      (await askQuestion("Database user? (default: postgres) ")) || "postgres"
    const dbPassword =
      (await askQuestion("Database password? (default: postgres) ")) ||
      "postgres"
    const dbName =
      (await askQuestion("Database name? (default: postgres) ")) || "postgres"
    dbConfig = {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      name: dbName,
    }
  }

  const repoName =
    projectName === "./" || projectName === "." ? "" : projectName
  const projectPath = repoName ? path.resolve(repoName) : process.cwd()

  return { projectName, packageManager, projectPath, hasPostgres, dbConfig }
}

const setupProject = async ({
  packageRunner,
  projectName,
  projectPath,
  packageManager,
}) => {
  const createAppCommand = `${packageRunner} create-next-app@canary ${
    projectName === "./" || projectName === "." ? "." : projectName
  } --yes`

  console.log("Creating a new Next.js app...")
  await runCommand(createAppCommand, { cwd: process.cwd() })

  console.log("Initializing shadcn/ui...")
  await runCommand(`${packageRunner} shadcn@latest init -y -b neutral`, {
    cwd: projectPath,
  })
}

const installDependencies = async ({
  packageManager,
  installVerb,
  projectPath,
}) => {
  const regularDeps = "better-auth drizzle-orm pg dotenv"
  console.log("Installing additional dependencies...")
  await runCommand(`${packageManager} ${installVerb} ${regularDeps}`, {
    cwd: projectPath,
  })

  const devDeps = "drizzle-kit tsx @types/pg"
  console.log("Installing additional dev dependencies...")
  await runCommand(`${packageManager} ${installVerb} -D ${devDeps}`, {
    cwd: projectPath,
  })
}

const createProjectFiles = async ({
  projectPath,
  packageRunner,
  hasPostgres,
  dbConfig,
}) => {
  console.log("Creating .env file...")
  await createFile(
    path.join(projectPath, ".env"),
    createEnvFileContent(dbConfig)
  )

  const libDir = path.join(projectPath, "lib")
  const apiRouteDir = path.join(projectPath, "app", "api", "auth", "[...all]")

  console.log("Creating auth files...")
  await createFile(path.join(libDir, "auth.ts"), fileContents.auth)
  await createFile(path.join(libDir, "auth-client.ts"), fileContents.authClient)
  await createFile(path.join(apiRouteDir, "route.ts"), fileContents.apiRoute)

  console.log("Creating database files...")
  await createFile(path.join(libDir, "schema.ts"), fileContents.schema)
  await createFile(path.join(libDir, "db.ts"), fileContents.db)
  await createFile(
    path.join(projectPath, "drizzle.config.ts"),
    fileContents.drizzleConfig
  )

  if (hasPostgres) {
    console.log("Generating auth configuration...")
    await runCommand(
      `${packageRunner} @better-auth/cli generate -y --output ./lib/schema-auth.ts`,
      {
        cwd: projectPath,
      }
    )
  } else {
    console.log(
      `Skipping generation of auth configuration. You can run it later with \`${packageRunner} @better-auth/cli generate -output ./lib/schema-auth.ts\``
    )
  }
}

const finalizePnpmSetup = async ({ projectPath }) => {
  console.log("Finalizing setup for pnpm...")
  await runCommand("pnpm approve-builds", { cwd: projectPath })
  await runCommand("pnpm install", { cwd: projectPath })
}

const cleanupAndCustomize = async ({ projectPath }) => {
  console.log("Cleaning up project...")

  const publicDir = path.join(projectPath, "public")
  try {
    const files = await fs.promises.readdir(publicDir)
    for (const file of files) {
      if (file === ".gitkeep") continue
      await fs.promises.unlink(path.join(publicDir, file))
    }
    console.log("Removed default files from public directory.")
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not clean public directory: ${error.message}`)
    }
  }

  const pagePath = path.join(projectPath, "app", "page.tsx")
  await createFile(pagePath, fileContents.page)
  console.log("Replaced page.tsx with a sample page.")
}

const main = async () => {
  try {
    const { projectName, packageManager, projectPath, hasPostgres, dbConfig } =
      await getProjectDetails()

    const packageRunner = packageManager === "pnpm" ? "pnpm dlx" : "npx"
    const installVerb = packageManager === "pnpm" ? "add" : "install"

    await setupProject({
      packageRunner,
      projectName,
      projectPath,
      packageManager,
    })
    await installDependencies({ packageManager, installVerb, projectPath })
    await createProjectFiles({
      projectPath,
      packageRunner,
      hasPostgres,
      dbConfig,
    })
    await cleanupAndCustomize({ projectPath })

    if (packageManager === "pnpm") {
      await finalizePnpmSetup({ projectPath })
    }

    console.log("\nProject setup complete!")
  } catch (error) {
    console.error("An error occurred:", error.message)
    process.exit(1)
  }
}

main()
