import * as fs from "fs";
import * as path from "path";

function switchToSqlite() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found at: ${schemaPath}`);
    return;
  }

  let content = fs.readFileSync(schemaPath, "utf-8");
  
  // Replace postgresql datasource definition with sqlite datasource definition
  const postgresRegex = /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"postgresql"[\s\S]*?url\s*=\s*env\("DATABASE_URL"\)[\s\S]*?\}/;
  const sqliteBlock = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;

  if (postgresRegex.test(content)) {
    content = content.replace(postgresRegex, sqliteBlock);
    fs.writeFileSync(schemaPath, content, "utf-8");
    console.log("🎉 Successfully switched database provider to: SQLite");
    console.log("Next steps:");
    console.log("1. Run 'npx prisma db push' to apply schema to local dev.db.");
    console.log("2. Run 'npx tsx prisma/restore-db.ts' to load backup data if needed.");
  } else if (content.includes('provider = "sqlite"')) {
    console.log("⚠️ Database provider is already set to SQLite!");
  } else {
    console.error("❌ Could not identify datasource block in schema.prisma!");
  }
}

switchToSqlite();
