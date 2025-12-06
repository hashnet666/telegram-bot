const axios = require('axios');

const TELEGRAM_TOKEN = '7099606852:AAGDmLq_vKijE46pRz9AiIT7RGInNP7udTs';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const OWNER_CHAT_ID = '7012262263';

// Store user data
const userData = {};

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Handle Telegram webhook
    if (event.httpMethod === 'POST' && event.body) {
      const body = JSON.parse(event.body);
      
      if (body.message) {
        return await handleTelegramMessage(body.message);
      }
      
      // Handle website messages
      if (body.type === 'website_message') {
        return await handleWebsiteMessage(body);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'Bot running' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Handle Telegram messages
async function handleTelegramMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const userId = msg.from.id;
  const name = msg.from.first_name || 'User';

  // Initialize user
  if (!userData[userId]) {
    userData[userId] = {
      state: 'start',
      selections: [],
      conversationId: `tg_${Date.now()}_${userId}`
    };
  }

  const user = userData[userId];

  // Commands
  if (text.startsWith('/')) {
    return await handleCommand(chatId, userId, text, user, name);
  }

  // Handle user input based on state
  return await handleUserState(chatId, userId, text, user, name);
}

// Handle commands
async function handleCommand(chatId, userId, text, user, name) {
  const parts = text.split(' ');
  const command = parts[0];

  switch (command) {
    case '/start':
      user.state = 'start';
      user.selections = [];
      await sendMessage(chatId, 'Welcome To Hydra contact bot. How can I help you. Sir/Madam\n\n/plugs - Choose options\n/admin - Talk to owner');
      break;

    case '/plugs':
      user.state = 'plugs';
      await sendMessage(chatId, 'Choose your pill\n\n1. Streaming Accounts\n2. Freenet Files\n3. Student Accounts\n\nReply with number');
      break;

    case '/admin':
      user.state = 'admin';
      await sendMessage(chatId, 'You can now send messages directly to Hydra. Type your message.');
      
      // Notify owner
      await sendMessage(OWNER_CHAT_ID, 
        `Direct contact from ${name}\nID: ${user.conversationId}\n\nReply: /reply ${user.conversationId} your message`
      );
      break;

    case '/back':
      if (user.state === 'start') {
        await sendMessage(chatId, 'Already at main menu.');
      } else {
        user.state = 'start';
        user.selections = [];
        await sendMessage(chatId, 'Back to main menu. Use /plugs or /admin');
      }
      break;

    case '/reply':
      if (chatId.toString() === OWNER_CHAT_ID && parts.length >= 3) {
        const targetId = parts[1];
        const replyText = parts.slice(2).join(' ');
        
        // Find user by conversation ID
        for (const uid in userData) {
          if (userData[uid].conversationId === targetId) {
            await sendMessage(uid, `Hydra: ${replyText}`);
            await sendMessage(chatId, 'Reply sent.');
            break;
          }
        }
      }
      break;

    default:
      await sendMessage(chatId, 'Unknown command. Use /start');
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

// Handle user state
async function handleUserState(chatId, userId, text, user, name) {
  const state = user.state;
  const input = text.trim().toLowerCase();

  switch (state) {
    case 'plugs':
      await handlePlugs(chatId, userId, text, user, name);
      break;

    case 'streaming':
      await handleStreaming(chatId, userId, text, user, name);
      break;

    case 'student':
      await handleStudent(chatId, userId, text, user, name);
      break;

    case 'admin':
      await handleAdminChat(chatId, userId, text, user, name);
      break;

    default:
      await sendMessage(chatId, 'Use /start to begin');
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

// Handle plugs menu
async function handlePlugs(chatId, userId, text, user, name) {
  switch (text) {
    case '1':
      user.state = 'streaming';
      await sendMessage(chatId,
        'Streaming Accounts:\n\n' +
        '1. Dstv\n' +
        '2. Netflix\n' +
        '3. Showmax\n' +
        '4. Crunchyroll\n' +
        '5. PrimeVideo\n\n' +
        'Choose numbers (ex: 1,3)\nType "done" when finished\nType "back" to go back'
      );
      break;

    case '2':
      await sendMessage(chatId, 'Freenet Files: https://t.me/redsmoker2\n\nUse /back to return');
      break;

    case '3':
      user.state = 'student';
      await sendMessage(chatId,
        'Student Accounts:\n\n' +
        '1. Uwc - R 5 voucher each\n' +
        '2. UL - R15 voucher each\n' +
        '3. Tut - R15 voucher each\n' +
        '4. Wsu - R15 voucher each\n' +
        '5. Unisa - R15 voucher each\n\n' +
        'Choose numbers (ex: 1,2)\nType "done" when finished\nType "back" to go back'
      );
      break;

    default:
      await sendMessage(chatId, 'Reply with 1, 2, or 3');
  }
}

// Handle streaming selection
async function handleStreaming(chatId, userId, text, user, name) {
  if (text === 'back') {
    user.state = 'plugs';
    user.selections = [];
    await sendMessage(chatId, 'Back to options');
    return;
  }

  if (text === 'done') {
    if (user.selections.length === 0) {
      await sendMessage(chatId, 'Select at least one option first.');
      return;
    }

    user.state = 'admin';
    await sendMessage(chatId,
      `Selected: ${user.selections.join(', ')}\n\nYou can now chat with Hydra. Type your message.`
    );

    // Notify owner
    await sendMessage(OWNER_CHAT_ID,
      `Streaming inquiry from ${name}\nSelected: ${user.selections.join(', ')}\nID: ${user.conversationId}\n\nReply: /reply ${user.conversationId} your message`
    );
    return;
  }

  // Parse selections
  const services = ['Dstv', 'Netflix', 'Showmax', 'Crunchyroll', 'PrimeVideo'];
  const nums = text.split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 5);
  
  if (nums.length > 0) {
    nums.forEach(n => {
      const service = services[n - 1];
      if (!user.selections.includes(service)) {
        user.selections.push(service);
      }
    });
    
    await sendMessage(chatId,
      `Added: ${nums.map(n => services[n - 1]).join(', ')}\nCurrent: ${user.selections.join(', ')}\n\nType "done" to finish or add more`
    );
  } else {
    await sendMessage(chatId, 'Choose numbers 1-5 (ex: 1,3,5)');
  }
}

// Handle student selection
async function handleStudent(chatId, userId, text, user, name) {
  if (text === 'back') {
    user.state = 'plugs';
    user.selections = [];
    await sendMessage(chatId, 'Back to options');
    return;
  }

  if (text === 'done') {
    if (user.selections.length === 0) {
      await sendMessage(chatId, 'Select at least one option first.');
      return;
    }

    user.state = 'admin';
    await sendMessage(chatId,
      `Selected: ${user.selections.join(', ')}\n\nYou can now chat with Hydra. Type your message.`
    );

    // Notify owner
    await sendMessage(OWNER_CHAT_ID,
      `Student account inquiry from ${name}\nSelected: ${user.selections.join(', ')}\nID: ${user.conversationId}\n\nReply: /reply ${user.conversationId} your message`
    );
    return;
  }

  // Parse selections
  const accounts = [
    'Uwc (R5 voucher)',
    'UL (R15 voucher)',
    'Tut (R15 voucher)',
    'Wsu (R15 voucher)',
    'Unisa (R15 voucher)'
  ];
  
  const nums = text.split(',').map(n => parseInt(n.trim())).filter(n => n >= 1 && n <= 5);
  
  if (nums.length > 0) {
    nums.forEach(n => {
      const account = accounts[n - 1];
      if (!user.selections.includes(account)) {
        user.selections.push(account);
      }
    });
    
    await sendMessage(chatId,
      `Added: ${nums.map(n => accounts[n - 1]).join(', ')}\nCurrent: ${user.selections.join(', ')}\n\nType "done" to finish or add more`
    );
  } else {
    await sendMessage(chatId, 'Choose numbers 1-5 (ex: 1,2)');
  }
}

// Handle admin chat
async function handleAdminChat(chatId, userId, text, user, name) {
  if (text === '/back') {
    user.state = 'start';
    user.selections = [];
    await sendMessage(chatId, 'Back to main menu.');
    return;
  }

  // Forward to owner
  await sendMessage(OWNER_CHAT_ID,
    `Message from ${name}:\n\n${text}\n\nID: ${user.conversationId}\n\nReply: /reply ${user.conversationId} your message`
  );
  
  await sendMessage(chatId, 'Message sent to Hydra.');
}

// Handle website messages
async function handleWebsiteMessage(body) {
  const { message, name = 'Website User', userId } = body;
  const conversationId = `web_${Date.now()}_${userId || Math.random().toString(36).substr(2, 9)}`;

  // Forward to Telegram
  await sendMessage(OWNER_CHAT_ID,
    `Website message from ${name}:\n\n${message}\n\nID: ${conversationId}\n\nReply: /reply ${conversationId} your message`
  );

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      conversationId: conversationId,
      message: 'Message sent to Hydra'
    }),
  };
}

// Send Telegram message
async function sendMessage(chatId, text) {
  try {
    await axios.post(TELEGRAM_API + '/sendMessage', {
      chat_id: chatId,
      text: text
    });
  } catch (error) {
    console.error('Telegram error:', error.message);
  }
}
