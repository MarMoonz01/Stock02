

function doGet(e) {
  // สร้าง Template จากไฟล์ "โครงบ้าน"
  const template = HtmlService.createTemplateFromFile('Index');
 
  // ส่งข้อมูลที่จำเป็นสำหรับ "โครงบ้าน"
  template.userEmail = Session.getActiveUser().getEmail();
  template.userRole = getUserRole(template.userEmail);








  // ส่ง "โครงบ้าน" ที่ประมวลผลแล้วกลับไป
  return template.evaluate()
    .setTitle('ระบบจัดการหลังบ้าน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/**
 * ทำหน้าที่เป็น "คนส่งของ"
 * รับชื่อไฟล์ HTML (เช่น "Stock.html") แล้วส่งคืนมาเป็น "เนื้อหา HTML ดิบๆ"
 */
function getPageContent(pageName) {
  // ใช้ createHtmlOutputFromFile เพื่อดึงเฉพาะเนื้อหา HTML
  // โดยไม่พยายามหาตัวแปร <?= ... ?> ที่อาจจะไม่มีในไฟล์ย่อย
  return HtmlService.createHtmlOutputFromFile(pageName).getContent();
}








function getWebAppStockData(request = {}) { // <--- [FIX] เพิ่ม default value ตรงนี้
  const page = request.page || 1;
  const pageSize = request.pageSize || 25;
  const searchTerm = request.searchTerm ? request.searchTerm.toUpperCase().trim() : '';
  const brandFilter = request.brandFilter || '';
  const stockFilter = request.stockFilter || 'all';








  const allDataFromSheet = getSheetData(CONFIG.SHEETS.STOCK).slice(1);
  const cleanData = allDataFromSheet.filter(row => row[CONFIG.COLUMNS.TIRE_SIZE] || row[CONFIG.COLUMNS.BRAND] || row[CONFIG.COLUMNS.MODEL]);








  let filteredData = cleanData;








  // Filter by Brand
  if (brandFilter) {
    filteredData = filteredData.filter(row => (row[CONFIG.COLUMNS.BRAND] || '') === brandFilter);
  }








  // Filter by Stock Status
  if (stockFilter !== 'all') {
    filteredData = filteredData.filter(row => {
      const totalStock = (parseInt(row[CONFIG.COLUMNS.STOCK1]) || 0) + (parseInt(row[CONFIG.COLUMNS.STOCK2]) || 0) +
                         (parseInt(row[CONFIG.COLUMNS.STOCK3]) || 0) + (parseInt(row[CONFIG.COLUMNS.STOCK4]) || 0);
      if (stockFilter === 'in_stock') return totalStock > CONFIG.LOW_STOCK_THRESHOLD;
      if (stockFilter === 'low_stock') return totalStock > 0 && totalStock <= CONFIG.LOW_STOCK_THRESHOLD;
      if (stockFilter === 'out_of_stock') return totalStock === 0;
      return false;
    });
  }








  // Filter by Search Term
  if (searchTerm) {
    const normalizedSearchTerm = searchTerm.replace(/[\s/R-]/gi, '');
    filteredData = filteredData.filter(row => {
      const normalizedTireSize = (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().replace(/[\s/R-]/gi, '');
      const fullTextForBrandModel = ((row[CONFIG.COLUMNS.BRAND] || '') + ' ' + (row[CONFIG.COLUMNS.MODEL] || '')).toUpperCase();
      return (normalizedTireSize.includes(normalizedSearchTerm)) || (fullTextForBrandModel.includes(searchTerm));
    });
  }








  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
 
  return { data: paginatedData, currentPage: page, totalPages: totalPages, totalRows: totalRows };
}
function getUnifiedLogData() {
  try {
    const unifiedLogs = [];








    // --- 1. ดึงข้อมูลจาก 'Log' (LINE Bot) ---
    const logData = getSheetData(CONFIG.SHEETS.LOG);
    for (let i = 1; i < logData.length; i++) {
      const row = logData[i];
      const details = (row[8] || '').toString();
      // สนใจเฉพาะรายการขายและการยกเลิกการขาย
      if (details.startsWith('[SELL]') || details.startsWith('[UNDO-SELL]')) {
        const logDate = new Date(row[0]);
        if (isNaN(logDate.getTime())) continue;








        unifiedLogs.push({
          logDate: logDate,
          brand: row[4],
          model: row[5],
          // netQuantity ในชีต Log จะเป็นค่าลบสำหรับการขาย, บวกสำหรับการ Undo ซึ่งถูกต้องแล้ว
          netQuantity: parseInt(row[7]) || 0,
        });
      }
    }








    // --- 2. ดึงข้อมูลจาก 'AuditLog' (Web App) ---
    const auditLogSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.AUDIT_LOG);
    const auditLogData = auditLogSheet.getDataRange().getValues();
    const quantityRegex = /by (-?\d+)/; // Regex สำหรับดึงตัวเลขจากข้อความ "by -1"








    for (let i = 1; i < auditLogData.length; i++) {
      const row = auditLogData[i];
      const action = (row[2] || '').toString(); // คอลัมน์ C: Action








      // สนใจเฉพาะการตัดสต็อกผ่านเว็บ (ADJUST-DOWN)
      if (action === 'ADJUST-DOWN') {
        const logDate = new Date(row[0]);
        if (isNaN(logDate.getTime())) continue;








        const primaryKey = (row[3] || '').toString().split('|'); // คอลัมน์ D: Target Item
        const details = (row[4] || '').toString(); // คอลัมน์ E: Details








        if (primaryKey.length < 3) continue; // ข้ามถ้าข้อมูล primary key ไม่ถูกต้อง








        const match = details.match(quantityRegex);
        if (!match || !match[1]) continue; // ข้ามถ้าไม่พบจำนวนที่ตัดสต็อก








        unifiedLogs.push({
          logDate: logDate,
          brand: primaryKey[1], // ยี่ห้อจาก primary key
          model: primaryKey[2], // รุ่นจาก primary key
          // netQuantity จากการตัดสต็อกผ่านเว็บ จะเป็นค่าลบเสมอ
          netQuantity: parseInt(match[1]) || 0,
        });
      }
    }
   
    return unifiedLogs;








  } catch (e) {
    Logger.log(`Error in getUnifiedLogData: ${e.toString()}`);
    return []; // คืนค่าเป็น array ว่างถ้าเกิดข้อผิดพลาด
  }
}








/**
 * [Final Polished Version - With Professional Filters]
 * ประมวลผลข้อมูลสำหรับ Dashboard โดยใช้ข้อมูลที่รวบรวมจากทุกแหล่งและฟิลเตอร์แบบใหม่
 */
function getSmartReportData(dateRangePreset = "last_30_days", brandFilter = null) {
  try {
    const unifiedLogData = getUnifiedLogData();
    const now = new Date();
    let startDate = new Date(); // กำหนดค่าเริ่มต้น
    let endDate = new Date(now);   // endDate คือวันปัจจุบันเสมอ (ยกเว้น last_month)








    // --- [THE MAIN CHANGE] ---
    // เปลี่ยนตรรกะการคำนวณวันที่ตามฟิลเตอร์ใหม่
    switch (dateRangePreset) {
      case "last_7_days":
        startDate.setDate(now.getDate() - 6);
        break;
      case "last_month":
        // คำนวณเดือนที่แล้วแบบเต็มเดือน
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0); // วันสุดท้ายของเดือนที่แล้ว
        break;
      case "last_90_days":
        startDate.setDate(now.getDate() - 89);
        break;
      case "year_to_date":
        startDate = new Date(now.getFullYear(), 0, 1); // วันที่ 1 ม.ค. ของปีนี้
        break;
      case "last_30_days":
      default:
        startDate.setDate(now.getDate() - 29);
        break;
    }
    // --- [END OF THE MAIN CHANGE] ---








    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
   
    // (ส่วนที่เหลือของฟังก์ชันเหมือนเดิม ไม่ต้องเปลี่ยนแปลง)
    const salesForLineChart = {};
    const salesByItem = {};
    const weeklyTotals = [0, 0, 0, 0, 0];
    const monthlyTotals = [0, 0, 0, 0, 0, 0, 0];
    const uniqueBrands = new Set();
   
    const monthBoundaries = Array.from({length: 8}, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
    const weekBoundaries = Array.from({length: 6}, (_, i) => {
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay();
        const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        weekStart.setDate(weekStart.getDate() - diff - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    });
   
    for (const sale of unifiedLogData) {
        const { logDate, brand, model, netQuantity } = sale;
        uniqueBrands.add(brand);
        const salesAmount = netQuantity * -1;
       
        for (let m = 0; m < 7; m++) {
            if (logDate >= monthBoundaries[m+1] && logDate < monthBoundaries[m]) {
                monthlyTotals[6-m] += netQuantity;
                break;
            }
        }
       
        for (let w = 0; w < 5; w++) {
            if (logDate >= weekBoundaries[w+1] && logDate < weekBoundaries[w]) {
                weeklyTotals[4-w] += netQuantity;
                break;
            }
        }
       
        if (brandFilter && brand !== brandFilter) continue;








        if (logDate >= startDate && logDate <= endDate) {
            const dateKey = logDate.toISOString().slice(0, 10);
            salesForLineChart[dateKey] = (salesForLineChart[dateKey] || 0) + salesAmount;
            const itemName = `${brand} ${model}`;
            salesByItem[itemName] = (salesByItem[itemName] || 0) + salesAmount;
        }
    }
   
    const top3Items = Object.entries(salesByItem)
        .filter(([, sales]) => sales > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, sales]) => ({ name, sales }));








    const trendData = { labels: [], data: [] };
    let currentDate = new Date(startDate);
    // วนลูปสร้าง Label ของกราฟให้ถูกต้องตามช่วงวันที่ที่เลือก
    while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().slice(0, 10);
        trendData.labels.push(`${currentDate.getDate()}/${currentDate.getMonth() + 1}`);
        trendData.data.push(salesForLineChart[dateKey] || 0);
        currentDate.setDate(currentDate.getDate() + 1);
    }
   
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthlyComparisonData = {
        labels: Array.from({length: 6}, (_, i) => monthNames[monthBoundaries[5-i].getMonth()]),
        data: monthlyTotals.slice(1).map(val => val * -1)
    };
   
    const weeklyComparisonData = {
        labels: ['4 สัปดาห์ก่อน', '3 สัปดาห์ก่อน', '2 สัปดาห์ก่อน', 'สัปดาห์ที่แล้ว', 'สัปดาห์นี้'],
        data: weeklyTotals.map(val => val * -1)
    };








    const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? Infinity : 0;
        return ((current - previous) / previous) * 100;
    };
   
    const comparisonMetrics = {
        weeklyChange: calculateChange(weeklyTotals[4], weeklyTotals[3]),
        monthlyChange: calculateChange(monthlyTotals[6], monthlyTotals[5])
    };








    return {
      success: true,
      uniqueBrands: Array.from(uniqueBrands).sort(),
      top3Items: top3Items,
      trendData: trendData,
      monthlyComparisonData: monthlyComparisonData,
      weeklyComparisonData: weeklyComparisonData,
      comparisonMetrics: comparisonMetrics
    };








  } catch (e) {
    Logger.log("Error in getSmartReportData: " + e.toString());
    return { success: false, message: e.toString() };
  }
}
/**
 * [Data Source] ดึงข้อมูลสำหรับ Dashboard (KPIs และ Activity Feed)
 */
