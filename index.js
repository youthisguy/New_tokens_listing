const express = require("express");
const expressApp = express();
const axios = require("axios");
const path = require("path");
const port = process.env.PORT || 3000;
expressApp.use(express.static("static"));
expressApp.use(express.json());
require("dotenv").config();
const { fetchData } = require("./coingecko");

const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

expressApp.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});

bot.command("start", (ctx) => {
    console.log(ctx.from);
});

expressApp.use(bot.webhookCallback('/secret-path'))
bot.telegram.setWebhook('https://new-tokens-listing.onrender.com/secret-path')


// Function to monitor new pools
async function monitorNewPools(interval) {
    let previousData = [];
    const now = new Date();

    setInterval(async () => {
        try {
            const currentData = await fetchData();
            const filteredData = currentData.filter((item) => {
                const poolCreatedAt = new Date(item.pool_created_at);
                return poolCreatedAt > now; // Only future pools
            });

            if (filteredData.length > 0) {
                const newPool = filteredData[0]; 
                  // Determine the URL based on base_dex
                  let swapUrl = '';
                  if (newPool.base_dex.toUpperCase() === 'DEDUST') {
                      swapUrl = `https://dedust.io/swap/TON/${newPool.base_token_address}`;
                  } else {
                      swapUrl = 'https://app.ston.fi/swap';
                  }
                const isSamePool = previousData.some(
                    (prevItem) => prevItem.pool_address === newPool.pool_address
                );
                if (isSamePool) {
                    console.log("Same pool data, skip...");
                    return;
                }
                const messageContent = `
                🔔 NEW TOKEN DETECTED! 🔔\n\n|- Name: ${newPool.name.replace("0.25%","")}\n\n🪙 CA: ${newPool.base_token_address}\n⚖️ Pool Address: ${newPool.pool_address
                    }\n\n💹 DEX: ${newPool.base_dex.toUpperCase()}\n💸 Price (USD): $${Number(newPool.base_token_price_usd).toPrecision(
                        4
                    )}\n\n📊 Liquidity (USD): $${Number(newPool.reserve_in_usd).toFixed(
                        2
                    )}\n📈 Volume (USD, 24h): $${Number(newPool.volume_usd_h24).toPrecision(
                        4
                    )}\n\n📥 Total Buys (24h): ${newPool.day_hours_buys
                    }\n📤 Total Sells (24h): ${newPool.day_hours_sells
                    }\n\n⏰ Created At: ${new Date(
                        newPool.pool_created_at
                    ).toLocaleString()}`;

                // Send the message to the Telegram channel or user
                bot.telegram.sendMessage(process.env.CHANNEL_ID, messageContent, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "More Info 🔎", 
                                    url: `https://www.geckoterminal.com/ton/pools/${newPool.pool_address}`
                                }
                            ],
                            [
                                {
                                    text: "Scan Token ⚠️", 
                                    url: `https://t.me/@stonks_sniper_bot?start=${newPool.base_token_address}`
                                },
                                {
                                    text: "Buy Now 💰", 
                                    url: swapUrl
                                },
                            ],
                        ]
                    }
                });

                // Update previousData to avoid sending duplicate messages
                previousData = [newPool];
            } else {
                console.log("No new pools detected.");
            }
        } catch (error) {
            console.error("Error during pool monitoring:", error);
        }
    }, interval);
}

monitorNewPools(50_000);

// bot.launch();

expressApp.listen(port, () => console.log(`Listening on ${port}`));
