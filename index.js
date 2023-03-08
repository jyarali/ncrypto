require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const WebSocket = require("ws");
const fs = require("fs");
var env = process.env;
env.ALERT_DROP_PERCENT =
  env.ALERT_DROP_PERCENT > 0 ? -env.ALERT_DROP_PERCENT : env.ALERT_DROP_PERCENT;
const bot = new TelegramBot(env.TELEGRAM_TOKEN, {
  polling: true,
  verbose: true,
});
var wsc = new WebSocket.WebSocket(
  `wss://cryptoxscanner.com/ws/${env.MARKET}/monitor?updateInterval=10&`
);
const linesAsArray = (file) =>
  fs.readFileSync(file, { encoding: "utf8" }).split("\n");
const writeArrays = (file, array) => fs.writeFileSync(file, array.join("\n"));
var alertBlacklistPRICES = linesAsArray("blacklist-prices");
var alertBlacklistVOLUMES = linesAsArray("blacklist-volumes");
var clearCounter = 0;
var lastMessageTimestamp = 0;
bot.on("error", (err) => console.log(error));
const getLocalTime = () => {
  var date = new Date();
  var sec = date.getSeconds();
  var min = date.getMinutes();
  var hr = date.getHours();
  const fillWZero = (text) => `${text.toString().length < 2 ? "0" : ""}${text}`;
  return `${fillWZero(hr)}:${fillWZero(min)}:${fillWZero(sec)}`;
};
const sendMessageToChannel = (
  messageToSend,
  channeld = env.TELEGRAM_CHANNEL_ID
) => {
  bot.sendMessage(channeld, messageToSend);
};
const startsWithNumber = (text) =>
  ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(text[0]);
const getTradingViewUrl = (symbol) =>
  `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}${
    startsWithNumber(symbol) ? "PERP" : ""
  }`;
