"use strict";

module.exports = (bot) => ({
    coolFunction2({context, entities, sessionId, text})
    {
        return 2;
    },
    coolFunctionTwo({context, entities, sessionId, text})
    {
        return 'two';
    },
});