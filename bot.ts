const TeleBot = require('telebot');
const axios = require('axios').default;
require('dotenv').config();

const bot = new TeleBot(process.env.tgapi);
const dictionary_api = String(process.env.dictapi);
const thesaurus_api = String(process.env.thesaurusapi);

async function get_definition(word: string)  { 
    word = word.toLowerCase()
    var list: any = Array();
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    try{
        for (let i = 0; i < res.data.length; i++ ){
            for (let i1 = 0; i1 < res.data[i].meanings.length; i1++ ) {
                for (let i2 = 0; i2 < res.data[i].meanings[i1].definitions.length; i2++ ) {
                    list.push([res.data[i].meanings[i1].definitions[i2].definition,res.data[i].meanings[i1].partOfSpeech,res.data[i].sourceUrls[0]]);
                }
            }
        }
    } catch (error: any)  {
            console.log(error.code);
            list = 'Error';
    }
    
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
            bot.inlineButton('Next Definition', {callback: `def ${text} 1`})
        ]
    ]);
    return bot.sendMessage(msg.from.id, message, { replyMarkup, replyToMessage: msg.message_id ,parseMode: 'html', webPreview : false });
});

async function get_synonym_antonym(word: string)  { 
    word = word.toLowerCase()
    var list: any = Array();
    const res = await axios.get(`https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${word}?key=${thesaurus_api}`)     
    try{
        for (let i = 0; i < res.data.length; i++ ){
            if (res.data[i].meta.id.slice(0,res.data[i].meta.id.length - 1) == `${word}:` || res.data[i].meta.id == `${word}`) {
                list.push([res.data[i].shortdef,res.data[i].meta.syns[0],res.data[i].meta.ants[0]]);
            }
        }
    } catch (error: any)  {
            console.log(error.code);
            list = 'Error';
    }

    return(list);
}

bot.on(/^\/syn[\w]* (.+)$/, async (msg: any, props: any) => {
    const text = props.match[1];
    const synonym: any = await get_synonym_antonym(text);
    var message;
    var button = Array();

    if (synonym == 'Error') {
        message = 'Error';
    } else {
        var  definition_list = ''
        for (let i = 0; i < synonym.length; i++) {
            definition_list = definition_list + `${i+1}: `
            for (let i1 = 0; i1 < synonym[i][0].length; i1++) {
                if (i1 == synonym[i][0].length - 1) {
                    definition_list = definition_list + `${synonym[i][0][i1]}`
                } else {
                    definition_list = definition_list + `${synonym[i][0][i1]}; `
                }
            }  
            button.push(bot.inlineButton(`${i+1}`, {callback: `syn ${text} ${i}`}))
            definition_list = definition_list +'\n';
        } 
        message = `Which definition for the word '<b>${text}</b>' are you looking for?\n` + definition_list + '\nSource: Merriam-Webster Thesaurus';
    }

    const replyMarkup = bot.inlineKeyboard([
        button
    ]);
    return bot.sendMessage(msg.from.id, message, { replyMarkup, replyToMessage: msg.message_id ,parseMode: 'html', webPreview : false });
});

// Button callback
bot.on('callbackQuery', async (msg: any) => {
    const msgid = msg.message.message_id;
    const chatid = msg.message.chat.id;
    var message;

    if (msg.data.split(" ")[0] == 'def') {
        const def_num = Number(msg.data.split(" ")[2]);
        const text = msg.data.split(" ")[1];
        const definition: any = await get_definition(text);
        if (definition == 'Error') {
            message = 'Error';
        } else {
            message = `Definition ${def_num+1} of ${definition.length}\n<em>${definition[def_num][1]}</em>\n${definition[def_num][0]}\nSource:\n${definition[def_num][2]}`;
        }
    
        if (def_num == definition.length - 1) {
            var replyMarkup = bot.inlineKeyboard([
                [
                    bot.inlineButton('Previous Definition', {callback: `def ${text} ${def_num-1}`}),
                ]
            ]);
        } else if ((def_num == 0)) {
            var replyMarkup = bot.inlineKeyboard([
                [
                    bot.inlineButton('Next Definition', {callback: `def ${text} ${1}`})
                ]
            ]);
        } else {
            var replyMarkup = bot.inlineKeyboard([
                [
                    bot.inlineButton('Previous Definition', {callback: `def ${text} ${def_num-1}`}),
                    bot.inlineButton('Next Definition', {callback: `def ${text} ${def_num+1}`})
                ]
            ]);
        }
    
        bot.editMessageText( {chatId: chatid, messageId: msgid}, message, { replyMarkup ,parseMode: 'html', webPreview : false }).catch((error: any) => {
            console.log(error)});
        bot.answerCallbackQuery(msg.id);

    } else if (msg.data.split(" ")[0] == 'syn') {
        const def_num = Number(msg.data.split(" ")[2]);
        const text = msg.data.split(" ")[1];
        const synonym: any = await get_synonym_antonym(text);

        if (synonym == 'Error') {
            message = 'Error';
        } else {
            if (synonym[def_num][1] == undefined) {
                message = 'No synonyms found';
            } else {
                message = `Synonyms for '<b>${text}</b>':`
                for (let i = 0; i < synonym[def_num][1].length; i++) {
                    message = message + ` ${synonym[def_num][1][i]},`
                }
            }
            
            if (synonym[def_num][2] == undefined) {
                message = message + '\n\nNo antonyms found';
            } else {
                message = message + `\n\nAntonyms for '<b>${text}</b>':`
                for (let i = 0; i < synonym[def_num][2].length; i++) {
                    message = message + ` ${synonym[def_num][2][i]},`
                }
            }

            message = message + '\n\nSource: Merriam-Webster Thesaurus'
        }

        bot.editMessageText( {chatId: chatid, messageId: msgid}, message, { parseMode: 'html', webPreview : false }).catch((error: any) => {
            console.log(error)});
        bot.answerCallbackQuery(msg.id);
    }
    
});

bot.start();

