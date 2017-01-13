/**
 * Belendbot
 * Author: Vu Tuan Anh <anhvt39@gmail.com>
 * Support for build smarter bot for Messenger by implement Wit.Ai
 * This framework was built based on BootBot by Charca
 */

'use strict';
const BootBotChat = require('../node_modules/bootbot/lib/Chat');

class Chat extends BootBotChat{
    constructor(bot, userId){
        super(bot, userId);
    }

    /**
     * Call wit to execute with given text
     * @param text
     * @returns {*}
     */
    runWit(text){
        return this.bot.runWit(this.userId, text);
    }
}

module.exports = Chat;