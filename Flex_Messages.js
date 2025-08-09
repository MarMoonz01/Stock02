



function _createActionChoiceQuickReply(query) {
  const encodedQuery = encodeURIComponent(query);
  return { type: 'text', text: `ค้นพบข้อมูลสำหรับ "${query}"\nคุณต้องการทำอะไร?`, quickReply: { items: [
    { type: 'action', action: { type: 'postback', label: 'ดูสต็อก', data: `action=show_view_options&query=${encodedQuery}`, displayText: `ดูสต็อกสำหรับ "${query}"` } },
    { type: 'action', action: { type: 'postback', label: 'ตัดสต็อก', data: `action=show_sell_options&query=${encodedQuery}`, displayText: `ต้องการตัดสต็อกสำหรับ "${query}"` } },
    { type: 'action', action: { type: 'postback', label: 'เพิ่มสต็อก', data: `action=show_add_options&query=${encodedQuery}`, displayText: `ต้องการเพิ่มสต็อกสำหรับ "${query}"` } }
  ]}};
}




function _createQuantitySelectorQuickReply(params, type = 'sell') {
    const quickReplyItems = [];
    const brandModelText = `${decodeURIComponent(params.brand)} ${decodeURIComponent(params.model)}`;
    if (type === 'sell') {
        const maxQuantity = parseInt(params.stock);
        if (maxQuantity === 0) return null;
        for (let i = 1; i <= Math.min(maxQuantity, 8); i++) {
            quickReplyItems.push({ type: 'action', action: { type: 'postback', label: `${i} เส้น`, data: `action=confirm_deduction&quantity=${i}&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`, displayText: `เลือกตัดสต็อก ${brandModelText} ${i} เส้น` } });
        }
        return { type: 'text', text: `กรุณาเลือกจำนวนที่ต้องการตัดสำหรับ:\n- ${brandModelText} (${decodeURIComponent(params.tire_size)})`, quickReply: { items: quickReplyItems } };
    } else {
        [4, 8, 12, 24].forEach(qty => {
            quickReplyItems.push({ type: 'action', action: { type: 'postback', label: `+ ${qty} เส้น`, data: `action=confirm_add&quantity=${qty}&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`, displayText: `เพิ่มสต็อก ${brandModelText} ${qty} เส้น` } });
        });
        quickReplyItems.push({ type: 'action', action: { type: 'postback', label: '✍️ พิมพ์จำนวนอื่น', data: `action=ask_custom_quantity&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`, displayText: 'ต้องการพิมพ์จำนวนเอง' } });
        return { type: 'text', text: `กรุณาเลือกจำนวนที่ต้องการเพิ่มสำหรับ:\n- ${brandModelText}`, quickReply: { items: quickReplyItems } };
    }
}




function _createConfirmationFlex(params, dotValue) {
  const confirmData = `action=execute_sell&quantity=${params.quantity}&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`;
  return { "type": "flex", "altText": "ยืนยันการตัดสต็อก", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
    { "type": "text", "text": "⚠️ ยืนยันการตัดสต็อก", "weight": "bold", "size": "lg", "color": "#B91C1C", "align": "center" }, { "type": "separator", "margin": "lg" },
    { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
      _createDetailRow("สินค้า:", `${decodeURIComponent(params.brand)} ${decodeURIComponent(params.model)}`),
      _createDetailRow("เบอร์:", decodeURIComponent(params.tire_size)),
      _createDetailRow("สำหรับ DOT:", dotValue),
      _createDetailRow("จำนวน:", `- ${params.quantity} เส้น`, "#B91C1C", "md", true)
    ] }
  ]}, "footer": { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
    { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "postback", "label": "ยกเลิก", "data": "action=cancel_action", "displayText": "ยกเลิก" } },
    { "type": "button", "style": "primary", "color": "#B91C1C", "height": "sm", "action": { "type": "postback", "label": "ยืนยัน", "data": confirmData, "displayText": `ยืนยันตัดสต็อก` } }
  ]}}};
}




function _createAddConfirmationFlex(params) {
  const dotValue = getDotValueFromSheet(params.tire_size, params.brand, params.model, params.dot_index);
  const confirmData = `action=execute_add_confirmed&quantity=${params.quantity}&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`;
  return { "type": "flex", "altText": "ยืนยันการรับของเข้า", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
    { "type": "text", "text": "✅ ยืนยันการรับของเข้า", "weight": "bold", "size": "lg", "color": "#16A34A", "align": "center" }, { "type": "separator", "margin": "lg" },
    { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
      _createDetailRow("สินค้า:", `${decodeURIComponent(params.brand)} ${decodeURIComponent(params.model)}`),
      _createDetailRow("เบอร์:", decodeURIComponent(params.tire_size)),
      _createDetailRow("สำหรับ DOT:", dotValue),
      _createDetailRow("จำนวน:", `+ ${params.quantity} เส้น`, "#16A34A", "md", true)
    ] }
  ]}, "footer": { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
    { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "postback", "label": "ยกเลิก", "data": "action=cancel_action", "displayText": "ยกเลิก" } },
    { "type": "button", "style": "primary", "color": "#16A34A", "height": "sm", "action": { "type": "postback", "label": "ยืนยัน", "data": confirmData, "displayText": `ยืนยันรับของเข้า` } }
  ]}}};
}




