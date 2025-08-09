



function doPost(e) {
  let event, replyToken, userId, userRole, userMessage, command;




  try {
    event = JSON.parse(e.postData.contents).events[0];
    if (!event) return;




    replyToken = event.replyToken;
    userId = event.source ? event.source.userId : null;
    if (!userId) return;




    if (event.type === 'follow') {
      return handleFollowEvent(replyToken, userId);
    }




    if (event.type === 'postback') {
      userRole = getUserRoleFromLineId(userId);
      return handlePostback(replyToken, event.postback.data, userId, userRole);
    }




    if (event.type !== 'message' || event.message.type !== 'text') return;
   
    userMessage = event.message.text.trim();
    command = userMessage.toLowerCase();
    userRole = getUserRoleFromLineId(userId);




    // ====================== GATEKEEPER LOGIC (Guest Handling) ======================
    if (userRole === 'Guest') {
      if (command === 'myid' || command === 'register') {
        const userName = getLineUserProfile(userId);
        logIdRequest(userId, userName);
        const replyMessage = formatMessage(MESSAGES.GUEST.ID_REQUEST_SUCCESS, { userId: userId });
        return replyToLine(replyToken, [{ type: 'text', text: replyMessage }]);




      } else if (command.includes('ลงทะเบียน')) {
        return handleRegistrationRequest(replyToken, userId);
     
      } else {
        const unauthorizedMessage = MESSAGES.GUEST.UNAUTHORIZED;
        const registrationLabel = MESSAGES.GUEST.REGISTRATION_PROMPT;
        return replyToLine(replyToken, [{ type: 'text', text: unauthorizedMessage, quickReply: { items: [{ type: 'action', action: { type: 'message', label: registrationLabel, text: registrationLabel } }] } }]);
      }
    }
    // =================================================================================




    if (handlePendingAction(replyToken, userId, userMessage)) return;




    // ====================== Main Command Logic (Registered Users) ======================
    if (command === 'dashboard' || command === 'ภาพรวม') {
      if (userRole !== 'Admin') {
        // ใช้ MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY ที่เฉพาะเจาะจงกว่า
        return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
      }
      const liffUrl = "line://app/" + CONFIG.LIFF_IDS.DASHBOARD; // ใช้ LIFF ID จาก CONFIG
      const message = { "type": "flex", "altText": "เปิด Dashboard", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "📊 Business Dashboard", "weight": "bold", "size": "xl" }, { "type": "text", "text": "คลิกเพื่อเปิดภาพรวมธุรกิจของคุณในวันนี้", "margin": "md", "wrap": true }] }, "footer": { "type": "box", "layout": "vertical", "contents": [{ "type": "button", "style": "primary", "height": "sm", "action": { "type": "uri", "label": "เปิด Dashboard", "uri": liffUrl } }] } } };
      return replyToLine(replyToken, [message]);
    }




    if (command === 'เพิ่มสินค้า' && userRole !== 'Admin') {
      return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
    }
    if (command.startsWith('แก้ไข ') && userRole !== 'Admin') {
      return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
    }




    if (command === 'สรุปสต็อก') {
      generateStockSummaryFlex(replyToken, 1);
    } else if (command === 'วิธีใช้' || command === 'help') {
      // เปลี่ยนไปเรียกใช้ Flex Message แทนข้อความธรรมดา
      replyToLine(replyToken, [_createHelpFlexMessage()]);
    } else if (command === 'เพิ่มสินค้า') {
      initiateAddNewItem(replyToken, userId);
    } else if (command.startsWith('แก้ไข ')) {
      const query = userMessage.substring('แก้ไข'.length).trim();
      if (!query) {
        replyToLine(replyToken, [{ type: 'text', text: MESSAGES.PROMPT.EDIT_USAGE_EXAMPLE }]);
      } else {
        initiateEditItem(replyToken, query);
      }
    } else if (command === 'ประวัติ') {
      initiateViewLog(replyToken);
    } else if (command === 'รายงาน') {
      if (userRole === 'Admin') {
        initiateViewReport(replyToken);
      } else {
        replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
      }
    } else {
      initiateActionChoice(replyToken, userMessage, userRole);
    }




  } catch (err) {
    const finalReplyToken = replyToken || (e && e.postData && e.postData.contents && JSON.parse(e.postData.contents).events[0] ? JSON.parse(e.postData.contents).events[0].replyToken : null);
    handleError(err, finalReplyToken, 'doPost');
  }
}




