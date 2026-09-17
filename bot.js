require('dotenv').config();
const {Telegraf, Markup}=require('telegraf');
const Database=require('better-sqlite3');

if(!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is missing');
const bot=new Telegraf(process.env.BOT_TOKEN);
const db=new Database('earning_bot.db');
const REF=Number(process.env.REFERRAL_REWARD||10);
const MIN=Number(process.env.MIN_WITHDRAWAL||100);
const ADMIN=String(process.env.ADMIN_ID||'');
const USERNAME=process.env.BOT_USERNAME||'';

db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT, balance INTEGER DEFAULT 0, referrals INTEGER DEFAULT 0, referred_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,url TEXT NOT NULL,reward INTEGER NOT NULL,active INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS completed(user_id INTEGER,task_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,task_id)); CREATE TABLE IF NOT EXISTS withdrawals(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,amount INTEGER,status TEXT DEFAULT 'pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

function user(ctx){
 const u=ctx.from; let x=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
 if(!x){let start=(ctx.startPayload||'').replace('ref_',''); let ref=/^\\d+$/.test(start)?Number(start):null; db.prepare('INSERT INTO users(id,username,referred_by) VALUES(?,?,?)').run(u.id,u.username||'',ref); if(ref&&ref!==u.id){const r=db.prepare('SELECT id FROM users WHERE id=?').get(ref); if(r){db.prepare('UPDATE users SET balance=balance+?,referrals=referrals+1 WHERE id=?').run(REF,ref);}} x=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);} return x;
}
const menu=Markup.keyboard([['💰 Balance','📋 Tasks'],['👥 Referrals','💸 Withdraw'],['ℹ️ Help']]).resize();

bot.start(ctx=>{const u=user(ctx); ctx.reply(`Welcome!\n\nComplete legitimate sponsored tasks, earn points, and invite friends.\n\nBalance: ${u.balance} points`,menu);});
bot.hears('💰 Balance',ctx=>{const u=user(ctx);ctx.reply(`💰 Balance: ${u.balance} points\n👥 Referrals: ${u.referrals}\nMinimum withdrawal: ${MIN} points`);});
bot.hears('👥 Referrals',ctx=>{user(ctx); const link=`https://t.me/${USERNAME}?start=ref_${ctx.from.id}`; ctx.reply(`Invite friends with your link:\n${link}\n\nYou receive ${REF} points for each eligible new referral.`);});
bot.hears('📋 Tasks',ctx=>{user(ctx); const tasks=db.prepare('SELECT * FROM tasks WHERE active=1').all(); if(!tasks.length)return ctx.reply('No sponsored tasks are available right now.'); for(const t of tasks){const done=db.prepare('SELECT 1 FROM completed WHERE user_id=? AND task_id=?').get(ctx.from.id,t.id); if(done)continue; ctx.reply(`📌 ${t.title}\n🎁 Reward: ${t.reward} points`,Markup.inlineKeyboard([[Markup.button.url('Open task',t.url)],[Markup.button.callback(`Claim ${t.reward} points`,`claim_${t.id}`)]]));}});
bot.action(/^claim_(\\d+)$/,ctx=>{const id=Number(ctx.match[1]); const u=user(ctx); const t=db.prepare('SELECT * FROM tasks WHERE id=? AND active=1').get(id); if(!t)return ctx.answerCbQuery('Task unavailable'); if(db.prepare('SELECT 1 FROM completed WHERE user_id=? AND task_id=?').get(u.id,id))return ctx.answerCbQuery('Already claimed'); db.prepare('INSERT INTO completed(user_id,task_id) VALUES(?,?)').run(u.id,id); db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(t.reward,u.id); ctx.answerCbQuery('Reward added'); ctx.editMessageReplyMarkup(); ctx.reply(`✅ Added ${t.reward} points. Your new balance is ${u.balance+t.reward}.`);});
bot.hears('💸 Withdraw',ctx=>{const u=user(ctx); if(u.balance<MIN)return ctx.reply(`You need at least ${MIN} points to request a withdrawal. Current balance: ${u.balance}.`); ctx.reply('Send your payout details in this format:\n/payment YOUR_METHOD YOUR_ACCOUNT');});
bot.hears(/^\\/payment (.+)$/i,ctx=>{const u=user(ctx); if(u.balance<MIN)return ctx.reply('Your balance is below the minimum withdrawal.'); const amount=u.balance; db.prepare('INSERT INTO withdrawals(user_id,amount) VALUES(?,?)').run(u.id,amount); db.prepare('UPDATE users SET balance=0 WHERE id=?').run(u.id); ctx.reply(`✅ Withdrawal request created for ${amount} points. It will be reviewed by the administrator.`); if(ADMIN)bot.telegram.sendMessage(ADMIN,`💸 Withdrawal #${db.prepare('SELECT last_insert_rowid() id').get().id}\nUser: ${u.id} (@${u.username||'no_username'})\nAmount: ${amount}\nDetails: ${ctx.match[1]}`);});
bot.hears('ℹ️ Help',ctx=>ctx.reply('This bot rewards users only for genuine sponsored activities and referrals. Rewards are points, not guaranteed cash. Never pay a fee to claim a reward.')); 

bot.command('addtask',ctx=>{if(String(ctx.from.id)!==ADMIN)return; const p=ctx.message.text.split(' ').slice(1); if(p.length<3)return ctx.reply('/addtask Title|https://example.com|20'); const [title,url,reward]=p.join(' ').split('|'); db.prepare('INSERT INTO tasks(title,url,reward) VALUES(?,?,?)').run(title,url,Number(reward)); ctx.reply('Task added.');});
bot.command('withdrawals',ctx=>{if(String(ctx.from.id)!==ADMIN)return; const rows=db.prepare(`SELECT w.*,u.username FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status='pending' ORDER BY w.id DESC`).all(); if(!rows.length)return ctx.reply('No pending withdrawals.'); ctx.reply(rows.map(x=>`#${x.id} user ${x.user_id} @${x.username||''} amount ${x.amount}`).join('\n'));});

bot.launch().then(()=>console.log('Bot running')); process.once('SIGINT',()=>bot.stop('SIGINT'));process.once('SIGTERM',()=>bot.stop('SIGTERM'));