function _createSuccessUndoFlexMessage(params, result, userName, type) {
  const isSell = type === 'sell';
  const undoAction = isSell ? 'undo_sell' : 'undo_add';
  const undoData = `action=${undoAction}&quantity=${params.quantity}&tire_size=${params.tire_size}&brand=${params.brand}&model=${params.model}&dot_index=${params.dot_index}`;
  const title = isSell ? "✅ ตัดสต็อกสำเร็จ" : "✅ รับของเข้าสต็อกสำเร็จ";
  const undoLabel = isSell ? "↩️ ยกเลิกรายการนี้ (Undo)" : "↩️ ยกเลิกการรับของเข้า";
  const changeLabel = isSell ? "ตัดออก:" : "เพิ่มเข้า:";
  const changeText = isSell ? `- ${params.quantity} เส้น` : `+ ${params.quantity} เส้น`;
  const changeColor = isSell ? "#B91C1C" : "#16A34A";
  const remainingLabel = isSell ? "คงเหลือ:" : "สต็อกใหม่:";
  return { "type": "flex", "altText": title, "contents": { "type": "bubble", "size": "giga", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
    { "type": "text", "text": title, "weight": "bold", "size": "lg", "color": "#15803D", "align": "center" },
    { "type": "text", "text": `โดย: ${userName}`, "align": "center", "size": "sm", "color": "#6B7280" },
    { "type": "separator", "margin": "lg" },
    { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
      _createDetailRow("สินค้า:", `${params.brand} ${params.model}`),
      _createDetailRow("เบอร์:", params.tire_size),
      _createDetailRow("DOT:", result.dotValue),
      _createDetailRow("สต็อกเดิม:", `${result.oldStock} เส้น`),
      _createDetailRow(changeLabel, changeText, changeColor, "md", false),
      _createDetailRow(remainingLabel, `${result.newStock} เส้น`, "#111111", "md", true)
    ]}
  ]}, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
    { "type": "button", "style": "primary", "color": "#f59e0b", "height": "sm", "action": { "type": "postback", "label": undoLabel, "data": undoData, "displayText": `ขอยกเลิกรายการ${isSell ? 'ตัดสต็อก' : 'รับของเข้า'}ล่าสุด` } }
  ]}}};
}




function _createStockSummaryFlex(totalStock, lowStockItems, itemsForCurrentPage, page, totalPages) {
  const lowStockComponents = itemsForCurrentPage.length > 0
    ? itemsForCurrentPage.map(item => {
        const postbackData = `action=ask_add_quantity&tire_size=${encodeURIComponent(item.tireSize)}&brand=${encodeURIComponent(item.brand)}&model=${encodeURIComponent(item.model)}&dot_index=${item.dotIndex}`;
        return { "type": "box", "layout": "vertical", "margin": "md", "paddingAll": "12px", "backgroundColor": "#FFFFFF", "cornerRadius": "md", "borderColor": "#E5E7EB", "borderWidth": "1px", "spacing": "sm", "contents": [
            { "type": "text", "text": `${item.brand} ${item.model}`, "weight": "bold", "size": "sm", "color": "#1F2937", "wrap": true },
            { "type": "text", "text": `${item.tireSize} (DOT: ${item.dotValue})`, "size": "xs", "color": "#4B5563", "wrap": true },
            { "type": "text", "text": `เหลือเพียง ${item.stock} เส้น`, "size": "sm", "color": "#DC2626", "weight": "bold", "margin": "md" },
            { "type": "button", "action": { "type": "postback", "label": "➕ รับของเข้า DOT นี้", "data": postbackData, "displayText": `เพิ่มสต็อก ${item.model} (DOT: ${item.dotValue})` }, "style": "primary", "color": "#16A34A", "height": "sm", "margin": "md" }
        ]};
      })
    : [{ "type": "box", "layout": "vertical", "margin": "md", "paddingAll": "12px", "backgroundColor": "#F0FDF4", "cornerRadius": "md", "contents": [{ "type": "text", "text": "✅ สต็อกทุกรายการอยู่ในระดับปกติ", "color": "#15803D", "size": "sm", "weight": "bold", "align": "center" }]}];
  const footerButtons = page < totalPages ? [{ "type": "button", "style": "link", "height": "sm", "action": { "type": "postback", "label": `ดูเพิ่มเติม (หน้า ${page + 1}/${totalPages})`, "data": `action=view_summary_page&page=${page + 1}`, "displayText": "ดูสรุปสต็อกหน้าถัดไป" }}] : [];
  return { "type": "flex", "altText": `สรุปภาพรวมสต็อก (หน้า ${page})`, "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "12px", "backgroundColor": "#4A5568", "contents": [
      { "type": "text", "text": "📊 สรุปภาพรวมสต็อก", "color": "#FFFFFF", "size": "lg", "weight": "bold" },
      { "type": "text", "text": `หน้ารายการที่ ${page} จาก ${totalPages > 0 ? totalPages : 1}`, "color": "#E5E7EB", "size": "xs", "margin": "sm" }
    ]},
    "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "lg", "backgroundColor": "#F9FAFB", "contents": [
      { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [
        { "type": "text", "text": "สต็อกยางทั้งหมด", "color": "#374151", "size": "md", "flex": 4 },
        { "type": "text", "text": `${totalStock.toLocaleString()} เส้น`, "weight": "bold", "size": "xl", "color": "#111827", "align": "end", "flex": 6 }
      ]},
      { "type": "separator" },
      { "type": "text", "text": `🚨 รายการสต็อกใกล้หมด (เรียงจากน้อยไปมาก)`, "weight": "bold", "color": "#BE123C", "size": "md", "margin": "md" },
      ...lowStockComponents
    ]},
    ...(footerButtons.length > 0 && { "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": footerButtons } })
  }};
}








function _createBrandCarouselFlex(groupedData, searchTitle, context) {
  // เราจะส่ง page=1 เป็นค่าเริ่มต้นเสมอ ให้ _createSingleBrandBubble จัดการเรื่องแบ่งหน้าเอง
  const bubbles = Object.keys(groupedData).map(brand =>
    _createSingleBrandBubble(brand, groupedData[brand], searchTitle, context, 1)
  );
 
  return [{ "type": "flex", "altText": `ผลการค้นหาสำหรับ "${searchTitle}"`, "contents": { "type": "carousel", "contents": bubbles } }];
}








// ในไฟล์ Flex Message.gs (วางทับ _createSingleBrandBubble เดิม)