function handlePendingAction(replyToken, userId, userMessage) {
  const userProperties = PropertiesService.getUserProperties();
  const lowerCaseMessage = userMessage.toLowerCase();




  const globalCommands = ['รายงาน', 'สรุปสต็อก', 'วิธีใช้', 'help', 'ประวัติ', 'เพิ่มสินค้า', 'myid', 'register', 'dashboard', 'ภาพรวม'];
  if (globalCommands.includes(lowerCaseMessage) || lowerCaseMessage.startsWith('แก้ไข ')) {
    userProperties.deleteProperty(userId);
    return false;
  }




  const pendingActionJSON = userProperties.getProperty(userId);
  if (!pendingActionJSON) return false;




  if (lowerCaseMessage === 'ยกเลิก') {
      userProperties.deleteProperty(userId);
      replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GENERAL.ACTION_CANCELED }]);
      return true;
  }




  const pendingAction = JSON.parse(pendingActionJSON);
 
  if (pendingAction.action === 'wait_for_edit_query') {
    userProperties.deleteProperty(userId);
    initiateEditItem(replyToken, userMessage);
    return true;
  }
 
  if (pendingAction.action === 'add_new_item_flow') {
    handleAddNewItemFlow(replyToken, userId, userMessage, pendingAction);
    return true;
  }
  if (pendingAction.action === 'wait_for_new_value') {
    handleEditItemConfirmation(replyToken, userId, userMessage, pendingAction);
    return true;
  }
  if (pendingAction.action === 'wait_for_log_query') {
    handleViewLogByQuery(replyToken, userMessage);
    userProperties.deleteProperty(userId);
    return true;
  }
  if (pendingAction.action === 'wait_for_custom_quantity') {
    const quantity = parseInt(userMessage);
    if (!isNaN(quantity) && quantity > 0) {
      userProperties.deleteProperty(userId);
      const params = { ...pendingAction, quantity: quantity };
      replyToLine(replyToken, [_createAddConfirmationFlex(params)]);
    } else {
      replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.INVALID_QUANTITY_INPUT }]);
    }
    return true;
  }
  return false;
}




// ===============================================================
// === Postback Handler ===
// ===============================================================




// postbackHandlers ยังคงใช้โครงสร้างเดิม แต่จะถูกย้ายไปอยู่ท้ายไฟล์เพื่อความเป็นระเบียบ
const postbackHandlers = {
  'show_view_options': (p, uId, uName, uRole) => handleSearch(p.replyToken, p.query, p.query, 'view', uRole),
  'show_sell_options': (p, uId, uName, uRole) => handleSearch(p.replyToken, p.query, p.query, 'sell', uRole),
  'show_add_options': (p, uId, uName, uRole) => handleSearch(p.replyToken, p.query, p.query, 'add', uRole),
  'ask_quantity': (p) => replyWithQuantitySelector(p.replyToken, p),
  'ask_add_quantity': (p) => replyWithAddQuantitySelector(p.replyToken, p),
  'ask_custom_quantity': (p, uId) => handleAskCustomQuantity(p.replyToken, uId, p),
  'confirm_deduction': (p) => replyWithConfirmation(p.replyToken, p),
  'confirm_add': (p) => replyToLine(p.replyToken, [_createAddConfirmationFlex(p)]),
  'execute_sell': (p, uId, uName) => handleExecuteSell(p, uId, uName),
  'execute_add_confirmed': (p, uId, uName) => handleAddStockConfirmed(p, uId, uName),
  'undo_sell': (p, uId, uName) => handleUndo(p, uId, uName, 'sell'),
  'undo_add': (p, uId, uName) => handleUndo(p, uId, uName, 'add'),
  'initiate_edit_flow': (p, uId) => promptForEditQuery(p.replyToken, uId),
  'view_brand_page': (p, uId, uName, uRole) => { // ส่ง uRole เข้ามาเผื่อใช้
    const page = parseInt(p.page) || 1;
    const groupedData = searchAndGroupTireData(p.query);
    const brandData = groupedData[decodeURIComponent(p.brand)];
    if (brandData) {
      const singleBubble = _createSingleBrandBubble(decodeURIComponent(p.brand), brandData, p.query, p.context, page, uRole); // ส่ง uRole ต่อไป
      replyToLine(p.replyToken, [{
        "type": "flex",
        "altText": `ผลการค้นหา ${decodeURIComponent(p.brand)} (หน้า ${page})`,
        "contents": singleBubble
      }]);
    } else {
      replyToLine(p.replyToken, [{ type: 'text', text: MESSAGES.ERROR.ITEM_NOT_FOUND_GENERIC }]);
    }
  },
  'view_summary_page': (p) => generateStockSummaryFlex(p.replyToken, parseInt(p.page) || 1),
  'cancel_action': (p, uId) => {
    PropertiesService.getUserProperties().deleteProperty(uId);
    replyToLine(p.replyToken, [{ type: 'text', text: MESSAGES.GENERAL.ACTION_CANCELED }]);
  },
  'execute_add_new_item': (p, uId, uName) => {
    const userProperties = PropertiesService.getUserProperties();
    const pendingActionJSON = userProperties.getProperty(uId);
    if (pendingActionJSON) {
      const pendingAction = JSON.parse(pendingActionJSON);
      if (pendingAction.action === 'wait_for_add_new_item_confirmation') {
        handleExecuteAddNewItem(p.replyToken, uId, uName, pendingAction.itemData);
        userProperties.deleteProperty(uId);
      }
    }
  },
  'add_dot_info': (p, uId) => {
    const userProperties = PropertiesService.getUserProperties();
    const pendingActionJSON = userProperties.getProperty(uId);
    if (pendingActionJSON) {
        const pendingAction = JSON.parse(pendingActionJSON);
        userProperties.setProperty(uId, JSON.stringify({
            action: 'add_new_item_flow',
            step: 'get_dot_info',
            itemData: pendingAction.itemData
        }));
        replyToLine(p.replyToken, [{type: 'text', text: MESSAGES.ERROR.INVALID_DOT_INPUT}]);
    }
  },
  'undo_add_new_item': (p, uId, uName) => handleUndoAddNewItem(p.replyToken, uId, uName, p),
  'select_item_to_edit': (p) => presentEditOptions(p.replyToken, p),
  'select_field_to_edit': (p, uId) => promptForNewValue(p.replyToken, uId, p),
  'execute_edit': (p, uId, uName) => handleExecuteEdit(p.replyToken, uId, uName, p),
  'undo_edit': (p, uId, uName) => handleUndoEdit(p.replyToken, uId, uName, p),
  'view_log_today': (p) => handleViewLogToday(p.replyToken),
  'ask_log_query': (p, uId) => promptForLogQuery(p.replyToken, uId),
  'view_best_sellers': (p) => handleViewBestSellers(p.replyToken),
  'view_weekly_best_sellers': (p) => handleViewWeeklyBestSellers(p.replyToken),
  'view_slow_moving': (p) => handleViewSlowMovingItems(p.replyToken),
  // approve_user และ reject_user จะถูกจัดการแยกต่างหากเพื่อความชัดเจน
};




