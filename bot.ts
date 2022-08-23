const TeleBot = require('telebot');
const axios = require('axios').default;
require('dotenv').config();

const bot = new TeleBot(process.env.tgapi);
const dictionary_api = String(process.env.dictapi);
const thesaurus_api = String(process.env.thesaurusapi);

async function get_definition(word: string)  { 
    word = word.toLowerCase()
    var list: any = Array();
    await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
        .then((res: any) => {
            for (let i = 0; i < res.data.length; i++ ){
                for (let i1 = 0; i1 < res.data[i].meanings.length; i1++ ) {
                    for (let i2 = 0; i2 < res.data[i].meanings[i1].definitions.length; i2++ ) {
                        list.push([res.data[i].meanings[i1].definitions[i2].definition,res.data[i].meanings[i1].partOfSpeech,res.data[i].sourceUrls[0]]);
                    }
                }
            }
        })
        .catch((error: any) => {
            console.log(error.code);
            list = 'Error';
        });
    return(list);     
}

bot.on(/^\/def[\w]* (.+)$/, async (msg: any, props: any) => {
    const text = props.match[1];
    const definition: any = await get_definition(text);
    var message;
    if (definition == 'Error') {
        message = 'Error';
    } else {
        message = `Definition 1 of ${definition.length}\n<em>${definition[0][1]}</em>\n${definition[0][0]}\nSource:\n${definition[0][2]}`;
    }
    if (definition.length == 1 || definition == 'Error') {
        return bot.sendMessage(msg.from.id, message, { replyToMessage: msg.message_id });
    }
    const replyMarkup = bot.inlineKeyboard([
        [
            bot.inlineButton('Next Definition', {callback: `${text} 1`})
        ]
    ]);
    return bot.sendMessage(msg.from.id, message, { replyMarkup, replyToMessage: msg.message_id ,parseMode: 'html', webPreview : false });
});

// Button callback
bot.on('callbackQuery', async (msg: any) => {
    const msgid = msg.message.message_id;
    const chatid = msg.message.chat.id;
    const def_num = Number(msg.data.split(" ")[1]);
    const text = msg.data.split(" ")[0];
    const definition: any = await get_definition(text);
    var message;

    if (definition == 'Error') {
        message = 'Error';
    } else {
        message = `Definition ${def_num+1} of ${definition.length}\n<em>${definition[def_num][1]}</em>\n${definition[def_num][0]}\nSource:\n${definition[def_num][2]}`;
    }

    if (def_num == definition.length - 1) {
        var replyMarkup = bot.inlineKeyboard([
            [
                bot.inlineButton('Previous Definition', {callback: `${text} ${def_num-1}`}),
            ]
        ]);
    } else if ((def_num == 0)) {
        var replyMarkup = bot.inlineKeyboard([
            [
                bot.inlineButton('Next Definition', {callback: `${text} ${1}`})
            ]
        ]);
    } else {
        var replyMarkup = bot.inlineKeyboard([
            [
                bot.inlineButton('Previous Definition', {callback: `${text} ${def_num-1}`}),
                bot.inlineButton('Next Definition', {callback: `${text} ${def_num+1}`})
            ]
        ]);
    }
    

    bot.editMessageText( {chatId: chatid, messageId: msgid}, message, { replyMarkup ,parseMode: 'html', webPreview : false }).catch((error: any) => {
        console.log(error)});
    bot.answerCallbackQuery(msg.id);

});

bot.start();