function _createSingleBrandBubble(brand, allModels, searchTitle, context, page = 1) {
  const ITEMS_PER_BUBBLE = 7; // << จำนวนรุ่นย่อยสูงสุดที่จะแสดงใน 1 การ์ด (ปรับได้)
  const totalPages = Math.ceil(allModels.length / ITEMS_PER_BUBBLE);
  const startIndex = (page - 1) * ITEMS_PER_BUBBLE;
 
  // เลือกเฉพาะรุ่นที่จะแสดงในหน้านี้
  const modelsForCurrentPage = allModels.slice(startIndex, startIndex + ITEMS_PER_BUBBLE);




  // สร้าง "บล็อก" ของสินค้าแต่ละรุ่น (โค้ดส่วนนี้คือโค้ดเดิมของท่าน ไม่ได้เปลี่ยนแปลง)
  const modelBlocks = modelsForCurrentPage.map((tire, index) => {
    const detailRows = [];
    if (context !== 'edit') {
       detailRows.push(_createDetailRow("ราคา", tire.price > 0 ? tire.price.toLocaleString('th-TH') + " บาท" : "สอบถามราคา", "#B91C1C", "md", true));
    }
    const actionButtons = [];
    const encodedTireSize = encodeURIComponent(tire.tireSize);
    const encodedBrand = encodeURIComponent(brand);
    const encodedModel = encodeURIComponent(tire.model);




    if (context === 'edit') {
        actionButtons.push({ "type": "button", "style": "primary", "color": "#4338CA", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "✏️ แก้ไขรายการนี้", "data": `action=select_item_to_edit&tire_size=${encodedTireSize}&brand=${encodedBrand}&model=${encodedModel}`, "displayText": `แก้ไข ${brand} ${tire.model}` } });
    } else {
      for (let i = 1; i <= 4; i++) {
        const dotValue = tire['dot' + i];
        if (dotValue) {
          const stockCount = parseInt(tire['stock' + i]) || 0;
          detailRows.push(_createDetailRow(`DOT ${dotValue}`, `สต็อก: ${stockCount} เส้น`, stockCount > 0 ? "#374151" : "#B91C1C", "sm", false));
          if (tire['promo' + i]) { detailRows.push(_createDetailRow("โปรโมชั่น 🔥", tire['promo' + i], "#B91C1C", "sm", true)); }
         
          if (context === 'add') {
            actionButtons.push({ "type": "button", "style": "primary", "color": "#16A34A", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": `รับของเข้า DOT ${dotValue}`, "data": `action=ask_add_quantity&tire_size=${encodedTireSize}&brand=${encodedBrand}&model=${encodedModel}&dot_index=${i}`, "displayText": `รับของเข้า ${brand} ${tire.model} (DOT ${dotValue})` } });
          } else if (context === 'sell' && stockCount > 0) {
            actionButtons.push({ "type": "button", "style": "primary", "color": "#1D4ED8", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": `ตัดสต็อก DOT ${dotValue}`, "data": `action=ask_quantity&stock=${stockCount}&tire_size=${encodedTireSize}&brand=${encodedBrand}&model=${encodedModel}&dot_index=${i}`, "displayText": `ตัดสต็อก ${brand} ${tire.model} (DOT ${dotValue})` } });
          }
        }
      }
    }
    const cardHeaderContents = [{ "type": "text", "text": tire.model, "weight": "bold", "size": "lg", "color": "#111111", "wrap": true }];
    if (tire.loadIndex) { cardHeaderContents.push({ "type": "text", "text": tire.loadIndex, "weight": "bold", "size": "sm", "color": "#374151", "margin": "sm", "wrap": true }); }
    const cardBodyContents = [{ "type": "box", "layout": "vertical", "contents": cardHeaderContents }, { "type": "separator", "margin": "md" }, { "type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": detailRows }];
    if (actionButtons.length > 0) { cardBodyContents.push({ "type": "separator", "margin": "lg" }, { "type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": actionButtons }); }
    return { "type": "box", "layout": "vertical", "spacing": "md", "margin": index > 0 ? "xl" : "lg", "contents": cardBodyContents, "backgroundColor": "#F9FAFB", "borderColor": "#F3F4F6", "borderWidth": "1px", "cornerRadius": "lg", "paddingAll": "12px" };
  });




  // --- ส่วนสำคัญ: สร้างปุ่ม "ดูหน้าถัดไป" สำหรับแบรนด์นี้โดยเฉพาะ ---
  const footerButtons = [];
  if (page < totalPages) {
    footerButtons.push({
      "type": "button", "style": "link", "height": "sm",
      "action": {
        "type": "postback",
        "label": `➡️ ดู ${brand} รุ่นอื่นๆ (หน้า ${page + 1}/${totalPages})`,
        "data": `action=view_brand_page&query=${encodeURIComponent(searchTitle)}&context=${context}&brand=${encodeURIComponent(brand)}&page=${page + 1}`,
        "displayText": `ขอดู ${brand} หน้า ${page + 1}`
      }
    });
  }




  // --- โครงสร้าง Bubble หลัก (โค้ดเดิมของท่าน) ---
  return { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "20px", "backgroundColor": "#15803D", "contents": [
      { "type": "text", "text": "ผลการค้นหาสําหรับ", "color": "#FFFFFF", "size": "md", "weight": "bold", "align": "center" },
      { "type": "text", "text": `"${searchTitle}"`, "color": "#FFFFFF", "size": "xxl", "weight": "bold", "align": "center", "margin": "md" },
      // แสดงหมายเลขหน้า ถ้ามีมากกว่า 1 หน้า
      ...(totalPages > 1 ? [{ "type": "text", "text": `หน้า ${page} / ${totalPages}`, "color": "#FFFFFF", "size": "sm", "align": "center", "margin": "sm" }] : [])
    ]},
    "body": { "type": "box", "layout": "vertical", "contents": [
      { "type": "text", "text": brand.toUpperCase(), "weight": "bold", "align": "center", "color": "#00008B", "size": "xl", "margin": "md" },
      { "type": "separator", "margin": "lg" },
      ...modelBlocks
    ], "paddingAll": "12px", "spacing": "md" },
    // เพิ่ม footer ถ้ามีปุ่ม
    ...(footerButtons.length > 0 && {
      "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": footerButtons }
    })
  };
}




function _createDetailRow(label, value, valueColor = "#111111", valueSize = "sm", isValueBold = false) {
  return { "type": "box", "layout": "baseline", "spacing": "md", "margin": "sm", "contents": [
    { "type": "text", "text": label, "color": "#6B7280", "size": "sm", "weight": "bold", "flex": 4 },
    { "type": "text", "text": value, "wrap": true, "color": valueColor, "size": valueSize, "weight": isValueBold ? "bold" : "regular", "flex": 6, "align": "start" }
  ]};
}




function _createNewItemOptionsFlex(itemData, updatedDotSlot = 0) {
  const clean = val => (val === '-' || val === '' || val === undefined || val === null || val === 0) ? 'ยังไม่ระบุ' : val;
  const hasAllDots = itemData.dot4 && itemData.dot4 !== '';
  const bodyContents = [
    { "type": "text", "text": "ยืนยันข้อมูลสินค้าใหม่", "weight": "bold", "size": "xl", "align": "center", "color": "#1E40AF"},
    { "type": "text", "text": "กรุณาตรวจสอบข้อมูลด้านล่างให้ถูกต้อง", "align": "center", "size": "sm", "color": "#6B7280", "wrap": true, "margin": "sm" },
    { "type": "separator", "margin": "lg" },
    { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg", "contents": [
        _createDetailRow("เบอร์:", clean(itemData.tireSize).toString()),
        _createDetailRow("ยี่ห้อ:", clean(itemData.brand).toString()),
        _createDetailRow("รุ่น:", clean(itemData.model).toString()),
        _createDetailRow("ราคา:", `${clean(itemData.price)} บาท`, "#B91C1C", "md", true)
    ]},
    { "type": "separator", "margin": "lg" },
  ];
  let dotInfoAdded = false;
  const dotDetails = [];
  for (let i = 1; i <= 4; i++) {
      if(itemData['dot'+i] && itemData['dot'+i] !== '') {
        if (!dotInfoAdded) {
            dotDetails.push({ "type": "text", "text": "ข้อมูล DOT ที่เพิ่มแล้ว", "weight": "bold", "size": "md", "margin": "md", "color": "#1E40AF" });
            dotInfoAdded = true;
        }
        let boxColor = (i === updatedDotSlot) ? "#E0E7FF" : "#F9FAFB";
        dotDetails.push({ "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "10px", "margin": "sm", "backgroundColor": boxColor, "cornerRadius": "md", "borderWidth": "1px", "borderColor": "#F3F4F6", "contents": [
            _createDetailRow(`DOT ${i}:`, `${clean(itemData['dot'+i])}`),
            _createDetailRow(`สต็อก:`, `${clean(itemData['stock'+i])} เส้น`),
            _createDetailRow(`โปรโมชั่น:`, `${clean(itemData['promo'+i])}`)
        ]});
      }
  }
  if (!dotInfoAdded) { bodyContents.push({ "type": "text", "text": "ยังไม่ได้เพิ่มข้อมูล DOT", "align": "center", "size": "sm", "color": "#6B7280", "margin": "md" }); } else { bodyContents.push(...dotDetails); }
  const saveData = `action=execute_add_new_item`;
  const addDotData = `action=add_dot_info`;
  const footerActions = [ { "type": "button", "style": "primary", "color": "#16A34A", "height": "sm", "action": { "type": "postback", "label": "✅ บันทึกสินค้าใหม่", "data": saveData, "displayText": `ยืนยันบันทึกสินค้าใหม่ ${itemData.brand} ${itemData.model}` }} ];
  if (!hasAllDots) { footerActions.unshift({ "type": "button", "style": "primary", "color": "#3B82F6", "height": "sm", "action": { "type": "postback", "label": "➕ เพิ่มข้อมูล DOT", "data": addDotData, "displayText": `เพิ่มข้อมูล DOT สำหรับ ${itemData.brand} ${itemData.model}` }}); }
  footerActions.push({ "type": "button", "style": "link", "height": "sm", "action": { "type": "postback", "label": "ยกเลิก", "data": "action=cancel_action" }});
  return { "type": "flex", "altText": "ยืนยันข้อมูลสินค้าใหม่", "contents": { "type": "bubble", "size": "giga", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": bodyContents, "paddingAll": "16px" }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": footerActions, "paddingAll": "16px" } }};
}




