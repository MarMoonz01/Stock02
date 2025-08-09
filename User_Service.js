





function getUsers() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.SHEETS.USERS}" not found.`);
    }
    const data = sheet.getDataRange().getValues();
    const users = [];
    // Start from 1 to skip header row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Ensure the identifier is not empty
        users.push({
          identifier: data[i][0], // Can be UserID or Email
          role: data[i][1] || 'Sales', // Default to 'Sales' if role is empty
          username: data[i][2] || '',
          rowIndex: i + 1 // Store the original row index for updates/deletes
        });
      }
    }
    return { success: true, data: users };
  } catch (e) {
    Logger.log(`Error in getUsers: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}
















/**
 * Adds a new user to the 'Users' sheet.
 * @param {Object} userData - The user data to add {identifier, role}.
 * @returns {Object} An object indicating success or failure.
 */
function addNewUser(userData) {
const { identifier, role, username } = userData;
  if (!identifier || !role) {
    return { success: false, message: 'Identifier and role are required.' };
  }








  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
   
    // Check for duplicates
    const existingUsers = getUsers().data || [];
    if (existingUsers.some(u => u.identifier === identifier)) {
        return { success: false, message: `User with identifier '${identifier}' already exists.` };
    }








    sheet.appendRow([identifier, role, username || '']);
   
    // Clear the user role cache
    const cache = CacheService.getUserCache();
    cache.remove(`role_${identifier}`); // Clear cache for LINE ID
    cache.remove(`role_${identifier.toLowerCase().trim()}`); // Clear cache for email








    return { success: true };
  } catch (e) {
    Logger.log(`Error in addNewUser: ${e.toString()}`);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}








/**
 * Updates a user's role.
 * @param {Object} userData - The user data to update {rowIndex, role}.
 * @returns {Object} An object indicating success or failure.
 */
function updateUserRole(userData) {
  const { identifier, role } = userData; // เราจะใช้ identifier เป็นหลักในการค้นหา
  if (!identifier || !role) {
    return { success: false, message: 'Identifier and new role are required.' };
  }








  const lock = LockService.getScriptLock();
  lock.waitLock(30000);








  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) {
        throw new Error("Sheet 'Users' not found.");
    }
    const data = sheet.getRange("A:A").getValues(); // ดึงข้อมูลเฉพาะคอลัมน์ A (Identifier)
    let targetRow = -1;








    // วนลูปเพื่อหาแถวที่ Identifier ตรงกัน
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === identifier) {
        targetRow = i + 1; // +1 เพราะ index ของ array เริ่มที่ 0 แต่แถวในชีตเริ่มที่ 1
        break;
      }
    }








    if (targetRow !== -1) {
      // เมื่อเจอแถวที่ถูกต้องแล้ว จึงทำการอัปเดต Role ในคอลัมน์ B ของแถวนั้น
      sheet.getRange(targetRow, 2).setValue(role); // คอลัมน์ 2 คือ B (Role)








      // เคลียร์ Cache เพื่อให้สิทธิ์ใหม่มีผลทันที
      const cache = CacheService.getUserCache();
      cache.remove(`role_${identifier}`);
      cache.remove(`role_${identifier.toLowerCase().trim()}`);








      return { success: true };
    } else {
      // กรณีไม่พบ Identifier (อาจจะถูกลบไปแล้ว)
      return { success: false, message: `User with identifier '${identifier}' not found.` };
    }
  } catch (e) {
    Logger.log(`Error in updateUserRole: ${e.toString()}`);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}








/**
 * Deletes a user from the 'Users' sheet.
 * @param {Object} userData - The user data to delete {rowIndex, identifier}.
 * @returns {Object} An object indicating success or failure.
 */
function deleteUser(userData) {
  const { rowIndex, identifier } = userData;
  if (!rowIndex) {
    return { success: false, message: 'Row index is required.' };
  }
 
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    sheet.deleteRow(rowIndex);
   
    // Clear the user role cache
    const cache = CacheService.getUserCache();
    cache.remove(`role_${identifier}`);
    cache.remove(`role_${identifier.toLowerCase().trim()}`);








    return { success: true };
  } catch (e) {
    Logger.log(`Error in deleteUser: ${e.toString()}`);
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}



























