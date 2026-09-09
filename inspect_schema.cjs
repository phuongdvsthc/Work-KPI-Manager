const postgres = require('postgres');
require('dotenv').config();

async function inspect() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    console.log("=== kpi_assignments columns ===");
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'kpi_assignments'
      ORDER BY ordinal_position;
    `;
    console.table(cols);

    console.log("=== kpi_assignments constraints ===");
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'kpi_assignments'::regclass;
    `;
    console.log(constraints);

    console.log("=== check if 'locked' is in status enum / check ===");
    const enumTypes = await sql`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE '%assignment%status%' OR t.typname LIKE '%kpi%';
    `;
    console.log(enumTypes);

    console.log("=== triggers on kpi_assignments, kpi_assignment_items, kpi_assignment_reviews ===");
    const triggers = await sql`
      SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('kpi_assignments', 'kpi_assignment_items', 'kpi_assignment_reviews', 'kpi_assignment_item_reviews');
    `;
    console.log(triggers);

  } catch (err) {
    console.error("Inspect error:", err);
  } finally {
    await sql.end();
  }
}

inspect();
