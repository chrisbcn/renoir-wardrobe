// Test script to verify delete functionality
const { createClient } = require('@supabase/supabase-js');

// Test the delete functionality
async function testDelete() {
  console.log('Testing delete functionality...');
  
  // Check if environment variables are available
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('❌ Missing Supabase environment variables');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    return;
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // First, let's see what items exist
    console.log('📋 Fetching existing items...');
    const { data: items, error: fetchError } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching items:', fetchError);
      return;
    }
    
    console.log(`✅ Found ${items.length} items in database`);
    
    if (items.length === 0) {
      console.log('ℹ️  No items to test delete with');
      return;
    }
    
    // Show first few items
    items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name || item.item_name} (ID: ${item.id})`);
    });
    
    // Test delete with the first item
    const testItem = items[0];
    console.log(`\n🗑️  Testing delete with item: ${testItem.name || testItem.item_name} (ID: ${testItem.id})`);
    
    const { error: deleteError } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', testItem.id);
    
    if (deleteError) {
      console.error('❌ Error deleting item:', deleteError);
      return;
    }
    
    console.log('✅ Item deleted successfully!');
    
    // Verify it's gone
    console.log('🔍 Verifying deletion...');
    const { data: remainingItems, error: verifyError } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('id', testItem.id);
    
    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
      return;
    }
    
    if (remainingItems.length === 0) {
      console.log('✅ Confirmed: Item is no longer in database');
    } else {
      console.log('❌ Error: Item still exists in database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testDelete();