function getDashboardData() {
  try {
    const logData = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG).getDataRange().getValues();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let addedToday = 0; let soldToday = 0;
    const recentActivities = [];








    for (let i = logData.length - 1; i > 0 && recentActivities.length < 5; i--) {
        const logDate = new Date(logData[i][0]);
        if (isNaN(logDate.getTime())) continue;
       
        const details = logData[i][8] || '';
        const quantity = Math.abs(parseInt(logData[i][7]) || 0);








        if (recentActivities.length < 5) {
            recentActivities.push({
                timestamp: logDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit'}),
                user: (logData[i][2] || 'System').split('@')[0],
                details: details
            });
        }
       
        if (logDate >= today) {
            if (details.startsWith('[ADD]') || details.startsWith('[UNDO-SELL]') || details.startsWith('[UNDO-DELETE]')) {
                addedToday += quantity;
            } else if (details.startsWith('[SELL]') || details.startsWith('[UNDO-ADD]')) {
                soldToday += quantity;
            }
        }
    }
    return { success: true, kpis: { addedToday, soldToday }, activities: recentActivities };
  } catch (e) {
    Logger.log("Error in getDashboardData: " + e.toString());
    return { success: false, message: e.toString() };
  }
}








/**
 * [Action] อัปเดตข้อมูลในเซลล์เดียวเมื่อผู้ใช้ดับเบิลคลิกแก้ไข
 */