function _createSuccessAddNewItemFlex(itemData, userName) {
    const undoData = `action=undo_add_new_item&tire_size=${encodeURIComponent(itemData.tireSize)}&brand=${encodeURIComponent(itemData.brand)}&model=${encodeURIComponent(itemData.model)}`;
    return { "type": "flex", "altText": "เพิ่มสินค้าสำเร็จ", "contents": { "type": "bubble", "size": "mega",
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "16px", "contents": [
      { "type": "text", "text": "✅ เพิ่มสินค้าสำเร็จ", "weight": "bold", "size": "lg", "color": "#15803D", "align": "center" },
      { "type": "text", "text": `โดย: ${userName}`, "align": "center", "size": "sm", "color": "#6B7280" },
      { "type": "separator", "margin": "lg" },
      { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
        _createDetailRow("สินค้า:", `${itemData.brand} ${itemData.model}`),
        _createDetailRow("เบอร์:", itemData.tireSize),
        _createDetailRow("ราคา:", `${itemData.price} บาท`),
      ]}
    ]}, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "16px", "contents": [
      { "type": "button", "style": "primary", "color": "#f59e0b", "height": "sm", "action": { "type": "postback", "label": "↩️ ยกเลิกการเพิ่ม (Undo)", "data": undoData, "displayText": `ขอยกเลิกการเพิ่มสินค้านี้` } }
    ]}}};
}




