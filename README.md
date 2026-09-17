# Telegram Earning Bot

A starter Telegram bot for a legitimate rewards platform. Users can complete sponsored tasks, earn points, invite referrals, and request withdrawals. It does **not** use fake transactions or hidden fees.

## 1. Create the bot
Open Telegram and talk to @BotFather. Run `/newbot`, choose a name and username, then copy the token.

## 2. Get your Telegram numeric ID
Use a trusted Telegram ID bot/service, or later add a small command to display your ID. Put the numeric ID in `ADMIN_ID`.

## 3. Install Node.js
Install Node.js 20+ on your computer or server.

## 4. Configure
Copy `.env.example` to `.env` and fill in:
- BOT_TOKEN
- ADMIN_ID
- BOT_USERNAME (without @)
- REFERRAL_REWARD
- MIN_WITHDRAWAL

## 5. Run
```bash
npm install
npm start
```

## 6. Add a task
As admin:
`/addtask Task title|https://example.com|20`

## Important
Only add real sponsored/affiliate tasks that you are authorized to promote. Do not promise guaranteed cash, charge users fake transaction fees, or misrepresent rewards.
