require('dotenv/config');
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
})

/* step 1: event listener */
client.on('ready', () => {
    console.log('The bot is online.');
});

/* step 3: ignore message start with '!' */
const IGNORE_PREFIX = '!';
/* step 4: channel that bot will respond */
const CHANNELS =['1037244764099182637']

/* step 5 -1: connect to openai and get response */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})


/* step 2: event listener: listening messages on discord*/
client.on('messageCreate', async (message) => {
    // console.log(message.content);
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

    // step 6: mock gpt is typing
    await message.channel.sendTyping();
    const sendTypingInternal = setInterval(() => {
        message.channel.sendTyping();
    }, 5000); // every 5 seconds, mock gpt is typing

    /* step 9-1: fetch conversation */
    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'Chat GPT is a friendly chatbot.'
    });
    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse(); /*fetch from earlist */

    /* step 9-2: fetch conversation, deal with message */
    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return; //ignore message if bot generates
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            });

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        })

    });

    // step 5 -2: connect to openai and get response
    const response = await openai.chat.completions
        .create({ // when use await, must add sync in function title
            model:'gpt-3.5-turbo',
            messages: conversation,
            // remove following after step 8-2 is finished
            // [
            //     {
            //         // name:
            //         role:'system',
            //         content:'',
            //     },
            //     {
            //         // name:
            //         role: 'user',
            //         content: message.content,
            //     },
            // ],
        })
        .catch((error) => console.error('OpenAI Error:\n', error));

    // step 7: clear text
    clearInterval(sendTypingInternal);

    // step 8: respond to long pause
    if (!response) {
        message.reply("I'm having some trouble with the OpenAI API. Try again in a moment.");
        return;
    }

    // step 10: break message over 2000 characters
    const responseMessage = response.choices[0].message.content;
    const chunkSizelimit = 2000;
    for (let i = 0; i < responseMessage.length; i += chunkSizelimit) {
        const chunk = responseMessage.substring(i, i + chunkSizelimit);

        await message.reply(chunk);
    };

    message.reply(response.choices[0].message.content);

});

/* step 1: event listener */
client.login(process.env.TOKEN);


/* Referring to this YT tutorial: https://www.youtube.com/watch?v=EUlnKW6Yy94*/