function _createEditOptionsFlex(params, tireData) {
  const { tire_size, brand, model } = params;
  const encodedTireSize = encodeURIComponent(tire_size);
  const encodedBrand = encodeURIComponent(brand);
  const encodedModel = encodeURIComponent(model);
  const createButton = (label, field) => ({ "type": "button", "style": "link", "height": "sm", "margin": "xs", "action": { "type": "postback", "label": `${label} (${(tireData[field] || 'N/A')})`, "data": `action=select_field_to_edit&field=${field}&label=${encodeURIComponent(label)}&tire_size=${encodedTireSize}&brand=${encodedBrand}&model=${encodedModel}` } });
  const mainDetails = [ createButton("แก้ไขเบอร์ยาง", "tireSize"), createButton("แก้ไขยี่ห้อ", "brand"), createButton("แก้ไขชื่อรุ่น", "model"), createButton("แก้ไขดัชนี", "loadIndex"), createButton("แก้ไขราคา", "price") ];
  const dotDetails = [];
  for (let i = 1; i <= 4; i++) {
      dotDetails.push({ "type": "separator", "margin": "md" });
      dotDetails.push({ "type": "text", "text": `DOT ช่องที่ ${i}`, "weight": "bold", "size": "sm", "color": "#4338CA", "margin": "sm" });
      dotDetails.push(createButton(`เลข DOT`, `dot${i}`));
      dotDetails.push(createButton(`สต็อก`, `stock${i}`));
      dotDetails.push(createButton(`โปรโมชั่น`, `promo${i}`));
  }
  return { "type": "flex", "altText": "เลือกรายการที่จะแก้ไข", "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "contents": [
      { "type": "text", "text": `แก้ไขข้อมูล`, "weight": "bold", "size": "xl", "color": "#FFFFFF" },
      { "type": "text", "text": `${decodeURIComponent(brand)} ${decodeURIComponent(model)}`, "color": "#FFFFFF", "wrap": true, "size": "md" }
    ], "backgroundColor": "#4338CA", "paddingAll": "12px" },
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "text", "text": "กรุณาเลือกข้อมูลที่ต้องการแก้ไข (ในวงเล็บคือค่าปัจจุบัน)", "align": "center", "weight": "bold", "wrap": true }, ...mainDetails, ...dotDetails ]}
  }};
}




function _createEditConfirmationFlex(params) {
    const { old_value, new_value, field_label } = params;
    const postbackData = `action=execute_edit&tire_size=${encodeURIComponent(params.tire_size)}&brand=${encodeURIComponent(params.brand)}&model=${encodeURIComponent(params.model)}&field_to_edit=${params.field_to_edit}&field_label=${encodeURIComponent(field_label)}&new_value=${encodeURIComponent(new_value)}`;
    return { "type": "flex", "altText": "ยืนยันการแก้ไขข้อมูล", "contents": { "type": "bubble", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "✏️ ยืนยันการแก้ไขข้อมูล", "weight": "bold", "size": "lg", "color": "#4338CA", "align": "center" }, { "type": "separator", "margin": "lg" },
      { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
        _createDetailRow("สินค้า:", `${decodeURIComponent(params.brand)} ${decodeURIComponent(params.model)}`),
        _createDetailRow("แก้ไข:", decodeURIComponent(field_label)),
        _createDetailRow("จาก:", (old_value || '(ว่าง)').toString()),
        _createDetailRow("เป็น:", new_value, "#4338CA", "md", true)
      ]},
    ]}, "footer": { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [
      { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "postback", "label": "ยกเลิก", "data": "action=cancel_action", "displayText": "ยกเลิก" } },
      { "type": "button", "style": "primary", "color": "#4338CA", "height": "sm", "action": { "type": "postback", "label": "ยืนยัน", "data": postbackData, "displayText": `ยืนยันการแก้ไข` } }
    ]}}};
}




function _createSuccessEditFlex(params, oldValue, userName) {
    const undoData = `action=undo_edit&tire_size=${encodeURIComponent(params.tire_size)}&brand=${encodeURIComponent(params.brand)}&model=${encodeURIComponent(params.model)}&field_to_edit=${params.field_to_edit}&field_label=${encodeURIComponent(params.field_label)}&old_value=${encodeURIComponent(oldValue)}`;
    return { "type": "flex", "altText": "แก้ไขข้อมูลสำเร็จ", "contents": { "type": "bubble", "size": "mega", "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "✅ แก้ไขข้อมูลสำเร็จ", "weight": "bold", "size": "lg", "color": "#15803D", "align": "center" },
      { "type": "text", "text": `โดย: ${userName}`, "align": "center", "size": "sm", "color": "#6B7280" }, { "type": "separator", "margin": "lg" },
      { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
        _createDetailRow("สินค้า:", `${decodeURIComponent(params.brand)} ${decodeURIComponent(params.model)}`),
        _createDetailRow("แก้ไข:", decodeURIComponent(params.field_label)),
        _createDetailRow("เปลี่ยนเป็น:", decodeURIComponent(params.new_value)),
      ]}
    ]}, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
      { "type": "button", "style": "primary", "color": "#f59e0b", "height": "sm", "action": { "type": "postback", "label": "↩️ ยกเลิกการแก้ไข (Undo)", "data": undoData, "displayText": `ขอยกเลิกการแก้ไขล่าสุด` } }
    ]}}};
}




function _createViewLogOptionsQuickReply() {
  return { type: 'text', text: 'ต้องการดูประวัติแบบไหนครับ?', quickReply: { items: [
    { type: 'action', action: { type: 'postback', label: 'ดูประวัติของวันนี้', data: `action=view_log_today`, displayText: `ขอดูประวัติของวันนี้` } },
    { type: 'action', action: { type: 'postback', label: 'ค้นหาจากชื่อสินค้า', data: `action=ask_log_query`, displayText: `ต้องการค้นหาประวัติ` } }
  ]}};
}