function handlePostback(replyToken, postbackData, userId, userRole) {
  try {
    const params = postbackData.split('&').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
    params.replyToken = replyToken;




    const action = params.action;
   
    // ===============================================================
    // === ด่านตรวจสิทธิ์ (Permission Gate) - เวอร์ชันแก้ไขที่ถูกต้อง ===
    // ===============================================================
    const allowedRoles = CONFIG.ACTION_PERMISSIONS[action];




    // ตรวจสอบว่า action นี้มีการกำหนดสิทธิ์หรือไม่ และ userRole ไม่อยู่ในกลุ่มที่อนุญาต
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      Logger.log(`PERMISSION DENIED: User [${userId}] with Role [${userRole}] tried Action [${action}] which requires one of [${allowedRoles.join(', ')}]`);
      const errorMessage = formatMessage(MESSAGES.ERROR.PERMISSION_DENIED, { userRole: userRole });
      return replyToLine(replyToken, [{ type: 'text', text: errorMessage }]);
    }
    // ===============================================================
    // === จบด่านตรวจสิทธิ์ ===
    // ===============================================================




    // จัดการ Action พิเศษสำหรับการอนุมัติผู้ใช้
    // เรายังคงตรวจสอบสิทธิ์ซ้ำอีกชั้นเพื่อความปลอดภัยสูงสุด
    if (action === 'approve_user') {
      if (!CONFIG.ACTION_PERMISSIONS.approve_user.includes(userRole)) {
         return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
      }
      return handleApproveUser(replyToken, params.userIdToApprove);
    }
    if (action === 'reject_user') {
      if (!CONFIG.ACTION_PERMISSIONS.reject_user.includes(userRole)) {
         return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.PERMISSION_DENIED_ADMIN_ONLY }]);
      }
      return handleRejectUser(replyToken, params.userIdToApprove);
    }




    // ถ้าผ่านด่านตรวจสิทธิ์มาได้ ให้ทำงานตามปกติ
    const handler = postbackHandlers[action];
    if (handler) {
      const userName = getLineUserProfile(userId);
      handler(params, userId, userName, userRole);
    } else {
      // Log Action ที่ไม่รู้จัก แต่ไม่ต้องแจ้งผู้ใช้ เพื่อไม่ให้เกิดความสับสน
      Logger.log('Unknown postback action received: ' + action);
    }
  } catch (err) {
    handleError(err, replyToken, 'handlePostback');
  }
}




// ===============================================================
// === Core Logic Functions (Sell, Add, Undo, Search) ===
// ===============================================================




function initiateActionChoice(replyToken, query, userRole) {
  const searchResult = searchAndGroupTireData(query);
  if (Object.keys(searchResult).length === 0) {
    return replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ERROR.ITEM_NOT_FOUND_QUERY, { query: query }) }]);
  }
  replyToLine(replyToken, [_createActionChoiceQuickReply(query, userRole)]);
}




function handleExecuteSell(params, userId, userName) {
  const quantity = parseInt(params.quantity);
  const result = updateStockInSheet(params.tire_size, params.brand, params.model, params.dot_index, -quantity);
  if (result.success) {
    const logDetails = `[SELL] ตัดสต็อก ${params.brand} ${params.model} (DOT: ${result.dotValue}) จำนวน ${quantity} เส้น`;
    writeToLogSheet([new Date(), userId, userName, params.tire_size, params.brand, params.model, result.dotValue, -quantity, logDetails]);
    replyToLine(params.replyToken, [_createSuccessUndoFlexMessage(params, result, userName, 'sell')]);
  } else {
    // ใช้ formatMessage เพื่อใส่ error message ที่ได้รับจาก updateStockInSheet
    replyToLine(params.replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_ACTION, { message: result.message }) }]);
  }
}




function handleAddStockConfirmed(params, userId, userName) {
  const quantity = parseInt(params.quantity);
  const result = updateStockInSheet(params.tire_size, params.brand, params.model, params.dot_index, quantity);
  if (result.success) {
    const logDetails = `[ADD] รับของเข้า ${params.brand} ${params.model} (DOT: ${result.dotValue}) จำนวน ${quantity} เส้น`;
    writeToLogSheet([new Date(), userId, userName, params.tire_size, params.brand, params.model, result.dotValue, quantity, logDetails]);
    replyToLine(params.replyToken, [_createSuccessUndoFlexMessage(params, result, userName, 'add')]);
  } else {
    replyToLine(params.replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_ACTION, { message: result.message }) }]);
  }
}




