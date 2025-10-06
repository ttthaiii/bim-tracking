// Script to reset localStorage data
if (typeof window !== 'undefined' && window.localStorage) {
  // Clear daily report data
  localStorage.removeItem('dailyReportData');
  console.log('Daily report data cleared successfully');
} else {
  console.log('localStorage not available');
}
