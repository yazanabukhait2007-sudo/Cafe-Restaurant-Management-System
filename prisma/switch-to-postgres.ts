import * as fs from "fs";
import * as path from "path";

function switchToPostgres() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found at: ${schemaPath}`);
    return;
  }

  let content = fs.readFileSync(schemaPath, "utf-8");
  
  // Replace sqlite datasource definition with postgresql datasource definition
  const sqliteRegex = /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"sqlite"[\s\S]*?url\s*=\s*"file:\.\/dev\.db"[\s\S]*?\}/;
  const postgresBlock = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

  if (sqliteRegex.test(content)) {
    content = content.replace(sqliteRegex, postgresBlock);
    fs.writeFileSync(schemaPath, content, "utf-8");
    console.log("🎉 Successfully switched database provider to: PostgreSQL");
    console.log("Next steps:");
    console.log("1. Ensure your .env file has a valid 'DATABASE_URL' configured.");
    console.log("2. Run 'npx prisma db push' or migrations to synchronize.");
  } else if (content.includes('provider = "postgresql"')) {
    console.log("⚠️ Database provider is already set to PostgreSQL!");
  } else {
    console.error("❌ Could not identify datasource block in schema.prisma!");
  }
}

switchToPostgres();