function handleUndo(params, userId, userName, type) {
    const quantity = parseInt(params.quantity);
    const quantityToChange = (type === 'sell') ? quantity : -quantity;
    const result = updateStockInSheet(params.tire_size, params.brand, params.model, params.dot_index, quantityToChange);
    if (result.success) {
        const actionText = (type === 'sell') ? 'ตัดสต็อก' : 'รับของเข้า';
        const logDetails = `[UNDO-${type.toUpperCase()}] ยกเลิกการ${actionText} ${params.brand} ${params.model} จำนวน ${quantity} เส้น`;
        writeToLogSheet([new Date(), userId, userName, params.tire_size, params.brand, params.model, result.dotValue, quantityToChange, logDetails]);
        replyToLine(params.replyToken, [{ type: 'text', text: MESSAGES.GENERAL.SUCCESS_UNDO }]);
    } else {
        replyToLine(params.replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_UNDO, { message: result.message }) }]);
    }
}




function handleAskCustomQuantity(replyToken, userId, params) {
  const userProperties = PropertiesService.getUserProperties();
  const dataToStore = { action: 'wait_for_custom_quantity', tire_size: params.tire_size, brand: params.brand, model: params.model, dot_index: params.dot_index };
  userProperties.setProperty(userId, JSON.stringify(dataToStore));
  const replyText = formatMessage(MESSAGES.PROMPT.ASK_FOR_CUSTOM_QUANTITY, {
      brand: decodeURIComponent(params.brand),
      model: decodeURIComponent(params.model)
  });
  replyToLine(replyToken, [{ type: 'text', text: replyText }]);
}




function replyWithQuantitySelector(replyToken, params) {
  const message = _createQuantitySelectorQuickReply(params, 'sell');
  if (!message) {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.ITEM_NOT_FOUND_GENERIC }]);
  }
  replyToLine(replyToken, [message]);
}




function replyWithAddQuantitySelector(replyToken, params) {
  replyToLine(replyToken, [_createQuantitySelectorQuickReply(params, 'add')]);
}




function replyWithConfirmation(replyToken, params) {
  const dotValue = getDotValueFromSheet(params.tire_size, params.brand, params.model, params.dot_index);
  replyToLine(replyToken, [_createConfirmationFlex(params, dotValue)]);
}




function handleSearch(replyToken, searchInput, originalQuery, context, userRole) {
  const groupedData = searchAndGroupTireData(searchInput);
 
  if (Object.keys(groupedData).length === 0) {
    return replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ERROR.ITEM_NOT_FOUND_QUERY, { query: originalQuery }) }]);
  }
 
  let totalAvailableStock = 0;
  Object.values(groupedData).forEach(brandModels => {
    brandModels.forEach(tire => {
      totalAvailableStock += (parseInt(tire.stock1) || 0) + (parseInt(tire.stock2) || 0) + (parseInt(tire.stock3) || 0) + (parseInt(tire.stock4) || 0);
    });
  });




  if (context === 'sell' && totalAvailableStock === 0) {
    return findAndSuggestAlternatives(replyToken, originalQuery);
  }




  const flexMessages = _createBrandCarouselFlex(groupedData, originalQuery, context, userRole);
 
  if (context === 'view') {
    const lastMessage = flexMessages[flexMessages.length - 1];
    if (lastMessage && lastMessage.type === 'flex') { // Ensure it's a flex message
      const quickReplyObject = _createAfterViewQuickReply(originalQuery, userRole);
     
      if (quickReplyObject) {
        lastMessage.quickReply = quickReplyObject;
      }
    }
  }
  replyToLine(replyToken, flexMessages);
}




function findAndSuggestAlternatives(replyToken, originalQuery) {
  const tireSizePattern = /(\d{3}[\s/]?\d{2}[\s/]?[Rr]?\d{2})/;
  const match = originalQuery.match(tireSizePattern);
  if (!match || !match[0]) {
    return replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ERROR.ITEM_NOT_FOUND_QUERY, { query: originalQuery }) }]);
  }
  const extractedTireSize = match[0].replace(/[\s/R]/gi, '');
  const alternativeData = searchAndGroupTireData(extractedTireSize);
  let alternativeStock = 0;
  Object.values(alternativeData).forEach(brandModels => {
    brandModels.forEach(tire => {
      alternativeStock += (parseInt(tire.stock1) || 0) + (parseInt(tire.stock2) || 0) + (parseInt(tire.stock3) || 0) + (parseInt(tire.stock4) || 0);
    });
  });
  if (Object.keys(alternativeData).length > 0 && alternativeStock > 0) {
    const suggestionMessage = { type: 'text', text: MESSAGES.PROMPT.SUGGEST_ALTERNATIVES };
    const flexMessages = _createBrandCarouselFlex(alternativeData, `รุ่นอื่นในเบอร์ ${match[0]}`, 'view', 'Guest'); // Role 'Guest' to not show QR
    replyToLine(replyToken, [suggestionMessage, ...flexMessages]);
  } else {
    replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ERROR.NO_STOCK_FOR_SIZE, { size: match[0] }) }]);
  }
}




// ===============================================================
// === FEATURE 1: Add New Item Flow ===
// ===============================================================




function initiateAddNewItem(replyToken, userId) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(userId, JSON.stringify({
    action: 'add_new_item_flow',
    step: 'get_tire_size',
    itemData: {}
  }));
  replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ADD_ITEM.START }]);
}




