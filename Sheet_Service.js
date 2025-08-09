function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('⚙️ Admin Tools') // สร้างเมนูชื่อ "Admin Tools"
      .addItem('🗄️ จัดเก็บ Log เก่า (Archive Logs)', 'archiveOldLogs') // .
      .addItem('🔄 ล้าง Cache ผู้ดูแลระบบ', 'clearMyCache') // เพิ่มเมนูย่อยสำหรับล้าง Cache
      .addToUi();
}


function updateStockInSheet(tireSize, brand, model, dotIndex, quantityToChange) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();
    const columnMap = CONFIG.DOT_COLUMN_MAP;
    if (!columnMap[dotIndex]) {
      return { success: false, message: 'DOT Index ไม่ถูกต้อง' }; // Technical error, can remain
    }
    const dotColIndex = columnMap[dotIndex].dot;
    const stockColIndex = columnMap[dotIndex].stock;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (
        (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize &&
        (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand &&
        (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model
      ) {
        const stockCell = sheet.getRange(i + 1, stockColIndex + 1);
        const currentStock = parseInt(stockCell.getValue()) || 0;
        if (quantityToChange < 0 && currentStock < Math.abs(quantityToChange)) {
          const errorMessage = formatMessage(MESSAGES.ERROR.STOCK_INSUFFICIENT, { currentStock: currentStock });
          return { success: false, message: errorMessage };
        }
        const newStock = currentStock + quantityToChange;
        stockCell.setValue(newStock);
        clearSheetCache(CONFIG.SHEETS.STOCK);
        const dotValue = sheet.getRange(i + 1, dotColIndex + 1).getValue().toString();
        return { success: true, oldStock: currentStock, newStock: newStock, dotValue: dotValue };
      }
    }
    return { success: false, message: MESSAGES.ERROR.ITEM_NOT_FOUND_GENERIC };
  } finally {
    lock.releaseLock();
  }
}




