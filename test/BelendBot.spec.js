'use strict';

const assert = require('chai').expect;
const sinon = require('sinon');
const BelendBot = require('../lib/BelendBot');
const fetchMock = require('fetch-mock');

describe('BelendBot', () => {
    let server;
    let userId;
    let bot;

    beforeEach(() => {
        const options = {
            accessToken: '1234',
            verifyToken: '5678',
            appSecret: 'foobar'
        };
        userId = 1234;
        bot = new BelendBot(options);
        server = sinon.fakeServer.create();
        server.autoRespond = true;
        fetchMock.get('*', {hello: 'world'});
        fetchMock.post('*', {hello: 'world'});
    });

    afterEach(() => {
        server.restore();
        fetchMock.restore();
    });

    it('creates a bot instance', () => {
        assert(bot instanceof BelendBot).to.equal(true);
    });

    it('throws an error if there are missing tokens', () => {
        assert(() => new BootBot()).to.throw(Error);
    });

    it('can send a text message', () => {
        const spy = sinon.spy(bot, 'sendRequest');
        const text = 'Hello world!';
        const expected = {
            recipient: {
                id: userId
            },
            message: {
                text
            }
        };

        bot.sendTextMessage(userId, text);
        assert(spy.calledWith(expected)).to.equal(true);
    });

    it('can send a text message with quick replies', () => {
        const spy = sinon.spy(bot, 'sendRequest');
        const text = 'Hello world!';

        // Quick Replies as strings with auto-generated payload
        const quickReplies1 = ['Red', 'Green', 'Blue'];
        const expected1 = {
            recipient: {
                id: userId
            },
            message: {
                text,
                quick_replies: [{
                    content_type: 'text',
                    title: 'Red',
                    payload: 'BOOTBOT_QR_RED'
                }, {
                    content_type: 'text',
                    title: 'Green',
                    payload: 'BOOTBOT_QR_GREEN'
                }, {
                    content_type: 'text',
                    title: 'Blue',
                    payload: 'BOOTBOT_QR_BLUE'
                }]
            }
        };

        bot.sendTextMessage(userId, text, quickReplies1);
        assert(spy.calledWith(expected1)).to.equal(true);

        // Quick Replies as objects with partial information
        const quickReplies2 = [{
            title: 'Purple'
        }, {
            title: 'Yellow',
            payload: 'CUSTOM_YELLOW'
        }, {
            title: 'Image',
            image_url: 'http://google.com/image.png'
        }];
        const expected2 = {
            recipient: {
                id: userId
            },
            message: {
                text,
                quick_replies: [{
                    content_type: 'text',
                    title: 'Purple',
                    payload: 'BOOTBOT_QR_PURPLE'
                }, {
                    content_type: 'text',
                    title: 'Yellow',
                    payload: 'CUSTOM_YELLOW'
                }, {
                    content_type: 'text',
                    title: 'Image',
                    payload: 'BOOTBOT_QR_IMAGE',
                    image_url: 'http://google.com/image.png'
                }]
            }
        };

        bot.sendTextMessage(userId, text, quickReplies2);
        assert(spy.calledWith(expected2)).to.equal(true);

        // Quick Replies as custom object
        const quickReplies3 = [{
            content_type: 'location'
        }, {
            content_type: 'bootbot',
            payload: 'THIS_IS_JUST_A_TEST'
        }, {
            foo: 'bar'
        }];
        const expected3 = {
            recipient: {
                id: userId
            },
            message: {
                text,
                quick_replies: [{
                    content_type: 'location'
                }, {
                    content_type: 'bootbot',
                    payload: 'THIS_IS_JUST_A_TEST'
                }, {
                    foo: 'bar'
                }]
            }
        };

        bot.sendTextMessage(userId, text, quickReplies3);
        assert(spy.calledWith(expected3)).to.equal(true);
    });

    it('can send a button template', () => {
        const spy = sinon.spy(bot, 'sendRequest');
        const text = 'Choose an option';
        const buttons = [
            { type: 'postback', title: 'Red', payload: 'COLOR_RED' },
            { type: 'postback', title: 'Green', payload: 'COLOR_GREEN' },
            { type: 'postback', title: 'Blue', payload: 'COLOR_BLUE' }
        ];
        const expected = {
            recipient: {
                id: userId
            },
            message: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text,
                        buttons
                    }
                }
            }
        };

        bot.sendButtonTemplate(userId, text, buttons);
        assert(spy.calledWith(expected)).to.equal(true);
    });

    it('can send a generic template', () => {
        const spy = sinon.spy(bot, 'sendRequest');
        const elements = [
            {
                "title":"Welcome to Peter\'s Hats",
                "image_url":"http://petersapparel.parseapp.com/img/item100-thumb.png",
                "subtitle":"We\'ve got the right hat for everyone.",
                "buttons":[
                    {
                        "type":"web_url",
                        "url":"https://petersapparel.parseapp.com/view_item?item_id=100",
                        "title":"View Website"
                    },
                    {
                        "type":"postback",
                        "title":"Start Chatting",
                        "payload":"USER_DEFINED_PAYLOAD"
                    }
                ]
            }
        ];
        const expected = {
            recipient: {
                id: userId
            },
            message: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements
                    }
                }
            }
        };

        bot.sendGenericTemplate(userId, elements);
        assert(spy.calledWith(expected)).to.equal(true);
    });

    it('can send an attachment', () => {
        const spy = sinon.spy(bot, 'sendRequest');
        const type = 'image';
        const url = 'http://petersapparel.parseapp.com/img/item100-thumb.png';
        const expected = {
            recipient: {
                id: userId
            },
            message: {
                attachment: {
                    type,
                    payload: {
                        url
                    }
                }
            }
        };

        bot.sendAttachment(userId, type, url);
        assert(spy.calledWith(expected)).to.equal(true);
    });

    it('can set whilelist domain', () => {
        const spy = sinon.spy(bot, 'setWhiteListDomain');
        const domains = ['http://sometestdomain.com','http://www.cooldomain.com'];
        bot.setWhiteListDomain(domains);
        assert(spy.calledWith(domains)).to.equal(true);
    });
});