const priceChangedMessage = (data, interval) => {
  var price = data.price_change_pct[interval];
  var isUp = !(price < 0);
  // // console.log("daewqeqw ewq ewqe qw ewq", data.price_change_pct, interval);
  var messageToSend = `${getLocalTime()}  -  ${
    data.symbol.split("-")[1]
  }  -  Price: ${isUp ? "+" : ""}${price}% ${
    isUp ? "🟢" : "🔴"
  }\n\n${getTradingViewUrl(data.symbol.split("-")[1])}`;
  console.log("Message will send: \n" + messageToSend);
  sendMessageToChannel(messageToSend);
};
const volumeChangedMessage = (data, interval) => {
  var volume = data.volume_change_pct[interval];
  var isUp = volume > 0;
  // // // console.log("daewqeqw ewq ewqe qw ewq", data.price_change_pct, interval);
  var messageToSend = `${getLocalTime()}  -  ${
    data.symbol.split("-")[1]
  }  -  Volume:${isUp ? "+" : ""}${volume}% ${
    isUp ? "🟢" : "🔴"
  }\n\n${getTradingViewUrl(data.symbol.split("-")[1])}`;
  console.log("Message will send: \n" + messageToSend);
  sendMessageToChannel(messageToSend);
};
const getKeys = (array, dictKey) => {
  var out = [];
  for (let index = 0; index < array.length; index++)
    out.push(array[index][dictKey]);
  return out;
};
const findIndex = (array, key, search) => {
  for (let index = 0; index < array.length; index++)
    if (array[index][key] === search) return index;
  return -1;
};
const onMessage = (data) => {
  // console.log("Elapsed:",((Date.now() - lastMessageTimestamp)/1000)+"s");
  // if ((Date.now() - lastMessageTimestamp) < 10000) return;
  // console.clear();
  if (!data.data) return;
  var data = JSON.parse(data.data);
  fs.writeFileSync("x.json", JSON.stringify(data, null, 4));
  // console.log("new message");
  // // console.log(data.tickers[0]);
  for (var index = 0; index < data.tickers.length; index++) {
    var item = data.tickers[index];
    var priceChange = item.price_change_pct[env.INTERVAL];
    var volumeChange = item.volume_change_pct[env.INTERVAL];
    // if (item.symbol.endsWith("1000LUNCBUSD")) {
    //     // console.clear();
    //     console.log(priceChange, volumeChange);
    //     console.log(item);
    // }
    // console.log(item);
    if (Math.abs(volumeChange) > 2)
      if (
        ((priceChange < 0 && priceChange <= env.ALERT_DROP_PERCENT) ||
          (priceChange > 0 && priceChange >= env.ALERT_GAIN_PERCENT)) &&
        !alertBlacklistPRICES.includes(item.symbol)
      ) {
        // console.log("PCA", priceChange);
        priceChangedMessage(item, env.INTERVAL);
        alertBlacklistPRICES.push(item.symbol);
        // // console.log("below 0 ", env.ALERT_DROP_PERCENT, env.ALERT_GAIN_PERCENT);
        // // console.log("and alertable");
      }
    // console.log(env.ALERT_VOLUME_PERCENT-Math.abs(volumeChange));
    /*if (
      env.ALERT_VOLUME_PERCENT - Math.abs(volumeChange) <= 0 &&
      !alertBlacklistVOLUMES.includes(item.symbol)
    ) {
      // console.log("VCA",volumeChange);
      volumeChangedMessage(item, env.INTERVAL);
      alertBlacklistVOLUMES.push(item.symbol);
    }*/
    // continue;
    // if ((item.volume_change_pct[env.INTERVAL]>0 && (item.volume_change_pct[env.INTERVAL] >= env.ALERT_GAIN_PERCENT)) || (item.volume_change_pct[env.INTERVAL]<0 && (item.volume_change_pct[env.INTERVAL] <= env.ALERT_DROP_PERCENT)) || (item.volume_change_pct[env.INTERVAL] >= env.ALERT_VOLUME_PERCENT) && (!["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(item.symbol.split("-")[1][0]))) {
    //     var symbolBlacklistIndex = findIndex(alertBlacklist, "symbol", item.symbol);
    //     if (symbolBlacklistIndex > -1 && ((Date.now() - alertBlacklist[symbolBlacklistIndex].timestamp) / 1000 < (parseInt(env.ALERT_DROP_PERCENT[0]) * 60))) continue;
    //     // priceChangedMessage(item, env.ALERT_GAIN_WINDOW);
    //     if (symbolBlacklistIndex > -1) alertBlacklist[symbolBlacklistIndex] = {symbol: item.symbol, timestamp: Date.now()};
    //     else alertBlacklist.push({symbol: item.symbol, timestamp: Date.now()});
    //     if (alertBlacklist.length > 100) alertBlacklist = alertBlacklist.slice(49, 100);

    //     // for (var index2 = 0; index2 < alertBlacklist.length; index2++){
    //     //     // console.log((Date.now() - alertBlacklist[index2].timestamp) / 1000);
    //     //     if (alertBlacklist[index2].symbol === item.symbol && ((Date.now() - alertBlacklist[index2].timestamp) / 1000 < (parseInt(env.ALERT_DROP_PERCENT[0]) * 60))) {
    //     //         return;
    //     //     };
    //     // };

    //     // for (var index2 = 0; index2 < alertBlacklist.length; index2++){
    //     //     // console.log(alertBlacklist[index2]);
    //     //     if (alertBlacklist[index2].symbol === item.symbol) {
    //     //         return;
    //     //     };
    //     // };
    //     // // console.log(data);
    // };
  }
  alertBlacklistPRICES = clearCounter > 4 ? [] : alertBlacklistPRICES;
  alertBlacklistVOLUMES = clearCounter > 4 ? [] : alertBlacklistVOLUMES;
  writeArrays("blacklist-prices", alertBlacklistPRICES);
  writeArrays("blacklist-volumes", alertBlacklistVOLUMES);
  // console.log(alertBlacklistPRICES, clearCounter);
  // console.log(alertBlacklistVOLUMES, clearCounter);
  clearCounter++;
  clearCounter = clearCounter > 5 ? 0 : clearCounter;
  lastMessageTimestamp = Date.now();
  // // console.log(data.toString());
};
const onOpen = () => console.log(`[${getLocalTime()}] Connected!`);
const onClose = () => console.log(`[${getLocalTime()}] Disconnected!`);
wsc.on("open", onOpen);
wsc.on("close", onClose);
// wsc.on("message", onMessage);
wsc.onmessage = onMessage;

(async () => {
  while (true) {
    await new Promise((t) => setTimeout(t, 80500));
    process.exit();
    // wsc.close();
    // console.log("Reconnecting");
    // var tmpWsc = new WebSocket.WebSocket(wsc.url);
    // tmpWsc.onMessage = onMessage;
    // tmpWsc.onopen = onOpen;
    // tmpWsc.onclose = onClose;
    // wsc = tmpWsc;
    // delete tmpWsc;
  }
})();