function _createLogReportFlex(title, logs) {
  const logComponents = logs.length > 0
    ? logs.slice(0, 40).map(log => {
        const timestamp = new Date(log[0]).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
        const userName = log[2]; const details = log[8];
        return { "type": "box", "layout": "vertical", "margin": "md", "contents": [
          { "type": "text", "text": details, "wrap": true, "size": "sm", "color": "#1F2937" },
          { "type": "text", "text": `โดย: ${userName} | ${timestamp}`, "size": "xxs", "color": "#6B7280", "margin": "sm" }
        ], "spacing": "sm" };
      })
    : [{ "type": "text", "text": "ไม่พบข้อมูลประวัติ", "align": "center", "color": "#6B7280", "margin": "lg" }];
  return { "type": "flex", "altText": title, "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "contents": [
      { "type": "text", "text": "📜 ประวัติการทำรายการ", "color": "#FFFFFF", "weight": "bold", "size": "lg" },
      { "type": "text", "text": title, "color": "#E5E7EB", "size": "sm", "wrap": true, "margin": "xs" }
    ], "backgroundColor": "#6D28D9", "paddingAll": "12px" },
    "body": { "type": "box", "layout": "vertical", "spacing": "lg", "paddingAll": "16px", "contents": logComponents }
  }};
}




function _createBestSellerReportFlex(sortedSales) {
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const title = `🏆 สินค้าขายดีประจำเดือน ${currentMonthName}`;
  const reportItems = sortedSales.map((item, index) => ({ "type": "box", "layout": "horizontal", "margin": "md", "contents": [
    { "type": "text", "text": `${index + 1}.`, "gravity": "center", "size": "lg", "color": "#905C00", "weight": "bold", "flex": 1 },
    { "type": "box", "layout": "vertical", "flex": 6, "contents": [
        { "type": "text", "text": `${item.brand} ${item.model}`, "weight": "bold", "size": "sm", "wrap": true },
        { "type": "text", "text": `ยอดขาย: ${item.totalSold} เส้น`, "size": "sm", "color": "#666666", "margin": "sm" }
    ]}
  ]}));
  if (reportItems.length === 0) { reportItems.push({ "type": "text", "text": "ยังไม่มียอดขายในเดือนนี้", "align": "center", "color": "#666666", "margin": "lg" }); }
  return { "type": "flex", "altText": title, "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "12px", "backgroundColor": "#FFD700", "contents": [
      { "type": "text", "text": "รายงานสินค้าขายดี", "color": "#905C00", "size": "lg", "weight": "bold" },
      { "type": "text", "text": `5 อันดับแรกประจำเดือน ${currentMonthName}`, "color": "#A26B00", "size": "sm" }
    ]},
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "16px", "contents": reportItems }
  }};
}




function _createSlowMovingReportFlex(slowMovingItems) {
  const title = `📦 สินค้าไม่เคลื่อนไหวในช่วง 90 วัน`;
  const reportItems = slowMovingItems.map(itemFullName => {
    const [brand, model] = itemFullName.split('|');
    return { "type": "box", "layout": "baseline", "margin": "md", "contents": [
        { "type": "icon", "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/dot_a.png", "size": "sm" },
        { "type": "text", "text": `${brand} ${model}`, "wrap": true, "size": "sm", "color": "#444444", "flex": 5, "margin": "md" }
    ]};
  });
  if (reportItems.length === 0) { reportItems.push({ "type": "text", "text": "ยอดเยี่ยม! ไม่มีสินค้าที่ไม่เคลื่อนไหวเลย", "align": "center", "color": "#15803D", "margin": "lg", "weight": "bold" }); }
  return { "type": "flex", "altText": title, "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "12px", "backgroundColor": "#4B5563", "contents": [
      { "type": "text", "text": "รายงานสินค้าไม่เคลื่อนไหว", "color": "#FFFFFF", "size": "lg", "weight": "bold" },
      { "type": "text", "text": "รายการที่ไม่มีการขายใน 90 วันล่าสุด", "color": "#E5E7EB", "size": "sm" }
    ]},
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "16px", "contents": reportItems }
  }};
}




function _createAfterViewQuickReply(query) {
  const encodedQuery = encodeURIComponent(query);
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'postback',
          label: 'ตัดสต็อกสินค้านี้',
          // เราจะ re-use action เดิม คือ show_sell_options แต่ส่ง query เดิมกลับไป
          data: `action=show_sell_options&query=${encodedQuery}`,
          displayText: `ต้องการตัดสต็อกสำหรับ "${query}"`
        }
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: 'เพิ่มสต็อกสินค้านี้',
          // เราจะ re-use action เดิม คือ show_add_options
          data: `action=show_add_options&query=${encodedQuery}`,
          displayText: `ต้องการเพิ่มสต็อกสำหรับ "${query}"`
        }
      },
    ]
  };
}




