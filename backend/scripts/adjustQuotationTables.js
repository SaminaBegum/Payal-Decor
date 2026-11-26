require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/db");

async function adjustQuotationTables() {
  try {
    console.log("Starting quotation tables adjustment...");

    // 1. Allow customerId to be NULL in quotations
    await pool.query(`
      ALTER TABLE public.quotations 
      ALTER COLUMN "customerId" DROP NOT NULL;
    `);
    console.log("✓ quotations.customerId DROP NOT NULL applied.");

    // 2. Add customerAddress, placeOfSupply, terms to quotations
    await pool.query(`
      ALTER TABLE public.quotations 
      ADD COLUMN IF NOT EXISTS "customerAddress" text,
      ADD COLUMN IF NOT EXISTS "placeOfSupply" text DEFAULT '27-Maharashtra',
      ADD COLUMN IF NOT EXISTS "terms" jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("✓ Added customerAddress, placeOfSupply, terms to public.quotations.");

    // 3. Add hsn, sizes to quotation_items
    await pool.query(`
      ALTER TABLE public.quotation_items 
      ADD COLUMN IF NOT EXISTS "hsn" text DEFAULT '9403',
      ADD COLUMN IF NOT EXISTS "sizes" text;
    `);
    console.log("✓ Added hsn, sizes to public.quotation_items.");

    // Verify columns
    const qCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'quotations'
      ORDER BY ordinal_position;
    `);
    console.log("\nUpdated public.quotations columns:", qCols.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

    const qiCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'quotation_items'
      ORDER BY ordinal_position;
    `);
    console.log("\nUpdated public.quotation_items columns:", qiCols.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

    console.log("\nQuotation tables adjustment completed successfully!");
  } catch (error) {
    console.error("Error adjusting quotation tables:", error.message);
  } finally {
    await pool.end();
  }
}

adjustQuotationTables();
