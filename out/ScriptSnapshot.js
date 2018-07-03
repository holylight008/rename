"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 代码快照
 */
var ScriptSnapshot = /** @class */ (function () {
    function ScriptSnapshot(scriptInfo) {
        this.scriptInfo = scriptInfo;
        this.textSnapshot = scriptInfo.content;
        this.version = scriptInfo.version;
    }
    ScriptSnapshot.prototype.getText = function (start, end) {
        return this.textSnapshot.substring(start, end);
    };
    ScriptSnapshot.prototype.getLength = function () {
        return this.textSnapshot.length;
    };
    ScriptSnapshot.prototype.getChangeRange = function (oldScript) {
        var oldShim = oldScript;
        return this.scriptInfo.getTextChangeRangeBetweenVersions(oldShim.version, this.version);
    };
    return ScriptSnapshot;
}());
exports.ScriptSnapshot = ScriptSnapshot;
//# sourceMappingURL=ScriptSnapshot.js.map