function insertNewTireInSheet(itemData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();
    let lastMatchingRow = -1;
    for (let i = data.length - 1; i > 0; i--) {
      const tireSizeInSheet = (data[i][CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim();
      if (tireSizeInSheet === itemData.tireSize.trim()) {
        lastMatchingRow = i + 1;
        break;
      }
    }
    const clean = (val) => (val === '-' || val === undefined || val === null) ? '' : val;
    const newRowData = new Array(sheet.getLastColumn()).fill('');
    newRowData[CONFIG.COLUMNS.TIRE_SIZE]   = clean(itemData.tireSize);
    newRowData[CONFIG.COLUMNS.BRAND]       = clean(itemData.brand);
    newRowData[CONFIG.COLUMNS.MODEL]       = clean(itemData.model);
    newRowData[CONFIG.COLUMNS.LOAD_INDEX]  = clean(itemData.loadIndex);
    newRowData[CONFIG.COLUMNS.PRICE]       = clean(itemData.price);
    for (let i = 1; i <= 4; i++) {
        newRowData[CONFIG.DOT_COLUMN_MAP[i].dot]   = clean(itemData['dot' + i]);
        newRowData[CONFIG.DOT_COLUMN_MAP[i].stock] = clean(itemData['stock' + i]) || 0;
        newRowData[CONFIG.DOT_COLUMN_MAP[i].promo] = clean(itemData['promo' + i]);
    }
    if (lastMatchingRow !== -1) {
      sheet.insertRowAfter(lastMatchingRow);
      sheet.getRange(lastMatchingRow + 1, 1, 1, newRowData.length).setValues([newRowData]);
    } else {
      sheet.appendRow(newRowData);
    }
    clearSheetCache(CONFIG.SHEETS.STOCK);
    return { success: true };
  } catch (e) {
    Logger.log("Error in insertNewTireInSheet: " + e.toString() + " Stack: " + e.stack);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}




function deleteRowByData(tireSize, brand, model) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
        const data = sheet.getDataRange().getValues();
        for (let i = data.length - 1; i > 0; i--) {
            const row = data[i];
            if (
                (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize &&
                (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand &&
                (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model
            ) {
                sheet.deleteRow(i + 1);
                clearSheetCache(CONFIG.SHEETS.STOCK);
                return { success: true };
            }
        }
        return { success: false, message: 'ไม่พบแถวข้อมูลที่จะลบ อาจถูกลบไปแล้ว' };
    } catch(e) {
        return { success: false, message: e.toString() };
    } finally {
        lock.releaseLock();
    }
}




function updateItemDetailInSheet(tireSize, brand, model, fieldToEdit, newValue) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK);
    const data = sheet.getDataRange().getValues();
    const columnMap = {
      'tireSize': CONFIG.COLUMNS.TIRE_SIZE, 'brand': CONFIG.COLUMNS.BRAND,
      'model': CONFIG.COLUMNS.MODEL, 'loadIndex': CONFIG.COLUMNS.LOAD_INDEX,
      'price': CONFIG.COLUMNS.PRICE,
      'dot1': CONFIG.COLUMNS.DOT1, 'stock1': CONFIG.COLUMNS.STOCK1, 'promo1': CONFIG.COLUMNS.PROMO1,
      'dot2': CONFIG.COLUMNS.DOT2, 'stock2': CONFIG.COLUMNS.STOCK2, 'promo2': CONFIG.COLUMNS.PROMO2,
      'dot3': CONFIG.COLUMNS.DOT3, 'stock3': CONFIG.COLUMNS.STOCK3, 'promo3': CONFIG.COLUMNS.PROMO3,
      'dot4': CONFIG.COLUMNS.DOT4, 'stock4': CONFIG.COLUMNS.STOCK4, 'promo4': CONFIG.COLUMNS.PROMO4,
    };
    const colIndex = columnMap[fieldToEdit];
    if (colIndex === undefined) return { success: false, message: 'Field not editable' };
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (
        (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize &&
        (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand &&
        (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model
      ) {
        const cell = sheet.getRange(i + 1, colIndex + 1);
        const oldValue = cell.getValue();
        cell.setValue(newValue);
        return { success: true, oldValue: oldValue };
      }
    }
    return { success: false, message: MESSAGES.ERROR.ITEM_NOT_FOUND_GENERIC };
  } catch(e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}




function getTireDataByRow(tireSize, brand, model) {
  const data = getSheetData(CONFIG.SHEETS.STOCK);
  for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (
          (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize &&
          (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand &&
          (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model
      ) {
          return {
              tireSize: row[CONFIG.COLUMNS.TIRE_SIZE], brand: row[CONFIG.COLUMNS.BRAND],
              model: row[CONFIG.COLUMNS.MODEL], loadIndex: row[CONFIG.COLUMNS.LOAD_INDEX],
              price: row[CONFIG.COLUMNS.PRICE],
              dot1: row[CONFIG.COLUMNS.DOT1], stock1: row[CONFIG.COLUMNS.STOCK1], promo1: row[CONFIG.COLUMNS.PROMO1],
              dot2: row[CONFIG.COLUMNS.DOT2], stock2: row[CONFIG.COLUMNS.STOCK2], promo2: row[CONFIG.COLUMNS.PROMO2],
              dot3: row[CONFIG.COLUMNS.DOT3], stock3: row[CONFIG.COLUMNS.STOCK3], promo3: row[CONFIG.COLUMNS.PROMO3],
              dot4: row[CONFIG.COLUMNS.DOT4], stock4: row[CONFIG.COLUMNS.STOCK4], promo4: row[CONFIG.COLUMNS.PROMO4],
          };
      }
  }
  return null;
}




function getDotValueFromSheet(tireSize, brand, model, dotIndex) {
  try {
    const data = getSheetData(CONFIG.SHEETS.STOCK);
    const dotColIndex = CONFIG.DOT_COLUMN_MAP[dotIndex]?.dot;
    if (dotColIndex === undefined) return `DOT ${dotIndex}`;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if ((row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim() === tireSize && (row[CONFIG.COLUMNS.BRAND] || '').toString().trim() === brand && (row[CONFIG.COLUMNS.MODEL] || '').toString().trim() === model) {
        return (row[dotColIndex] || '').toString() || `DOT ${dotIndex}`;
      }
    }
    return `DOT ${dotIndex}`;
  } catch (e) {
    Logger.log("Error in getDotValueFromSheet: " + e.toString());
    return `DOT ${dotIndex}`;
  }
}




function searchAndGroupTireData(searchInput) {
  const data = getSheetData(CONFIG.SHEETS.STOCK);
  const groupedResults = {};
  const lowerCaseSearchInput = searchInput.toLowerCase().trim();
  const normalizedSearchInput = lowerCaseSearchInput.replace(/[\s/r]/g, '');
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tireSize = (row[CONFIG.COLUMNS.TIRE_SIZE] || '').toString().trim();
    const brand = (row[CONFIG.COLUMNS.BRAND] || '').toString().trim();
    const model = (row[CONFIG.COLUMNS.MODEL] || '').toString().trim();
    if (!tireSize && !brand && !model) continue;
    const fullText = `${tireSize} ${brand} ${model}`.toLowerCase();
    const normalizedTireSize = tireSize.toLowerCase().replace(/[\s/r]/g, '');
    if (fullText.includes(lowerCaseSearchInput) || (normalizedSearchInput.length > 3 && normalizedTireSize.includes(normalizedSearchInput))) {
      if (!groupedResults[brand]) groupedResults[brand] = [];
      groupedResults[brand].push({
        tireSize, model: model || 'N/A',
        loadIndex: row[CONFIG.COLUMNS.LOAD_INDEX] || '', price: row[CONFIG.COLUMNS.PRICE] || 0,
        dot1: row[CONFIG.COLUMNS.DOT1] || '', stock1: row[CONFIG.COLUMNS.STOCK1] || 0, promo1: row[CONFIG.COLUMNS.PROMO1] || '',
        dot2: row[CONFIG.COLUMNS.DOT2] || '', stock2: row[CONFIG.COLUMNS.STOCK2] || 0, promo2: row[CONFIG.COLUMNS.PROMO2] || '',
        dot3: row[CONFIG.COLUMNS.DOT3] || '', stock3: row[CONFIG.COLUMNS.STOCK3] || 0, promo3: row[CONFIG.COLUMNS.PROMO3] || '',
        dot4: row[CONFIG.COLUMNS.DOT4] || '', stock4: row[CONFIG.COLUMNS.STOCK4] || 0, promo4: row[CONFIG.COLUMNS.PROMO4] || ''
      });
    }
  }
  return groupedResults;
}




function getUniqueBrands() {
  const data = getSheetData(CONFIG.SHEETS.STOCK).slice(1);
  const brandSet = new Set(data.map(row => row[CONFIG.COLUMNS.BRAND]).filter(Boolean));
  return Array.from(brandSet).sort();
}




function createItemInSheet(itemData) {
  return insertNewTireInSheet(itemData); // This is an alias, we can just use the other function.
}




function archiveOldLogs() {
  Logger.log("--- Starting Log Archiving Task ---");
  if (!CONFIG.ARCHIVE_SPREADSHEET_ID) {
    Logger.log("ERROR: ARCHIVE_SPREADSHEET_ID is not defined in Config.gs. Archiving task aborted.");
    return;
  }
  const sourceSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  const archiveSs = SpreadsheetApp.openById(CONFIG.ARCHIVE_SPREADSHEET_ID);
  const archiveSheet = archiveSs.getSheets()[0];
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - CONFIG.LOG_ARCHIVE_DAYS);
  const allLogData = sourceSheet.getDataRange().getValues();
  if (allLogData.length <= 1) {
    Logger.log("No log data to process. Task finished.");
    return;
  }
  const header = allLogData.shift();
  const logsToArchive = [];
  const logsToKeep = [];
  allLogData.forEach(row => {
    const logDate = new Date(row[0]);
    if (logDate < cutoffDate) {
      logsToArchive.push(row);
    } else {
      logsToKeep.push(row);
    }
  });
  if (logsToArchive.length > 0) {
    Logger.log(`Found ${logsToArchive.length} old logs to archive.`);
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, logsToArchive.length, header.length).setValues(logsToArchive);
    sourceSheet.clearContents();
    sourceSheet.getRange(1, 1, logsToKeep.length + 1, header.length).setValues([header, ...logsToKeep]);
    Logger.log(`Successfully archived ${logsToArchive.length} logs and cleaned the source Log sheet.`);
  } else {
    Logger.log("No logs were old enough to be archived. Task finished.");
  }
}




function keepWarm() {
  Logger.log("Keeping the script warm.");
}