function handleAddNewItemFlow(replyToken, userId, message, pendingAction) {
  const userProperties = PropertiesService.getUserProperties();
  let { step, itemData } = pendingAction;
  let nextStep = '';
  let replyText = '';




  switch (step) {
    case 'get_tire_size':
      itemData.tireSize = message.trim();
      nextStep = 'get_brand';
      replyText = MESSAGES.ADD_ITEM.STEP2_BRAND;
      break;
    case 'get_brand':
      itemData.brand = message.trim().toUpperCase();
      nextStep = 'get_model';
      replyText = MESSAGES.ADD_ITEM.STEP3_MODEL;
      break;
    case 'get_model':
      itemData.model = message.trim();
      nextStep = 'get_price';
      replyText = MESSAGES.ADD_ITEM.STEP4_PRICE;
      break;
    case 'get_price':
      const cleanedPrice = message.replace(/[^0-9.]/g, '');
      const price = parseFloat(cleanedPrice);
      if (isNaN(price)) {
        replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.INVALID_PRICE_INPUT }]);
        return;
      }
      itemData.price = price;
      for(let i = 1; i <= 4; i++) {
        itemData['dot' + i] = '';
        itemData['stock' + i] = 0;
        itemData['promo' + i] = '';
      }
      itemData.loadIndex = '';
      userProperties.setProperty(userId, JSON.stringify({
          action: 'wait_for_add_new_item_confirmation',
          itemData: itemData
      }));
      replyToLine(replyToken, [_createNewItemOptionsFlex(itemData)]);
      return;
    case 'get_dot_info':
      const parts = message.split(' ');
      const dotValue = parts[0];
      const stock = parseInt(parts[1]);
      const promo = parts.length > 2 ? parts.slice(2).join(' ') : '-';
      if (!dotValue || isNaN(stock)) {
          replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.INVALID_DOT_INPUT }]);
          return;
      }
      let dotSlot = 0;
      for (let i = 1; i <= 4; i++) {
          if (!itemData['dot' + i] || itemData['dot' + i] === '') {
              dotSlot = i;
              break;
          }
      }
      if (dotSlot === 0) {
          userProperties.deleteProperty(userId);
          replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.ALL_DOTS_FULL }]);
          return;
      }
      itemData[`dot${dotSlot}`] = dotValue;
      itemData[`stock${dotSlot}`] = stock;
      itemData[`promo${dotSlot}`] = promo === '-' ? '' : promo;
      userProperties.setProperty(userId, JSON.stringify({
          action: 'wait_for_add_new_item_confirmation',
          itemData: itemData
      }));
      replyToLine(replyToken, [_createNewItemOptionsFlex(itemData, dotSlot)]);
      return;
  }




  userProperties.setProperty(userId, JSON.stringify({
    action: 'add_new_item_flow',
    step: nextStep,
    itemData: itemData
  }));
  replyToLine(replyToken, [{ type: 'text', text: replyText }]);
}




function handleExecuteAddNewItem(replyToken, userId, userName, itemData) {
  const result = createItemInSheet(itemData);
  if (result.success) {
    const logDetails = `[CREATE] เพิ่มสินค้าผ่าน LINE Bot: ${itemData.brand} ${itemData.model}`;
    writeToLogSheet([new Date(), userId, userName, itemData.tireSize, itemData.brand, itemData.model, 'N/A', 0, logDetails]);
    clearSheetCache(CONFIG.SHEETS.STOCK);
    replyToLine(replyToken, [_createSuccessAddNewItemFlex(itemData, userName)]);
  } else {
    replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_ACTION, { message: result.message }) }]);
  }
}




function handleUndoAddNewItem(replyToken, userId, userName, params) {
    const result = deleteRowByData(params.tire_size, params.brand, params.model);
    if (result.success) {
        const logDetails = `[UNDO-CREATE] ยกเลิกการเพิ่มสินค้า ${params.brand} ${params.model}`;
        writeToLogSheet([new Date(), userId, userName, params.tire_size, params.brand, params.model, 'N/A', 0, logDetails]);
        clearSheetCache(CONFIG.SHEETS.STOCK);
        replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GENERAL.SUCCESS_UNDO }]);
    } else {
        replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_UNDO, { message: result.message }) }]);
    }
}




// ===============================================================
// === FEATURE 2: Edit Item Details ===
// ===============================================================




function initiateEditItem(replyToken, query) {
  const groupedData = searchAndGroupTireData(query);
  if (Object.keys(groupedData).length === 0) {
    replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ERROR.ITEM_NOT_FOUND_QUERY, { query: query }) }]);
    return;
  }
  replyToLine(replyToken, _createBrandCarouselFlex(groupedData, query, 'edit', getUserRoleFromLineId(SpreadsheetApp.getActiveSpreadsheet().getOwner().getEmail())));
}




function presentEditOptions(replyToken, params) {
  const tireData = getTireDataByRow(params.tire_size, params.brand, params.model);
  if (!tireData) {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.ITEM_NOT_FOUND_GENERIC }]);
  }
  replyToLine(replyToken, [_createEditOptionsFlex(params, tireData)]);
}