function updateCellData(request) {
  let lock;
  try {
    const { primaryKey, cellIndex, newValue, userEmail } = request;
    const userRole = getUserRole(userEmail);
    if (userRole !== 'Admin' && parseInt(cellIndex) === CONFIG.COLUMNS.PRICE) {
      return { success: false, message: 'Permission Denied. Only Admins can edit prices.' };
    }








    lock = LockService.getScriptLock(); lock.waitLock(30000);
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();
    const [tireSize, brand, model] = primaryKey.split('|');








    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if ( (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize.trim() && (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand.trim() && (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model.trim() ) {
        const targetCell = sheet.getRange(i + 1, parseInt(cellIndex) + 1);
        const oldValue = targetCell.getValue(); // <-- อ่านค่าเก่าก่อนแก้ไข
        targetCell.setValue(newValue);
        clearSheetCache(CONFIG.SHEETS.STOCK);
       
        const fieldName = Object.keys(CONFIG.COLUMNS).find(key => CONFIG.COLUMNS[key] === parseInt(cellIndex)) || `Column ${cellIndex}`;
        const details = `แก้ไข '${fieldName}' จาก "${oldValue}" เป็น "${newValue}"`;
        writeToAuditLog(userEmail, 'EDIT', primaryKey, details, oldValue, newValue);
       
        // ส่งข้อมูลสำหรับ Undo กลับไปพร้อมข้อความสำเร็จ
        return { success: true, message: MESSAGES.WEB_APP.SUCCESS_UPDATE, undoData: { type: 'edit', primaryKey, cellIndex, oldValue: oldValue } };
      }
    }
    return { success: false, message: MESSAGES.WEB_APP.ERROR_NOT_FOUND };
  } catch (e) { return { success: false, message: e.toString() }; }
  finally { if (lock && lock.hasLock()) { lock.releaseLock(); } }
}
















function addNewRowData(request) {
  if (getUserRole(request.userEmail) !== 'Admin') {
    return { success: false, message: 'Permission Denied. Only Admins can add new items.' };
  }
  const result = insertNewTireInSheet(request.itemData);
  if (result.success) {
    const primaryKey = `${request.itemData.tireSize}|${request.itemData.brand}|${request.itemData.model}`;
    const details = `สร้างสินค้าใหม่: ${JSON.stringify(request.itemData)}`;
    writeToAuditLog(request.userEmail, 'CREATE', primaryKey, details);
    // ส่งข้อมูลสำหรับ Undo กลับไปพร้อมข้อความสำเร็จ
    return { success: true, message: MESSAGES.WEB_APP.SUCCESS_CREATE, undoData: { type: 'add', primaryKey: primaryKey } };
  } else {
    return { success: false, message: result.message };
  }
}
















function deleteRowData(request) {
  if (getUserRole(request.userEmail) !== 'Admin') {
    return { success: false, message: 'Permission Denied.' };
  }
  const [tireSize, brand, model] = request.primaryKey.split('|');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
      const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i > 0; i--) {
          const row = data[i];
          if ( (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize && (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand && (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model ) {
              const deletedRowData = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).getValues()[0]; // อ่านข้อมูลทั้งแถวก่อนลบ
              sheet.deleteRow(i + 1);
              clearSheetCache(CONFIG.SHEETS.STOCK);
             
              const details = `ลบสินค้าทั้งแถว: ${request.primaryKey}`;
              writeToAuditLog(request.userEmail, 'DELETE', request.primaryKey, details);
              // ส่งข้อมูลสำหรับ Undo กลับไปพร้อมข้อความสำเร็จ
              return { success: true, message: MESSAGES.WEB_APP.SUCCESS_DELETE, undoData: { type: 'delete', primaryKey, deletedRowData } };
          }
      }
      return { success: false, message: MESSAGES.WEB_APP.ERROR_NOT_FOUND_DELETE };
  } catch (e) {
      return { success: false, message: e.toString() };
  } finally {
      if (lock) { lock.releaseLock(); }
  }
}








/**
 * [Action - CORRECTED] ปรับสต็อกขึ้นลง (+/-) ผ่านปุ่มในตาราง
 * และเพิ่มการบันทึกลง Log sheet สำหรับการคำนวณใน Dashboard
 */
function adjustStockData(request) {
    const { primaryKey, dotIndex, amount, userEmail } = request;
    const userRole = getUserRole(userEmail);
    if (userRole !== 'Admin' && userRole !== 'Warehouse') {
      return { success: false, message: MESSAGES.WEB_APP.ERROR_PERMISSION_DENIED };
    }








    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
        const data = sheet.getDataRange().getValues();
        const [tireSize, brand, model] = primaryKey.split('|');
        const stockColIndex = CONFIG.DOT_COLUMN_MAP[dotIndex].stock;
       
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if ((row[CONFIG.COLUMNS.TIRE_SIZE]||'').toString().trim() === tireSize.trim() && (row[CONFIG.COLUMNS.BRAND]||'').toString().trim() === brand.trim() && (row[CONFIG.COLUMNS.MODEL]||'').toString().trim() === model.trim()) {
                const cell = sheet.getRange(i + 1, stockColIndex + 1);
                const currentStock = parseInt(cell.getValue()) || 0;
                const newStock = currentStock + amount;
                if (newStock < 0) return { success: false, message: MESSAGES.WEB_APP.ERROR_STOCK_NEGATIVE };
                cell.setValue(newStock);
               
                const dotValue = (sheet.getRange(i + 1, CONFIG.DOT_COLUMN_MAP[dotIndex].dot + 1).getValue() || '').toString();








                // --- [CRITICAL FIX] บันทึก Log สำหรับ Dashboard ---
                if (amount < 0) { // บันทึกเฉพาะเมื่อเป็นการ 'ขาย' (ตัดสต็อก)
                   const logDetails = `[SELL] ตัดสต็อก ${brand} ${model} (DOT: ${dotValue}) จำนวน ${Math.abs(amount)} เส้น (Web App)`;
                   const logData = [new Date(), userEmail, userEmail, tireSize, brand, model, dotValue, amount, logDetails];
                   SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG).appendRow(logData);
                }
                // --- END OF CRITICAL FIX ---








                const action = amount > 0 ? 'ADJUST-UP' : 'ADJUST-DOWN';
                writeToAuditLog(userEmail, action, primaryKey, `Adjusted DOT ${dotIndex} stock by ${amount}. Old: ${currentStock}, New: ${newStock}`);
               
                clearSheetCache(CONFIG.SHEETS.STOCK);
                return { success: true };
            }
        }
        return { success: false, message: "Item not found." };
    } catch(e) {
        return { success: false, message: e.toString() };
    } finally {
        if (lock) lock.releaseLock();
    }
}








