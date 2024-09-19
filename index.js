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
    bot.telegram.sendMessage(
        ctx.chat.id,
        "Hello there! Welcome to the Code Capsules telegram bot.nI respond to /ethereum. Please try it",
        {}
    );
});

bot.command("ethereum", (ctx) => {
    var rate;
    console.log(ctx.from);
    axios
        .get(
            `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
        )
        .then((response) => {
            console.log(response.data);
            rate = response.data.ethereum;
            const message = `Hello, today the ethereum price is ${rate.usd} USD`;

            // Send message to the user
            bot.telegram.sendMessage(ctx.chat.id, message, {});

            // Send message to your Telegram channel (replace YOUR_CHANNEL_ID with your actual channel ID)
            const channelId = process.env.CHANNEL_ID || "-1002421092329";
            bot.telegram.sendMessage(
                channelId,
                `Ethereum price update: ${rate.usd} USD`,
                {}
            );
        })
        .catch((error) => {
            console.error("Error fetching Ethereum price:", error);
        });
});

// Function to monitor new pools
async function monitorNewPools(interval) {
    let previousData = [];
    const now = new Date();

    setInterval(async () => {
        try {
            const currentData = await fetchData();
            const filteredData = currentData.filter((item) => {
                const poolCreatedAt = new Date(item.pool_created_at);
                return poolCreatedAt < now; // Only future pools
            });

            if (
                filteredData.length > 0 &&
                JSON.stringify(filteredData) !== JSON.stringify(previousData)
            ) {
                const newPool = filteredData[0]; // Get the first new pool

                const messageContent = `
                🔔 NEW TOKEN DETECTED! 🔔\n\n💎 Name: ${newPool.name.replace("0.25%","")}\n📍 Pool Address: ${newPool.pool_address
                    }\n💹 DEX: ${newPool.base_dex.toUpperCase()}\n💰 Market Cap: $${newPool.pool_marketcap
                    }\n💸 Price (USD): $${Number(newPool.base_token_price_usd).toPrecision(
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
                                    text: "More Info 🔎", // The text displayed on the button
                                    url: `https://www.geckoterminal.com/ton/pools/${newPool.poolAddress}`
                                }
                            ]
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
    }, interval); // Runs every `interval` milliseconds
}

monitorNewPools(5000); // 300,000 ms = 5 minutes

bot.launch();