function promptForNewValue(replyToken, userId, params) {
  const userProperties = PropertiesService.getUserProperties();
  const pendingAction = {
    action: 'wait_for_new_value',
    tire_size: params.tire_size,
    brand: params.brand,
    model: params.model,
    field_to_edit: params.field,
    field_label: params.label
  };
  userProperties.setProperty(userId, JSON.stringify(pendingAction));
  const replyText = formatMessage(MESSAGES.PROMPT.ASK_FOR_NEW_VALUE, { label: decodeURIComponent(params.label) });
  replyToLine(replyToken, [{ type: 'text', text: replyText }]);
}




function handleEditItemConfirmation(replyToken, userId, newValue, pendingAction) {
  const userProperties = PropertiesService.getUserProperties();
  const { tire_size, brand, model, field_to_edit } = pendingAction;




  let finalValue = newValue;
  if (field_to_edit.toLowerCase().includes('price') || field_to_edit.toLowerCase().includes('stock')) {
    const cleanedValue = newValue.replace(/[^0-9.]/g, '');
    if (cleanedValue === '' || isNaN(parseFloat(cleanedValue))) {
      replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ERROR.INVALID_PRICE_INPUT }]);
      return;
    }
    finalValue = parseFloat(cleanedValue);
  }
  const currentData = getTireDataByRow(tire_size, brand, model);
  if (!currentData) {
     userProperties.deleteProperty(userId);
     return handleError(new Error('Could not find original item to edit'), replyToken, 'handleEditItemConfirmation');
  }




  const oldValue = currentData[field_to_edit];
 
  userProperties.deleteProperty(userId);
  replyToLine(replyToken, [_createEditConfirmationFlex({ ...pendingAction, old_value: oldValue, new_value: finalValue })]);
}




function handleExecuteEdit(replyToken, userId, userName, params) {
  const { tire_size, brand, model, field_to_edit, new_value } = params;
  const result = updateItemDetailInSheet(tire_size, brand, model, field_to_edit, new_value);




  if (result.success) {
    const logDetails = `[EDIT] แก้ไข ${decodeURIComponent(params.field_label)} เป็น "${decodeURIComponent(new_value)}" สำหรับ ${decodeURIComponent(brand)} ${decodeURIComponent(model)}`;
    writeToLogSheet([new Date(), userId, userName, tire_size, brand, model, 'N/A', 0, logDetails]);
    clearSheetCache(CONFIG.SHEETS.STOCK);
    replyToLine(replyToken, [_createSuccessEditFlex(params, result.oldValue, userName)]);
  } else {
    replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_ACTION, { message: result.message }) }]);
  }
}




function handleUndoEdit(replyToken, userId, userName, params) {
    const { tire_size, brand, model, field_to_edit, old_value, field_label } = params;
    const result = updateItemDetailInSheet(tire_size, brand, model, field_to_edit, old_value);
    if (result.success) {
        const logDetails = `[UNDO-EDIT] คืนค่า ${decodeURIComponent(field_label)} เป็น "${decodeURIComponent(old_value)}" สำหรับ ${decodeURIComponent(brand)} ${decodeURIComponent(model)}`;
        writeToLogSheet([new Date(), userId, userName, tire_size, brand, model, 'N/A', 0, logDetails]);
        clearSheetCache(CONFIG.SHEETS.STOCK);
        replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GENERAL.SUCCESS_UNDO }]);
    } else {
        replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.GENERAL.ERROR_UNDO, { message: result.message }) }]);
    }
}




// ===============================================================
// === FEATURE 3: View Transaction Log ===
// ===============================================================
function initiateViewLog(replyToken) {
  replyToLine(replyToken, [_createViewLogOptionsQuickReply()]);
}




function promptForLogQuery(replyToken, userId) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(userId, JSON.stringify({ action: 'wait_for_log_query' }));
  replyToLine(replyToken, [{ type: 'text', text: MESSAGES.PROMPT.ASK_FOR_LOG_QUERY }]);
}




function handleViewLogToday(replyToken) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  const logs = logSheet.getDataRange().getValues();
  const todayLogs = [];




  for (let i = logs.length - 1; i > 0; i--) {
    const logDate = new Date(logs[i][0]);
    if (isNaN(logDate.getTime())) continue;
    logDate.setHours(0, 0, 0, 0);
   
    if (logDate.getTime() === today.getTime()) {
      todayLogs.unshift(logs[i]);
    } else if (logDate.getTime() < today.getTime()) {
      break;
    }
  }
  replyToLine(replyToken, [_createLogReportFlex(MESSAGES.LOG.TODAY_TITLE, todayLogs)]);
}




function handleViewLogByQuery(replyToken, query) {
  const lowerCaseQuery = query.toLowerCase();
  const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  const logs = logSheet.getDataRange().getValues();
  const matchedLogs = [];




  for (let i = logs.length - 1; i > 0; i--) {
    const logDetail = (logs[i][8] || '').toString().toLowerCase();
    if (logDetail.includes(lowerCaseQuery)) {
      matchedLogs.unshift(logs[i]);
      if (matchedLogs.length >= 20) break;
    }
  }
  const title = formatMessage(MESSAGES.LOG.QUERY_TITLE, { query: query });
  replyToLine(replyToken, [_createLogReportFlex(title, matchedLogs)]);
}




// ===============================================================
// === FEATURE 4: Advanced Reports ===
// ===============================================================