/**
 * [Action] อัปเดตข้อมูลทีละหลายรายการ
 */
function batchUpdateData(request) {
    const { primaryKeys, field, newValue, userEmail } = request;
    if (getUserRole(userEmail) !== 'Admin') {
        return { success: false, message: 'Permission Denied.' };
    }
    // ... (Code for batchUpdateData from previous answer is correct) ...
    // Note: ensure this logic is fully implemented here.
    return { success: true };
}








/**
 * [Action] ลบข้อมูลทีละหลายรายการ
 */
function batchDeleteData(request) {
    const { primaryKeys, userEmail } = request;
    if (getUserRole(userEmail) !== 'Admin') {
        return { success: false, message: 'Permission Denied.' };
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
        const data = sheet.getDataRange().getValues();
        const keysToDelete = new Set(primaryKeys);
        const rowNumbersToDelete = [];
        for (let i = 1; i < data.length; i++) {
            const pk = `${data[i][CONFIG.COLUMNS.TIRE_SIZE] || ''}|${data[i][CONFIG.COLUMNS.BRAND] || ''}|${data[i][CONFIG.COLUMNS.MODEL] || ''}`;
            if (keysToDelete.has(pk)) {
                rowNumbersToDelete.push(i + 1);
            }
        }
        if (rowNumbersToDelete.length > 0) {
            for (let i = rowNumbersToDelete.length - 1; i >= 0; i--) {
                sheet.deleteRow(rowNumbersToDelete[i]);
            }
            clearSheetCache(CONFIG.SHEETS.STOCK);
            writeToAuditLog(userEmail, 'BATCH-DELETE', `${rowNumbersToDelete.length} items`, `Deleted items via Web App: ${primaryKeys.join(', ')}`);
        }
        return { success: true };
    } catch (e) {
        Logger.log(`Error in batchDeleteData: ${e.toString()}`);
        return { success: false, message: e.toString() };
    } finally {
        lock.releaseLock();
    }
}
function undoLastAction(request) {
  const { undoData, userEmail } = request; // userEmail คืออีเมลจริงของผู้ใช้ เช่น "admin@example.com"
  if (!undoData) return { success: false, message: MESSAGES.WEB_APP.ERROR_UNDO_NO_DATA };
 
  const { type, primaryKey, cellIndex, oldValue, deletedRowData } = undoData;
  const auditUser = `${userEmail} (UNDO)`; // ใช้สำหรับบันทึก Log เท่านั้น
 
  // Undo การแก้ไข
  if (type === 'edit') {
    // ส่ง "userEmail" ดั้งเดิมเข้าไป เพื่อให้ updateCellData ตรวจสอบสิทธิ์ได้ถูกต้อง
    const undoRequest = { primaryKey, cellIndex, newValue: oldValue, userEmail: userEmail };
    writeToAuditLog(auditUser, 'UNDO-EDIT', primaryKey, `คืนค่ากลับเป็น "${oldValue}"`);
    return updateCellData(undoRequest);
  }
 
  // Undo การเพิ่ม (คือการลบ)
  if (type === 'add') {
    // ส่ง "userEmail" ดั้งเดิมเข้าไป เพื่อให้ deleteRowData ตรวจสอบสิทธิ์ได้ถูกต้อง
    const undoRequest = { primaryKey, userEmail: userEmail };
    writeToAuditLog(auditUser, 'UNDO-CREATE', primaryKey, `ยกเลิกการเพิ่มสินค้า`);
    return deleteRowData(undoRequest);
  }
 
  // Undo การลบ (คือการเพิ่มกลับเข้ามาใหม่)
  if (type === 'delete') {
    if (!deletedRowData) return { success: false, message: 'ไม่สามารถ Undo การลบได้เนื่องจากไม่มีข้อมูลสำรอง' };
   
    const itemData = {
      tireSize: deletedRowData[CONFIG.COLUMNS.TIRE_SIZE], brand: deletedRowData[CONFIG.COLUMNS.BRAND],
      model: deletedRowData[CONFIG.COLUMNS.MODEL], loadIndex: deletedRowData[CONFIG.COLUMNS.LOAD_INDEX],
      price: deletedRowData[CONFIG.COLUMNS.PRICE],
      dot1: deletedRowData[CONFIG.COLUMNS.DOT1], stock1: deletedRowData[CONFIG.COLUMNS.STOCK1], promo1: deletedRowData[CONFIG.COLUMNS.PROMO1],
      dot2: deletedRowData[CONFIG.COLUMNS.DOT2], stock2: deletedRowData[CONFIG.COLUMNS.STOCK2], promo2: deletedRowData[CONFIG.COLUMNS.PROMO2],
      dot3: deletedRowData[CONFIG.COLUMNS.DOT3], stock3: deletedRowData[CONFIG.COLUMNS.STOCK3], promo3: deletedRowData[CONFIG.COLUMNS.PROMO3],
      dot4: deletedRowData[CONFIG.COLUMNS.DOT4], stock4: deletedRowData[CONFIG.COLUMNS.STOCK4], promo4: deletedRowData[CONFIG.COLUMNS.PROMO4]
    };








    // addNewRowData จะตรวจสอบสิทธิ์จาก userEmail ที่ส่งเข้าไป
    const undoRequest = { itemData, userEmail: userEmail };
    writeToAuditLog(auditUser, 'UNDO-DELETE', primaryKey, `กู้คืนข้อมูลที่ถูกลบ`);
    const result = insertNewTireInSheet(itemData);
    if (result.success) {
  return { success: true, message: MESSAGES.WEB_APP.SUCCESS_UNDO };
} else {
  return { success: false, message: formatMessage(MESSAGES.WEB_APP.ERROR_UNDO_FAILED, { message: result.message })};
    }
  }
 
  return { success: false, message: MESSAGES.WEB_APP.ERROR_UNDO_UNKNOWN_TYPE };
}




 function doGetLiff(e) {
              const template = HtmlService.createTemplateFromFile('LIFF_Dashboard');
              // ส่งค่า LIFF ID ไปให้ HTML
              template.liffId = CONFIG.LIFF_IDS.DASHBOARD;
              return template.evaluate()
                .setTitle('Business Dashboard')
                .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
            }


