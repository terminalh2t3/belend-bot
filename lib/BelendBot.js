/**
 * Belendbot
 * Author: Vu Tuan Anh <anhvt39@gmail.com>
 * Support for build smarter bot for Messenger by implement Wit.Ai
 * This framework was built based on BootBot by Charca
 */

'use strict';
const BootBot = require('bootbot');
const crypto = require('crypto');
const Wit = require('node-wit').Wit;
let log = require('node-wit').log;

class BelendBot extends BootBot{
    /**
     * Constructor
     * @param options
     */
    constructor(options){
        /**
         * Super BootBot
         */
        super(options);

        /**
         * Wit.AI object
         * @type Wit
         */
        this.wit = {};

        /**
         * Store the actions for Wit AI
         */
        this.witActions = {};

        /**
         * Sessions will store the context of user
         * @type {{}}
         */
        this.sessions = {};

        /**
         * Init Wit.AI object
         */
        if (options.witToken) {
            //TODO: it will need to allow setting custom folder
            this.witActions = require('./wit/actions')(this);
            const actions = this.witActions;
            this.wit = new Wit({
                accessToken: options.witToken,
                actions,
                logger: new log.Logger(log.INFO)
            });
        }
    }

    /**
     * Send request to graph API
     * @param body
     * @param endpoint
     * @param method
     * @returns {Promise.<TResult>}
     */
    sendRequest(body, endpoint, method) {
        endpoint = endpoint || 'messages';
        method = method || 'POST';
        return fetch(`https://graph.facebook.com/v2.6/me/${endpoint}?access_token=${this.accessToken}`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then(res => {
            //catch response error from Facebook
            if(res.status != 200){
                console.log("Error sending message \nBad request: " + res.headers._headers['www-authenticate'][0]);
            }
        }).catch(err => console.log(`Error sending message: ${err}`));
    }

    /**
     * Set whilelist of array of domains
     * @param domains []
     * @returns {*}
     */
    setWhiteListDomain(domains){
        return this.sendThreadRequest({
            "setting_type" : "domain_whitelisting",
            "whitelisted_domains" : domains,
            "domain_action_type": "add"
        })
    }


    /**
     * Run wit.ai for handle the specific message
     * @param recipientId
     * @param text
     */
    runWit(recipientId, text){
        const sessionId = this._findOrCreateSession(recipientId);
        // Your handle with facebook messenger Api is done without actions
        // Active wit.ai and how could it helps.
        this.wit.runActions(sessionId, text, this.sessions[sessionId].context).then((context) => {
            console.log('Waiting for next user messages');
            //save lastest content to session
            this.sessions[sessionId].context = context;
            //Delete session when context done
            if (context['done']) {
                delete this.sessions[sessionId];
            }
        }).catch((err) => {
            console.error('Oops! Got an error from Wit: ', err.stack || err);
        });
    }

    /**
     * Find or create new session for store context of messages
     * @param fbid Facebook ID or recipient ID
     * @returns {*}
     * @private
     */
    _findOrCreateSession(fbid){
        let sessionId;
        // Let's see if we already have a session for the user fbid
        Object.keys(this.sessions).forEach(k => {
            if (this.sessions[k].fbid === fbid) {
                // Yep, got it!
                sessionId = k;
            }
        });
        if (!sessionId) {
            // No session found for user fbid, let's create a new one
            sessionId = new Date().toISOString();
            this.sessions[sessionId] = {fbid: fbid, context: {}};
        }
        return sessionId;
    }

    /**
     * Handle message event
     * Check on the hearMap first, if not match in hearMap, try to handle by wit.ai
     * @param event
     * @returns {*}
     * @private
     */
    _handleMessageEvent(event) {
        if (this._handleConversationResponse('message', event)) {
            return;
        }
        const aText = event.message.text;
        const senderId = event.sender.id;
        let captured = false;
        console.log('Received text: ' + aText);
        if (!aText) {
            return;
        }

        //Check on hearMap
        for (let hear of this._hearMap){
            if (typeof hear.keyword === 'string' && hear.keyword.toLowerCase() === aText.toLowerCase()) {
                const res = hear.callback.apply(this, [event, new Chat(this, senderId), {
                    keyword: hear.keyword,
                    captured
                }]);
                captured = true;
                return res;
            } else if (hear.keyword instanceof RegExp && hear.keyword.test(aText)) {
                const res = hear.callback.apply(this, [event, new Chat(this, senderId), {
                    keyword: hear.keyword,
                    match: aText.match(hear.keyword),
                    captured
                }]);
                captured = true;
                return res;
            }
        }
        // We retrieve the user's current session, or create one if it doesn't exist
        // This is needed for our bot to figure out the conversation history
        // We retrieve the message content
        const {text, attachments} = event.message;
        if(attachments){
            console.log('Wit.ai could not resolve attachments. Ignored this request');
        }
        else if(text){
            this.runWit(event.sender.id, text);
        }

        this._handleEvent('message', event, {captured});
    }

    /**
     * Init webhook for handle request from graph api
     * @private
     */
    _initWebhook() {
        this.app.get('/webhook', (req, res) => {
            if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === this.verifyToken) {
                console.log('Validation Succeded.');
                res.status(200).send(req.query['hub.challenge']);
            } else {
                console.error('Failed validation. Make sure the validation tokens match.');
                res.sendStatus(403);
            }
        });

        this.app.post('/webhook', (req, res) => {
            var data = req.body;
            if (data.object !== 'page') {
                return;
            }

            // Iterate over each entry. There may be multiple if batched.
            data.entry.forEach((entry) => {
                // Iterate over each messaging event
                entry.messaging.forEach((event) => {
                    if (event.message && event.message.is_echo && !this.broadcastEchoes) {
                        return;
                    }
                    if (event.optin) {
                        this._handleEvent('authentication', event);
                    } else if (event.message && event.message.text) {
                        this._handleMessageEvent(event);
                        if (event.message.quick_reply) {
                            this._handleQuickReplyEvent(event);
                        }
                    } else if (event.message && event.message.attachments) {
                        this._handleAttachmentEvent(event);
                    } else if (event.postback) {
                        this._handlePostbackEvent(event);
                    } else if (event.delivery) {
                        this._handleEvent('delivery', event);
                    } else if (event.read) {
                        this._handleEvent('read', event);
                    } else if (event.account_linking) {
                        this._handleEvent('account_linking', event);
                    } else if (event.payment){
                        this._handleEvent('payment', event, res);
                    }
                    else {
                        console.log('Webhook received unknown event: ', event);
                    }
                });
            });

            // Must send back a 200 within 20 seconds or the request will time out.
            res.sendStatus(200);
        });
    }

    /**
     * Verify request signature that support request from graph api or other
     * If request from other sources, please add to header "x-sf-callouts=VERIFY_TOKEN"
     * @param req
     * @param res
     * @param buf
     * @private
     */
    _verifyRequestSignature(req, res, buf) {
        const sfcallout = req.headers['x-sf-callouts'];
        if(sfcallout){
            if(sfcallout != this.verifyToken){
                throw new Error("Wrong valid token to allow salesforce callouts.");
            }
        } else {
            const signature = req.headers['x-hub-signature'];
            if (!signature) {
                throw new Error('Couldn\'t validate the request signature. Your header should have x-hub-signature or x-sf-callouts');
            } else {
                const elements = signature.split('=');
                const method = elements[0];
                const signatureHash = elements[1];
                const expectedHash = crypto.createHmac('sha1', this.appSecret)
                    .update(buf)
                    .digest('hex');

                if (signatureHash != expectedHash) {
                    throw new Error("Couldn't validate the request signature. Please check your facebook_app_secret");
                }
            }
        }
    }
}

module.exports = BelendBot;