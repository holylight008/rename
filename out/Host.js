"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var ScriptInfo_1 = require("./ScriptInfo");
var ScriptSnapshot_1 = require("./ScriptSnapshot");
var Host = /** @class */ (function () {
    function Host(settings, fileNames) {
        var _this = this;
        this.scripts = new Map();
        this.settings = settings;
        this.fileNames = fileNames;
        fileNames.forEach(function (name) {
            _this.scripts.set(name, new ScriptInfo_1.ScriptInfo(name));
        });
    }
    Host.prototype.getCompilationSettings = function () {
        return this.settings;
    };
    Host.prototype.getScriptFileNames = function () {
        return this.fileNames;
    };
    Host.prototype.getScriptVersion = function (fileName) {
        var script = this.getScriptInfo(fileName);
        return script ? script.version.toString() : undefined;
    };
    Host.prototype.getScriptSnapshot = function (fileName) {
        var script = this.getScriptInfo(fileName);
        return script ? new ScriptSnapshot_1.ScriptSnapshot(script) : undefined;
    };
    Host.prototype.getCurrentDirectory = function () {
        return "";
    };
    Host.prototype.getDefaultLibFileName = function (options) {
        return (options.hasOwnProperty("target") && options.target === 2) /* ES5 */ ? "lib.es5.d.ts" : "lib.d.ts";
    };
    Host.prototype.getScriptInfo = function (fileName) {
        return this.scripts.get(fileName);
    };
    Host.prototype.startLanguageService = function () {
        return ts.createLanguageService(this);
    };
    return Host;
}());
exports.Host = Host;
//# sourceMappingURL=Host.js.map