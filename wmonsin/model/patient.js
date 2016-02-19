/**
 patient.ts
 Copyright (c) 2015 7ThCode.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php
 */
'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var toLocalTime = function (time) {
    var d = new Date(time);
    var offset = (new Date().getTimezoneOffset() / 60) * -1;
    var n = new Date(d.getTime() + offset);
    return n;
};
var Patient = new Schema({
    'Date': { type: Date, default: toLocalTime(Date.now) },
    'Status': { type: String, default: "Init" },
    'Category': { type: String, default: "" },
    'Group': { type: String, default: "" },
    'Information': {},
    'Input': {},
    'Sequential': 0
});
module.exports = mongoose.model('Patient', Patient);
//# sourceMappingURL=patient.js.map