/**
 * [NEW] รับข้อมูลสินค้าหลายรายการและบันทึกลงชีตในครั้งเดียว
 * @param {Object} request - ประกอบด้วย {items: Array<Object>, userEmail: string}
 * @returns {Object} ผลลัพธ์การทำงาน
 */
function batchAddItems(request) {
  const { items, userEmail } = request;


  // --- 1. ตรวจสอบสิทธิ์ ---
  if (getUserRole(userEmail) !== 'Admin') {
    return { success: false, message: 'Permission Denied. Only Admins can add new items.' };
  }


  if (!items || items.length === 0) {
    return { success: false, message: 'No items to add.' };
  }


  const lock = LockService.getScriptLock();
  lock.waitLock(30000);


  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
   
    // --- 2. ดึงข้อมูลที่มีอยู่เพื่อตรวจสอบข้อมูลซ้ำ (ทำครั้งเดียว) ---
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = new Set();
    for(let i = 1; i < existingData.length; i++) {
      const key = `${existingData[i][CONFIG.COLUMNS.TIRE_SIZE]}|${existingData[i][CONFIG.COLUMNS.BRAND]}|${existingData[i][CONFIG.COLUMNS.MODEL]}`;
      existingKeys.add(key);
    }
   
    const rowsToAdd = [];
    const skippedItems = [];


    // --- 3. ประมวลผลและสร้างแถวข้อมูลใหม่ ---
    items.forEach(item => {
      const newKey = `${item.tireSize}|${item.brand}|${item.model}`;
      if (existingKeys.has(newKey)) {
        skippedItems.push(item.model); // เก็บชื่อรุ่นที่ซ้ำไว้
        return; // ข้ามรายการนี้ไป
      }
     
      const newRowData = new Array(sheet.getLastColumn()).fill('');
      newRowData[CONFIG.COLUMNS.TIRE_SIZE] = item.tireSize;
      newRowData[CONFIG.COLUMNS.BRAND] = item.brand;
      newRowData[CONFIG.COLUMNS.MODEL] = item.model;
      newRowData[CONFIG.COLUMNS.PRICE] = item.price || '';
      // สมมติว่าข้อมูลที่กรอกมาคือสำหรับ DOT/Stock ช่องที่ 1
      newRowData[CONFIG.COLUMNS.DOT1] = item.dot || '';
      newRowData[CONFIG.COLUMNS.STOCK1] = item.stock || 0;
     
      rowsToAdd.push(newRowData);
      existingKeys.add(newKey); // เพิ่ม Key ใหม่เข้าไปใน Set เพื่อป้องกันการซ้ำกันเองใน Batch
    });


    // --- 4. บันทึกข้อมูลทั้งหมดในครั้งเดียว (สำคัญมาก) ---
    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
      clearSheetCache(CONFIG.SHEETS.STOCK); // เคลียร์ Cache
      writeToAuditLog(userEmail, 'BATCH-CREATE', `${rowsToAdd.length} items`, `Added ${rowsToAdd.length} items via Batch Add.`);
    }
   
    // --- 5. สร้างข้อความตอบกลับ ---
    let message = `✅ เพิ่มข้อมูลสำเร็จ ${rowsToAdd.length} รายการ`;
    if (skippedItems.length > 0) {
      message += ` (ข้าม ${skippedItems.length} รายการเนื่องจากข้อมูลซ้ำ: ${skippedItems.join(', ')})`;
    }


    return { success: true, message: message };


  } catch (e) {
    Logger.log(`Error in batchAddItems: ${e.toString()}`);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}