function _createHelpFlexMessage() {
  return {
    "type": "flex",
    "altText": "คู่มือการใช้งานบอท",
    "contents": {
      "type": "carousel",
      "contents": [
        {
          "type": "bubble",
          "header": { "type": "box", "layout": "vertical", "contents": [ { "type": "text", "text": "⚙️ การใช้งานพื้นฐาน", "weight": "bold", "color": "#FFFFFF", "size": "lg" } ], "backgroundColor": "#27406C", "paddingAll": "12px" },
          "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
            { "type": "text", "text": "เริ่มต้นค้นหาสินค้า", "weight": "bold", "size": "xl" },
            { "type": "text", "text": "เพียงพิมพ์สิ่งที่ต้องการค้นหาในช่องแชทได้เลย เช่น เบอร์ยาง, ยี่ห้อ, หรือชื่อรุ่น", "wrap": true, "size": "sm" },
            { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
              { "type": "text", "text": "ตัวอย่าง:", "weight": "bold" },
              { "type": "text", "text": "• 2656517", "size": "sm", "action": { "type": "message", "label": "action", "text": "265/65R17" } },
              { "type": "text", "text": "• primacy 4", "size": "sm", "action": { "type": "message", "label": "action", "text": "re004" } },
              { "type": "text", "text": "• michelin", "size": "sm", "action": { "type": "message", "label": "action", "text": "michelin" } }
            ] }
          ] }
        },
        {
          "type": "bubble",
          "header": { "type": "box", "layout": "vertical", "contents": [ { "type": "text", "text": "📦 การจัดการสต็อก", "weight": "bold", "color": "#FFFFFF", "size": "lg" } ], "backgroundColor": "#008899", "paddingAll": "12px" },
          "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
            { "type": "text", "text": "หลังจากค้นหาสินค้าแล้ว ท่านจะเห็นตัวเลือก 3 อย่าง:", "wrap": true },
            { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg", "contents": [
              { "type": "text", "text": "1.  ดูสต็อก", "weight": "bold", "contents": [ { "type": "span", "text": "1.  ดูสต็อก", "weight": "bold" }, { "type": "span", "text": ": แสดงข้อมูลสินค้าทั้งหมด" } ] },
              { "type": "text", "text": "2.  ตัดสต็อก", "weight": "bold", "contents": [ { "type": "span", "text": "2.  ตัดสต็อก", "weight": "bold" }, { "type": "span", "text": ": สำหรับขายสินค้าออก" } ] },
              { "type": "text", "text": "3.  เพิ่มสต็อก", "weight": "bold", "contents": [ { "type": "span", "text": "3.  เพิ่มสต็อก", "weight": "bold" }, { "type": "span", "text": ": สำหรับรับของเข้า" } ] }
            ]},
            { "type": "separator" },
            { "type": "text", "text": "💡 เคล็ดลับ: หลังจาก 'ดูสต็อก' จะมีปุ่มให้ 'ตัด' หรือ 'เพิ่ม' สต็อกต่อได้ทันที!", "wrap": true, "size": "sm", "color": "#666666" }
          ] }
        },
        {
          "type": "bubble",
          "header": { "type": "box", "layout": "vertical", "contents": [ { "type": "text", "text": "✨ คำสั่งอื่นๆ", "weight": "bold", "color": "#FFFFFF", "size": "lg" } ], "backgroundColor": "#6C456C", "paddingAll": "12px" },
          "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
            { "type": "button", "action": { "type": "message", "label": "➕ เพิ่มสินค้า", "text": "เพิ่มสินค้า" }, "style": "primary", "color": "#1DB446" },
            { "type": "button",
      "action": {
        "type": "postback", // เปลี่ยนเป็น postback
        "label": "✏️ แก้ไขข้อมูล",
        "data": "action=initiate_edit_flow", // ส่ง action ใหม่
        "displayText": "แก้ไขข้อมูลสินค้า" // ข้อความที่จะแสดงในแชทเมื่อกด
      },
      "style": "secondary",
      "height": "sm" },
            { "type": "button", "action": { "type": "message", "label": "📊 สรุปสต็อกใกล้หมด", "text": "สรุปสต็อก" } , "style": "primary", "color": "#C70039" }
          ] }
        }
      ]
    }
  }
}
function _createBestSellerReportFlex(sortedSales, type = 'monthly') {
  const isWeekly = type === 'weekly';
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const currentMonthName = monthNames[new Date().getMonth()];
 
  const title = isWeekly ? `🏆 สินค้าขายดีประจำสัปดาห์นี้` : `🏆 สินค้าขายดีประจำเดือน ${currentMonthName}`;
  const headerText = isWeekly ? "รายงานสินค้าขายดี (รายสัปดาห์)" : "รายงานสินค้าขายดี (รายเดือน)";
  const subHeaderText = isWeekly ? "5 อันดับแรกของสัปดาห์นี้" : `5 อันดับแรกประจำเดือน ${currentMonthName}`;
  const bgColor = isWeekly ? "#005A9C" : "#FFD700"; // สีน้ำเงินสำหรับรายสัปดาห์, สีทองสำหรับรายเดือน
  const textColor = isWeekly ? "#FFFFFF" : "#905C00";
  const subTextColor = isWeekly ? "#E0E7FF" : "#A26B00";
 
  const reportItems = sortedSales.length > 0
    ? sortedSales.map((item, index) => ({ "type": "box", "layout": "horizontal", "margin": "md", "contents": [
        { "type": "text", "text": `${index + 1}.`, "gravity": "center", "size": "lg", "color": "#905C00", "weight": "bold", "flex": 1 },
        { "type": "box", "layout": "vertical", "flex": 6, "contents": [
            { "type": "text", "text": `${item.brand} ${item.model}`, "weight": "bold", "size": "sm", "wrap": true },
            { "type": "text", "text": `ยอดขาย: ${item.totalSold} เส้น`, "size": "sm", "color": "#666666", "margin": "sm" }
        ]}
      ]}))
    : [{ "type": "text", "text": "ยังไม่มียอดขายในช่วงเวลานี้", "align": "center", "color": "#666666", "margin": "lg" }];




  return { "type": "flex", "altText": title, "contents": { "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "12px", "backgroundColor": bgColor, "contents": [
      { "type": "text", "text": headerText, "color": textColor, "size": "lg", "weight": "bold" },
      { "type": "text", "text": subHeaderText, "color": subTextColor, "size": "sm" }
    ]},
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "16px", "contents": reportItems }
  }};
}
/**
 * [NEW] สร้าง Quick Reply เลือก Action ตามสิทธิ์ของผู้ใช้
 * @param {string} query - คำค้นหา
 * @param {string} userRole - สิทธิ์ของผู้ใช้ (Admin, Warehouse, Sales, Guest)
 * @returns {object} - ข้อความ LINE พร้อม Quick Reply
 */
