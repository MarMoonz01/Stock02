const CONFIG = {
  CHANNEL_ACCESS_TOKEN: '+RdcVCPUNUA1pl3XreXD1rAma7oEQsCO9YUeaA3Xv7qLJjNiouJki2EvXKbYnXw5qZZ9VS+wd9kPWYeeOLhO9jTdKTRGvRUCMe3hkgCzuhG6eBjWI9TTxuY5toXwAk/1KnipFwFyvsouYJIOLzmiTwdB04t89/1O/w1cDnyilFU=',
  SPREADSHEET_ID: '1ditXyV86YU9SV4YmKK6YFFeViXspqSkUVKmhfRupWog',
  ARCHIVE_SPREADSHEET_ID: '1mT-o2q2BOHk2xAxQ6SabgPcssrH_LYjK4whOdZS2vXk',
  LIFF_IDS: {
    DASHBOARD: '',
    },
  SHEETS: {
   STOCK: 'Stock',
   LOG: 'Log',
   ERROR_LOG: 'ErrorLog',
   USERS: 'Users',
   PENDING_REGISTRATIONS: 'PendingRegistrations',
   AUDIT_LOG: 'AuditLog',
   ID_LOG: 'ID_Log'
          },
         
  LOW_STOCK_THRESHOLD: 4,
  LOG_ARCHIVE_DAYS: 90,
  SLOW_MOVING_DAYS: 90,
  CACHE_EXPIRATION_SECONDS: 300,
  PROFILE_CACHE_EXPIRATION_SECONDS: 3600,
  COLUMNS: {
    TIRE_SIZE: 0, BRAND: 1, MODEL: 2, LOAD_INDEX: 3, PRICE: 4,
    DOT1: 5, STOCK1: 6, PROMO1: 7,
    DOT2: 8, STOCK2: 9, PROMO2: 10,
    DOT3: 11, STOCK3: 12, PROMO3: 13,
    DOT4: 14, STOCK4: 15, PROMO4: 16
  },
  DOT_COLUMN_MAP: {
    '1': { dot: 5, stock: 6, promo: 7 }, '2': { dot: 8, stock: 9, promo: 10 },
    '3': { dot: 11, stock: 12, promo: 13 }, '4': { dot: 14, stock: 15, promo: 16 }
  },
 
 ADMIN_USER_IDS: [
    'Ud470056466fa57a54b1f173cf1d9e48a'
],




ACTION_PERMISSIONS: {
    // --- Actions ที่ต้องการสิทธิ์ Admin เท่านั้น ---
    'execute_add_new_item': ['Admin'],
    'undo_add_new_item': ['Admin'],
    'select_item_to_edit': ['Admin'],
    'select_field_to_edit': ['Admin'],
    'execute_edit': ['Admin'],
    'undo_edit': ['Admin'],
    'view_best_sellers': ['Admin'],
    'view_weekly_best_sellers': ['Admin'],
    'view_slow_moving': ['Admin'],
    'initiate_edit_flow': ['Admin'],
    'approve_user': ['Admin'],
    'reject_user': ['Admin'],
    'view_report_page': ['Admin'],




    // --- Actions ที่พนักงานคลัง (Warehouse) และ Admin ทำได้ ---
    'show_add_options': ['Warehouse', 'Admin'],
    'ask_add_quantity': ['Warehouse', 'Admin'],
    'confirm_add': ['Warehouse', 'Admin'],
    'execute_add_confirmed': ['Warehouse', 'Admin'],
    'undo_add': ['Warehouse', 'Admin'],




    // --- Actions ที่พนักงานขาย (Sales), พนักงานคลัง และ Admin ทำได้ ---
    'show_sell_options': ['Sales', 'Warehouse', 'Admin'],
    'ask_quantity': ['Sales', 'Warehouse', 'Admin'],
    'confirm_deduction': ['Sales', 'Warehouse', 'Admin'],
    'execute_sell': ['Sales', 'Warehouse', 'Admin'],
    'undo_sell': ['Sales', 'Warehouse', 'Admin'],




    // --- Actions ที่ผู้ใช้ลงทะเบียน (Registered) ทุกคนทำได้ ---
    'show_view_options': ['Registered', 'Sales', 'Warehouse', 'Admin']
  }




};



