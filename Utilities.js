

function formatMessage(message, replacements = {}) {
  if (!message) return '';
  let formatted = message;
  for (const key in replacements) {
    const placeholder = new RegExp('%' + key + '%', 'g');
    formatted = formatted.replace(placeholder, replacements[key]);
  }
  return formatted;
}




// ===============================================================
// === ระบบ Cache และ Utilities ===
// ===============================================================
function getSheetData(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `sheet_data_${CONFIG.SPREADSHEET_ID}_${sheetName}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) { return JSON.parse(cachedData); }
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  cache.put(cacheKey, JSON.stringify(data), CONFIG.CACHE_EXPIRATION_SECONDS);
  return data;
}




function clearSheetCache(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `sheet_data_${CONFIG.SPREADSHEET_ID}_${sheetName}`;
  cache.remove(cacheKey);
}




function handleError(err, replyToken, context = 'General Error') {
  const errorId = 'ERR-' + Date.now();
  const errorMessage = err.toString();
  const errorStack = err.stack || 'N/A';
  Logger.log(`[${errorId}] Context: ${context} | Error: ${errorMessage} | Stack: ${errorStack}`);
  try {
    const errorSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ERROR_LOG);
    if (errorSheet) {
      errorSheet.appendRow([ new Date(), errorId, context, errorMessage, errorStack ]);
    }
  } catch (logErr) {
    Logger.log(`!!! CRITICAL: Failed to write to ErrorLog sheet. Error: ${logErr.toString()}`);
  }
  if (replyToken) {
    const message = formatMessage(MESSAGES.ERROR.GENERAL, { errorId: errorId });
    replyToLine(replyToken, [{ type: 'text', text: message }]);
  }
}




// ===============================================================
// === พื้นฐาน (API Calls, Logging) ===
// ===============================================================
function writeToLogSheet(logData) {
  try {
    SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG).appendRow(logData);
  } catch (err) { Logger.log('Error writing to log sheet: ' + err.toString()); }
}




function getLineUserProfile(userId) {
  if (!userId) return 'N/A';
  const cache = CacheService.getUserCache();
  const cacheKey = `profile_${userId}`;
  const cachedProfile = cache.get(cacheKey);
  if (cachedProfile) { return cachedProfile; }
  try {
    const url = 'https://api.line.me/v2/bot/profile/' + userId;
    const options = { method: 'get', headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN }, muteHttpExceptions: true };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const userProfile = JSON.parse(response.getContentText());
      const displayName = userProfile.displayName ? userProfile.displayName : 'Unknown User';
      cache.put(cacheKey, displayName, CONFIG.PROFILE_CACHE_EXPIRATION_SECONDS);
      return displayName;
    } else {
      Logger.log(`Failed to fetch LINE profile for ${userId}. Response: ${response.getContentText()}`);
      return 'Unknown User';
    }
  } catch (err) {
    Logger.log('Error fetching LINE profile: ' + err.toString());
    return userId;
  }
}




function replyToLine(replyToken, messages) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = { replyToken, messages };
  const options = { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log(`Failed to reply. Code: ${response.getResponseCode()}. Body: ${response.getContentText()}`);
  }
}




function generateHelpMessage() {
  const help = MESSAGES.HELP;
  const part1 = `${help.PART1_TITLE}\n${help.PART1_BODY}`;
  const part2 = `${help.PART2_TITLE}\n${help.PART2_BODY}`;
  const part3 = `${help.PART3_TITLE}\n${help.PART3_BODY}`;
  const separator = "\n\n──────────────────\n\n";
  return [help.TITLE, part1, part2, part3, help.FOOTER].join(separator);
}




function writeToAuditLog(userEmail, action, targetItem, details, oldValue = '', newValue = '') {
  try {
    const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('AuditLog');
    if (!logSheet) return;
    const newRow = [ new Date(), userEmail, action, targetItem, details, oldValue, newValue ];
    logSheet.appendRow(newRow);
  } catch (e) {
    Logger.log(`!!! FAILED TO WRITE AUDIT LOG: ${e.toString()}`);
  }
}




function getUserRole(email) {
  if (!email || email === "Anonymous") { return 'Guest'; }
  const normalizedEmail = email.toLowerCase().trim();
  const cache = CacheService.getUserCache();
  const cacheKey = `role_${normalizedEmail}`;
  const cachedRole = cache.get(cacheKey);
  if (cachedRole) { return cachedRole; }
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const userSheet = ss.getSheetByName('Users');
    if (!userSheet) {
      Logger.log("Warning: 'Users' sheet not found. Defaulting all users to 'Guest'.");
      return 'Guest';
    }
    const data = userSheet.getRange('A:B').getValues();
    for (let i = 1; i < data.length; i++) {
      const sheetEmail = (data[i][0] || '').toString().toLowerCase().trim();
      if (sheetEmail === normalizedEmail) {
        const role = (data[i][1] || 'Sales').toString().trim();
        cache.put(cacheKey, role, 3600);
        return role;
      }
    }
    return 'Sales';
  } catch (e) {
    Logger.log(`Error in getUserRole for ${email}: ${e.toString()}`);
    return 'Guest';
  }
}




function getUserRoleFromLineId(userId) {
  if (!userId) { return 'Guest'; }
  const cache = CacheService.getUserCache();
  const cacheKey = `role_${userId}`;
  const cachedRole = cache.get(cacheKey);
  if (cachedRole) { return cachedRole; }
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const userSheet = ss.getSheetByName('Users');
    if (!userSheet) { return 'Guest'; }
    const data = userSheet.getRange('A:B').getValues();
    for (let i = 1; i < data.length; i++) {
      const sheetIdentifier = (data[i][0] || '').toString().trim();
      if (sheetIdentifier === userId) {
        const role = (data[i][1] || 'Guest').toString().trim();
        cache.put(cacheKey, role, 3600);
        return role;
      }
    }
    return 'Guest';
  } catch (e) {
    Logger.log(`Error in getUserRoleFromLineId for ${userId}: ${e.toString()}`);
    return 'Guest';
  }
}




function logIdRequest(userId, userName) {
  try {
    const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('ID_Log');
    if (!logSheet) return;
    logSheet.appendRow([new Date(), userId, userName]);
  } catch (e) {
    Logger.log('Failed to log ID request: ' + e);
  }
}




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
            if (details.startsWith('[ADD]') || details.startsWith('[UNDO-SELL]')) {
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




function pushMessageToLine(userId, messages) {
  if (!userId || !messages) {
    Logger.log("Push message failed: userId or messages is missing.");
    return;
  }
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = { to: userId, messages: messages };
  const options = { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log(`Failed to push message to ${userId}. Code: ${response.getResponseCode()}. Body: ${response.getContentText()}`);
  }
}




function multicastMessageToLine(userIds, messages) {
  if (!userIds || userIds.length === 0 || !messages) {
    Logger.log("Multicast failed: userIds array is empty or messages is missing.");
    return;
  }
  const url = 'https://api.line.me/v2/bot/message/multicast';
  const payload = { to: userIds, messages: messages };
  const options = { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log(`Failed to multicast message. Code: ${response.getResponseCode()}. Body: ${response.getContentText()}`);
  }
}




function clearMyCache() {
  const adminIds = CONFIG.ADMIN_USER_IDS; // ใช้จาก Config
  const cache = CacheService.getUserCache();
  adminIds.forEach(id => {
    const cacheKey = `role_${id}`;
    cache.remove(cacheKey);
    Logger.log(`Cache cleared for user: ${id}`);
  });
  SpreadsheetApp.getUi().alert(`ล้าง Cache สำหรับ ${adminIds.length} บัญชีเรียบร้อยแล้ว!`);
}









