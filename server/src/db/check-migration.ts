import pool from './connection.js';

async function checkMigration() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'stores' 
       AND column_name IN ('business_hours', 'closed_days')
       ORDER BY column_name`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ business_hours と closed_days カラムが見つかりません');
    } else {
      console.log('✅ 追加されたカラム:');
      result.rows.forEach((row: { column_name: string; data_type: string }) => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: unknown) {
    console.error('❌ 確認に失敗しました:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

checkMigration();
