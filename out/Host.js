"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ScriptInfo_1 = require("./ScriptInfo");
var ScriptSnapshot_1 = require("./ScriptSnapshot");
var LanguageHost = /** @class */ (function () {
    function LanguageHost(fileNames, settings) {
        var _this = this;
        this.scripts = new Map();
        this.settings = settings;
        this.fileNames = fileNames;
        fileNames.forEach(function (name) {
            _this.scripts.set(name, new ScriptInfo_1.ScriptInfo(name));
        });
    }
    LanguageHost.prototype.getCompilationSettings = function () {
        return this.settings;
    };
    LanguageHost.prototype.getScriptFileNames = function () {
        return this.fileNames;
    };
    LanguageHost.prototype.getScriptVersion = function (fileName) {
        var script = this.getScriptInfo(fileName);
        return script ? script.version.toString() : undefined;
    };
    LanguageHost.prototype.getScriptSnapshot = function (fileName) {
        var script = this.getScriptInfo(fileName);
        return script ? new ScriptSnapshot_1.ScriptSnapshot(script) : undefined;
    };
    LanguageHost.prototype.getCurrentDirectory = function () {
        return "";
    };
    LanguageHost.prototype.getDefaultLibFileName = function (options) {
        return (options.hasOwnProperty("target") && options.target === 2) /* ES5 */ ? "lib.es5.d.ts" : "lib.d.ts";
    };
    LanguageHost.prototype.getScriptInfo = function (fileName) {
        return this.scripts.get(fileName);
    };
    return LanguageHost;
}());
exports.LanguageHost = LanguageHost;
//# sourceMappingURL=Host.js.map