function _createActionChoiceQuickReply(query, userRole) {
  const encodedQuery = encodeURIComponent(query);




  // สร้าง list ของปุ่มที่จะแสดงผล
  const quickReplyItems = [];




  // 1. ปุ่ม "ดูสต็อก": แสดงให้ทุก Role
  quickReplyItems.push({
    type: 'action',
    action: {
      type: 'postback',
      label: '👁️ ดูสต็อก',
      data: `action=show_view_options&query=${encodedQuery}`,
      displayText: `ขอดูสต็อก ${query}`
    }
  });




  // 2. ปุ่ม "ตัดสต็อก": แสดงให้ Sales, Warehouse, Admin
  if (['Sales', 'Warehouse', 'Admin'].includes(userRole)) {
    quickReplyItems.push({
      type: 'action',
      action: {
        type: 'postback',
        label: '🛒 ตัดสต็อก',
        data: `action=show_sell_options&query=${encodedQuery}`,
        displayText: `ต้องการตัดสต็อก ${query}`
      }
    });
  }




  // 3. ปุ่ม "เพิ่มสต็อก": แสดงให้ Warehouse และ Admin เท่านั้น
  if (['Warehouse', 'Admin'].includes(userRole)) {
    quickReplyItems.push({
      type: 'action',
      action: {
        type: 'postback',
        label: '➕ เพิ่มสต็อก',
        data: `action=show_add_options&query=${encodedQuery}`,
        displayText: `ต้องการเพิ่มสต็อก ${query}`
      }
    });
  }




  // ประกอบร่างเป็นข้อความ LINE
  return {
    type: 'text',
    text: `ค้นพบข้อมูลสำหรับ "${query}"\nคุณต้องการทำอะไรต่อครับ?`,
    quickReply: {
      items: quickReplyItems
    }
  };
}
/**
 * [NEW] สร้าง Quick Reply "หลังจาก" ผู้ใช้กดดูสต็อกแล้ว
 * โดยจะแสดงปุ่มตามสิทธิ์ (Role) ของผู้ใช้
 * @param {string} query - คำค้นหาเดิม
 * @param {string} userRole - สิทธิ์ของผู้ใช้
 * @returns {object|null} - Quick Reply object หรือ null ถ้าไม่มีปุ่มให้แสดง
 */
function _createAfterViewQuickReply(query, userRole) {
  const encodedQuery = encodeURIComponent(query);
  const quickReplyItems = [];




  // ปุ่ม "ตัดสต็อก" จะแสดงให้ Sales, Warehouse, และ Admin
  if (['Sales', 'Warehouse', 'Admin'].includes(userRole)) {
    quickReplyItems.push({
      type: 'action',
      action: {
        type: 'postback',
        label: '🛒 ตัดสต็อก',
        data: `action=show_sell_options&query=${encodedQuery}`,
        displayText: `ต้องการตัดสต็อก ${query}`
      }
    });
  }




  // ปุ่ม "เพิ่มสต็อก" จะแสดงให้ Warehouse และ Admin เท่านั้น
  if (['Warehouse', 'Admin'].includes(userRole)) {
    quickReplyItems.push({
      type: 'action',
      action: {
        type: 'postback',
        label: '➕ เพิ่มสต็อก',
        data: `action=show_add_options&query=${encodedQuery}`,
        displayText: `ต้องการเพิ่มสต็อก ${query}`
      }
    });
  }




  // ถ้าหลังจากตรวจสอบสิทธิ์แล้ว ไม่มีปุ่มให้แสดงเลย (เช่น Guest)
  // ให้คืนค่า null ออกไป เพื่อจะได้ไม่แสดง Quick Reply ว่างๆ
  if (quickReplyItems.length === 0) {
    return null;
  }




  // ถ้ามีปุ่มให้แสดง ให้สร้างเป็น Quick Reply object แล้วส่งกลับ
  return {
    items: quickReplyItems
  };
}
/**
 * [NEW] สร้าง Flex Message สำหรับแจ้งเตือนและให้ Admin อนุมัติผู้ใช้
 * @param {string} userName - ชื่อของผู้ใช้ที่ขอลงทะเบียน
 * @param {string} userId - LINE User ID ของผู้ใช้ที่ขอลงทะเบียน
 * @returns {object} - Flex Message JSON object
 */
function _createAdminApprovalFlex(userName, userId) {
  const approveData = `action=approve_user&userIdToApprove=${encodeURIComponent(userId)}`;
  const rejectData = `action=reject_user&userIdToApprove=${encodeURIComponent(userId)}`;


  return {
    "type": "flex",
    "altText": "มีผู้ใช้ใหม่ขอลงทะเบียน",
    "contents": {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "🔔 มีผู้ใช้ใหม่ขอลงทะเบียน",
            "color": "#FFFFFF",
            "weight": "bold",
            "size": "lg"
          }
        ],
        "backgroundColor": "#4A5568",
        "paddingAll": "12px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "md",
        "contents": [
          _createDetailRow("ชื่อ Line:", userName),
          {
            "type": "box",
            "layout": "vertical",
            "margin": "md",
            "contents": [
                { "type": "text", "text": "UserID:", "size": "sm", "color": "#6B7280", "weight": "bold" },
                { "type": "text", "text": userId, "wrap": true, "size": "xs", "color": "#1F2937" }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "horizontal",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "ปฏิเสธ",
              "data": rejectData,
              "displayText": `ปฏิเสธคำขอของ ${userName}`
            },
            "style": "secondary",
            "color": "#DC2626",
            "height": "sm"
          },
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "อนุมัติ",
              "data": approveData,
              "displayText": `อนุมัติให้ ${userName} เข้าใช้งาน`
            },
            "style": "primary",
            "color": "#16A34A",
            "height": "sm"
          }
        ]
      }
    }
  };
}