function initiateViewReport(replyToken) {
  try {
    const message = {
      type: 'text',
      text: MESSAGES.PROMPT.ACTION_CHOICE.replace('"%query%"', 'รายงาน'), // A bit of a hack, but works.
      quickReply: {
        items: [
          { type: 'action', action: { type: 'postback', label: '🏆 ขายดี (สัปดาห์)', data: 'action=view_weekly_best_sellers', displayText: 'ขอดูรายงานสินค้าขายดีประจำสัปดาห์' } },
          { type: 'action', action: { type: 'postback', label: '🏆 ขายดี (เดือน)', data: 'action=view_best_sellers', displayText: 'ขอดูรายงานสินค้าขายดีประจำเดือน' } },
          { type: 'action', action: { type: 'postback', label: '📦 สินค้าไม่เคลื่อนไหว', data: 'action=view_slow_moving', displayText: 'ขอดูรายงานสินค้าไม่เคลื่อนไหว' } }
        ]
      }
    };
    replyToLine(replyToken, [message]);
  } catch (err) {
    handleError(err, replyToken, 'initiateViewReport');
  }
}




function handleViewBestSellers(replyToken) {
  try {
    const logData = getSheetData(CONFIG.SHEETS.LOG);
    const netSalesData = {};
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);




    for (let i = logData.length - 1; i > 0; i--) {
      const logDate = new Date(logData[i][0]);
      if (logDate < firstDayOfMonth) break;




      const logDetails = (logData[i][8] || '').toString();
      if (logDetails.startsWith('[SELL]') || logDetails.startsWith('[UNDO-SELL]')) {
        const netQuantity = parseInt(logData[i][7]) || 0;
        const brand = (logData[i][4] || 'N/A').toString();
        const model = (logData[i][5] || 'N/A').toString();
        const key = `${brand}|${model}`;




        if (!netSalesData[key]) {
          netSalesData[key] = { brand: brand, model: model, netQuantity: 0 };
        }
        netSalesData[key].netQuantity += netQuantity;
      }
    }




    const sortedSales = Object.values(netSalesData)
      .map(item => ({ brand: item.brand, model: item.model, totalSold: -item.netQuantity }))
      .filter(item => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
     
    replyToLine(replyToken, [_createBestSellerReportFlex(sortedSales, 'monthly')]);




  } catch (err) {
    handleError(err, replyToken, 'handleViewBestSellers');
  }
}




function handleViewSlowMovingItems(replyToken) {
  try {
    const stockData = getSheetData(CONFIG.SHEETS.STOCK);
    const allStockItems = new Set();
    for (let i = 1; i < stockData.length; i++) {
        const row = stockData[i];
        const brand = (row[CONFIG.COLUMNS.BRAND] || '').trim();
        const model = (row[CONFIG.COLUMNS.MODEL] || '').trim();
        if (brand && model) {
            allStockItems.add(`${brand}|${model}`);
        }
    }




    const logData = getSheetData(CONFIG.SHEETS.LOG);
    const recentlySoldItems = new Set();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);




    for (let i = logData.length - 1; i > 0; i--) {
        const logDate = new Date(logData[i][0]);
        if (logDate < ninetyDaysAgo) break;
        const logDetails = (logData[i][8] || '').toString();
        if (logDetails.startsWith('[SELL]')) {
            const brand = (logData[i][4] || '').trim();
            const model = (logData[i][5] || '').trim();
            recentlySoldItems.add(`${brand}|${model}`);
        }
    }
    const slowMovingItems = [...allStockItems].filter(item => !recentlySoldItems.has(item));
    replyToLine(replyToken, [_createSlowMovingReportFlex(slowMovingItems.slice(0, 20))]);
  } catch (err) {
    handleError(err, replyToken, 'handleViewSlowMovingItems');
  }
}




function generateStockSummaryFlex(replyToken, page = 1) {
  const ITEMS_PER_PAGE = 10;
  const data = getSheetData(CONFIG.SHEETS.STOCK);
  let totalStock = 0;
  const lowStockItems = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tireSize = row[CONFIG.COLUMNS.TIRE_SIZE] || '';
    const brand = row[CONFIG.COLUMNS.BRAND] || '';
    const model = row[CONFIG.COLUMNS.MODEL] || '';
    if (!tireSize || !brand || !model) continue;
    let rowTotalStock = 0;
    for (let j = 1; j <= 4; j++) {
      const dotValue = row[CONFIG.DOT_COLUMN_MAP[j].dot];
      const stockCount = parseInt(row[CONFIG.DOT_COLUMN_MAP[j].stock]) || 0;
      rowTotalStock += stockCount;
      if (dotValue && stockCount > 0 && stockCount <= CONFIG.LOW_STOCK_THRESHOLD) {
        lowStockItems.push({ tireSize, brand, model, dotValue: dotValue.toString(), stock: stockCount, dotIndex: j });
      }
    }
    totalStock += rowTotalStock;
  }
  lowStockItems.sort((a, b) => a.stock - b.stock);
  const totalPages = Math.ceil(lowStockItems.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const itemsForCurrentPage = lowStockItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  replyToLine(replyToken, [_createStockSummaryFlex(totalStock, lowStockItems, itemsForCurrentPage, page, totalPages)]);
}