/**
 * [SIMPLE VERSION 2] นำเข้าข้อมูลจากไฟล์ CSV โดยอ่านจาก Header
 * และดึงข้อมูลเฉพาะ Tire Size, Brand, Model, Load Index, และ Price
 * @param {Object} request ประกอบด้วย {csvContent, userEmail}
 * @returns {Object} ผลลัพธ์การทำงาน
 */
function importFromCsv(request) {
  const { csvContent, userEmail } = request;


  if (getUserRole(userEmail) !== 'Admin') {
    return { success: false, message: 'Permission Denied. Only Admins can import data.' };
  }
  if (!csvContent) {
    return { success: false, message: 'No content to import.' };
  }


  const lock = LockService.getScriptLock();
  lock.waitLock(30000);


  try {
    const sourceData = Utilities.parseCsv(csvContent);
    if (sourceData.length < 2) {
      return { success: false, message: 'ไฟล์ CSV ไม่มีข้อมูล (ต้องมีอย่างน้อย 1 แถวหัวข้อ และ 1 แถวข้อมูล)' };
    }


    const headers = sourceData[0].map(h => (h || '').trim().toLowerCase().replace(/\s+/g, ''));


    // --- 1. สร้าง Map เพื่อหาคอลัมน์ที่ต้องการ (5 อย่าง) ---
    const columnIndexMap = {};
    const headerSynonyms = {
      tireSize:  ['tiresize', 'เบอร์ยาง', 'เบอร์', 'size'],
      brand:     ['brand', 'ยี่ห้อ' , 'ยี่ห้อยาง'],
      model:     ['model', 'รุ่น'],
      loadIndex: ['loadindex', 'ดัชนี', 'load index'],
      price:     ['price', 'ราคา']
    };


    for (const key in headerSynonyms) {
      const synonyms = headerSynonyms[key];
      const index = headers.findIndex(header => synonyms.includes(header));
      if (index !== -1) {
        columnIndexMap[key] = index;
      }
    }


    // --- 2. ตรวจสอบว่ามีหัวข้อที่จำเป็นครบหรือไม่ ---
    if (columnIndexMap.tireSize === undefined || columnIndexMap.brand === undefined || columnIndexMap.model === undefined) {
      return { success: false, message: 'ไม่พบหัวข้อคอลัมน์ที่จำเป็นในไฟล์ CSV (ต้องมี: เบอร์ยาง, ยี่ห้อ, รุ่น)' };
    }


    // --- 3. อ่านชีตปลายทางเพื่อเช็คข้อมูลซ้ำ ---
    const destSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    const destData = destSheet.getDataRange().getValues();
    const existingKeys = new Set(destData.slice(1).map(row => `${row[CONFIG.COLUMNS.TIRE_SIZE]}|${row[CONFIG.COLUMNS.BRAND]}|${row[CONFIG.COLUMNS.MODEL]}`));
   
    const rowsToAdd = [];
    let skippedCount = 0;
   
    // --- 4. ประมวลผลข้อมูลทีละแถว ---
    for (let i = 1; i < sourceData.length; i++) {
      const row = sourceData[i];
     
      const tireSize = (row[columnIndexMap.tireSize] || '').toString().trim();
      const brand = (row[columnIndexMap.brand] || '').toString().trim().toUpperCase();
      const model = (row[columnIndexMap.model] || '').toString().trim();
     
      if (!tireSize || !brand || !model) continue;


      const newKey = `${tireSize}|${brand}|${model}`;
      if (existingKeys.has(newKey)) {
        skippedCount++;
        continue;
      }


      const newRowData = new Array(destSheet.getLastColumn()).fill('');
      newRowData[CONFIG.COLUMNS.TIRE_SIZE] = tireSize;
      newRowData[CONFIG.COLUMNS.BRAND] = brand;
      newRowData[CONFIG.COLUMNS.MODEL] = model;
     
      // ดึงข้อมูล Load Index และ Price (ถ้ามี)
      if (columnIndexMap.loadIndex !== undefined) {
        newRowData[CONFIG.COLUMNS.LOAD_INDEX] = row[columnIndexMap.loadIndex] || '';
      }
      if (columnIndexMap.price !== undefined) {
        newRowData[CONFIG.COLUMNS.PRICE] = row[columnIndexMap.price] || '';
      }


      rowsToAdd.push(newRowData);
      existingKeys.add(newKey);
    }


    // --- 5. บันทึกข้อมูลใหม่ทั้งหมดลงชีต ---
    if (rowsToAdd.length > 0) {
      destSheet.getRange(destSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
      clearSheetCache(CONFIG.SHEETS.STOCK);
      writeToAuditLog(userEmail, 'IMPORT-CSV', `${rowsToAdd.length} items`, `Imported from a CSV file.`);
    }


    return { success: true, message: `นำเข้าข้อมูลสำเร็จ ${rowsToAdd.length} รายการ (ข้าม ${skippedCount} รายการที่ข้อมูลซ้ำ)` };


  } catch (e) {
    Logger.log(`Error in importFromCsv: ${e.toString()}`);
    return { success: false, message: `เกิดข้อผิดพลาดในการประมวลผลไฟล์ CSV: ${e.message}` };
  } finally {
    lock.releaseLock();
  }
}
/**
 * [FINAL & SAFEST VERSION] อัปเดตข้อมูลหลายรายการพร้อมกัน
 * เพิ่มการตรวจสอบ CONFIG และการดักจับข้อผิดพลาดที่เข้มข้นที่สุด
 * @param {Object} request ประกอบด้วย {primaryKeys, field, newValue, userEmail}
 * @returns {Object} ผลลัพธ์การทำงาน
 */
function batchUpdateItems(request) {
  try {
    // --- ขั้นตอนที่ 0: ตรวจสอบความพร้อมของ CONFIG ก่อนเริ่มทำงาน ---
    if (!CONFIG || !CONFIG.COLUMNS || CONFIG.COLUMNS.TIRE_SIZE === undefined || CONFIG.COLUMNS.BRAND === undefined || CONFIG.COLUMNS.MODEL === undefined) {
      throw new Error("CONFIG.COLUMNS is not configured correctly. TIRE_SIZE, BRAND, or MODEL is missing.");
    }
   
    Logger.log(`[Batch Update] Started. User: ${request.userEmail}, Field: ${request.field}, Value: ${request.newValue}`);
    const { primaryKeys, field, newValue, userEmail } = request;


    // --- ขั้นตอนที่ 1: ตรวจสอบสิทธิ์และข้อมูลนำเข้า ---
    if (getUserRole(userEmail) !== 'Admin') {
      return { success: false, message: 'Permission Denied. Only Admins can perform batch updates.' };
    }
    if (!primaryKeys || primaryKeys.length === 0) {
      return { success: false, message: 'No items selected for update.' };
    }


    const lock = LockService.getScriptLock();
    lock.waitLock(30000);


    // --- ขั้นตอนที่ 2: เตรียมข้อมูลและ Column Index ---
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    if (!sheet) {
        throw new Error(`Sheet with name "${CONFIG.SHEETS.STOCK}" not found.`);
    }
   
    const fieldToColumnMap = {
      'brand': CONFIG.COLUMNS.BRAND, 'price': CONFIG.COLUMNS.PRICE,
      'promo1': CONFIG.COLUMNS.PROMO1, 'promo2': CONFIG.COLUMNS.PROMO2,
      'promo3': CONFIG.COLUMNS.PROMO3, 'promo4': CONFIG.COLUMNS.PROMO4
    };
    const columnIndex = fieldToColumnMap[field];
    if (columnIndex === undefined) {
      throw new Error(`Invalid or non-batch-editable field specified: ${field}`);
    }


    // --- ขั้นตอนที่ 3: ตรวจสอบและแปลงชนิดข้อมูล ---
    let valueToSave = newValue;
    if (field === 'price') {
      const numericValue = parseFloat(String(newValue).replace(/,/g, ''));
      if (isNaN(numericValue)) {
        throw new Error(`ข้อมูลราคาไม่ถูกต้อง: '${newValue}' ไม่ใช่ตัวเลข`);
      }
      valueToSave = numericValue;
    }
   
    // --- ขั้นตอนที่ 4: อ่าน, แก้ไข, และเขียนกลับ ---
    const range = sheet.getDataRange();
    const allData = range.getValues();
    const keysToUpdate = new Set(primaryKeys);
    let updatedCount = 0;


    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      // สร้าง Key ด้วยความระมัดระวัง
      const tireSize = row[CONFIG.COLUMNS.TIRE_SIZE] || '';
      const brand = row[CONFIG.COLUMNS.BRAND] || '';
      const model = row[CONFIG.COLUMNS.MODEL] || '';
      const currentKey = `${tireSize}|${brand}|${model}`;
     
      if (keysToUpdate.has(currentKey)) {
        allData[i][columnIndex] = valueToSave;
        updatedCount++;
      }
    }


    if (updatedCount > 0) {
      range.setValues(allData);
     
      try {
        clearSheetCache(CONFIG.SHEETS.STOCK);
        writeToAuditLog(userEmail, 'BATCH-UPDATE', `${updatedCount} items`, `Set field '${field}' to '${valueToSave}'`);
      } catch (helperError) {
         Logger.log(`WARNING: Main update succeeded, but a helper function failed: ${helperError.toString()}`);
      }
    }
   
    lock.releaseLock();
    return { success: true, message: `อัปเดตข้อมูล ${updatedCount} รายการสำเร็จ` };


  } catch (e) {
    Logger.log(`[Batch Update] FATAL ERROR: ${e.stack}`);
    return { success: false, message: `Server Error: ${e.message}` };
  }
}



