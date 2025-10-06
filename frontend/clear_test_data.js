// Clear test data from localStorage
console.log('🗑️ กำลังล้างข้อมูลทดสอบ...');

if (typeof localStorage !== 'undefined') {
  // Remove daily report data
  localStorage.removeItem('dailyReportData');
  console.log('✅ ลบข้อมูล dailyReportData แล้ว');
  
  // Clear any other test data if exists
  const keys = Object.keys(localStorage);
  const testKeys = keys.filter(key => 
    key.includes('test') || 
    key.includes('demo') || 
    key.includes('temp')
  );
  
  testKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ ลบข้อมูล ${key} แล้ว`);
  });
  
  console.log('🎉 ล้างข้อมูลทดสอบเสร็จสมบูรณ์!');
  console.log('💡 กรุณารีเฟรชหน้าเพื่อดูผลลัพธ์');
} else {
  console.log('❌ ไม่สามารถเข้าถึง localStorage ได้');
}