function handleViewWeeklyBestSellers(replyToken) {
  try {
    const logData = getSheetData(CONFIG.SHEETS.LOG);
   
    const now = new Date();
    const todayDay = now.getDay();
    const startOfWeek = new Date(now);
    const diff = (todayDay === 0) ? 6 : todayDay - 1;
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);




    const netSalesData = {};
    for (let i = logData.length - 1; i > 0; i--) {
      const logDate = new Date(logData[i][0]);
      if (logDate < startOfWeek) break;
     
      const logDetails = (logData[i][8] || '').toString();
      if (logDetails.startsWith('[SELL]') || logDetails.startsWith('[UNDO-SELL]')) {
        const netQuantity = parseInt(logData[i][7]) || 0;
        const brand = (logData[i][4] || 'N/A').toString();
        const model = (logData[i][5] || 'N/A').toString();
        const key = `${brand}|${model}`;
        if (!netSalesData[key]) netSalesData[key] = { brand: brand, model: model, netQuantity: 0 };
        netSalesData[key].netQuantity += netQuantity;
      }
    }




    const sortedSales = Object.values(netSalesData)
      .map(item => ({ brand: item.brand, model: item.model, totalSold: -item.netQuantity }))
      .filter(item => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
     
    replyToLine(replyToken, [_createBestSellerReportFlex(sortedSales, 'weekly')]);
  } catch (err) {
    handleError(err, replyToken, 'handleViewWeeklyBestSellers');
  }
}




// ===============================================================
// === User Registration Flow ===
// ===============================================================




function handleFollowEvent(replyToken, userId) {
  const userName = getLineUserProfile(userId);
  const welcomeMessage = formatMessage(MESSAGES.GUEST.WELCOME, { userName: userName });
  const registrationLabel = MESSAGES.GUEST.REGISTRATION_PROMPT;
  const registrationButton = {
    type: 'text',
    text: welcomeMessage,
    quickReply: {
      items: [{
        type: 'action',
        action: {
          type: 'message',
          label: registrationLabel,
          text: registrationLabel
        }
      }]
    }
  };
  replyToLine(replyToken, [registrationButton]);
}




function handleRegistrationRequest(replyToken, userId) {
  const existingRole = getUserRoleFromLineId(userId);
  if (existingRole !== 'Guest') {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GUEST.ALREADY_REGISTERED }]);
  }
 
  const pendingSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PENDING_REGISTRATIONS);
  const pendingUsers = pendingSheet.getRange('A:A').getValues().flat();
  if (pendingUsers.includes(userId)) {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GUEST.REQUEST_PENDING }]);
  }




  const userName = getLineUserProfile(userId);
  pendingSheet.appendRow([userId, userName, new Date()]);




  replyToLine(replyToken, [{ type: 'text', text: MESSAGES.GUEST.REGISTRATION_SENT }]);




  const adminMessageText = formatMessage(MESSAGES.ADMIN.NEW_REGISTRATION_NOTICE, { userName: userName, userId: userId });
  // สมมติว่ามีฟังก์ชัน _createAdminApprovalFlex อยู่ในไฟล์ UI_Generator.gs
  const approvalFlex = _createAdminApprovalFlex(userName, userId);
  multicastMessageToLine(CONFIG.ADMIN_USER_IDS, [{ type: 'text', text: adminMessageText }, approvalFlex]);
}




function handleApproveUser(replyToken, userIdToApprove) {
  const userSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
  const pendingSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PENDING_REGISTRATIONS);




  const allUsers = userSheet.getRange('A:A').getValues().flat();
  if (allUsers.includes(userIdToApprove)) {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ADMIN.USER_ALREADY_APPROVED }]);
  }




  const pendingData = pendingSheet.getDataRange().getValues();
  let userName = 'Unknown';
  let rowToDelete = -1;




  for (let i = 1; i < pendingData.length; i++) {
    if (pendingData[i][0] === userIdToApprove) {
      userName = pendingData[i][1];
      rowToDelete = i + 1;
      break;
    }
  }




  if (rowToDelete === -1) {
    return replyToLine(replyToken, [{ type: 'text', text: MESSAGES.ADMIN.REQUEST_NOT_FOUND }]);
  }




  userSheet.appendRow([userIdToApprove, 'Registered', userName]);
 
  pendingSheet.deleteRow(rowToDelete);




  replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ADMIN.APPROVAL_SUCCESS, { userName: userName }) }]);




  const welcomeMessage = MESSAGES.USER.APPROVAL_WELCOME;
  const quickStartGuide = MESSAGES.USER.QUICK_START_GUIDE;




  pushMessageToLine(userIdToApprove, [
    { type: 'text', text: welcomeMessage },
    { type: 'text', text: quickStartGuide }
  ]);
}




function handleRejectUser(replyToken, userIdToApprove) {
  const pendingSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PENDING_REGISTRATIONS);
  const pendingData = pendingSheet.getDataRange().getValues();
  for (let i = 1; i < pendingData.length; i++) {
    if (pendingData[i][0] === userIdToApprove) {
      pendingSheet.deleteRow(i + 1);
      break;
    }
  }
 
  replyToLine(replyToken, [{ type: 'text', text: formatMessage(MESSAGES.ADMIN.REJECTION_SUCCESS, { userIdToApprove: userIdToApprove }) }]);
}




function promptForEditQuery(replyToken, userId) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(userId, JSON.stringify({
    action: 'wait_for_edit_query'
  }));
  replyToLine(replyToken, [{ type: 'text', text: MESSAGES.PROMPT.ASK_FOR_EDIT_QUERY }]);
}











