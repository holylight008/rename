"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var fs = require("fs");
/**
 * 一个代码实体类
 * @author featherJ
 */
var ScriptInfo = /** @class */ (function () {
    function ScriptInfo(fileName) {
        this.fileName = fileName;
        this.version = 1;
        this.editRanges = [];
        this.content = fs.readFileSync(fileName, "utf-8");
    }
    ScriptInfo.prototype.setContent = function (content) {
        this.content = content;
    };
    ScriptInfo.prototype.updateContent = function (content) {
        if (content != this.content)
            this.editContent(0, this.content.length, content);
    };
    ScriptInfo.prototype.editContent = function (start, end, newText) {
        if (start == end && newText.length == 0)
            return;
        // Apply edits
        var prefix = this.content.substring(0, start);
        var middle = newText;
        var suffix = this.content.substring(end);
        this.setContent(prefix + middle + suffix);
        // Store edit range + new length of script
        this.editRanges.push({
            length: this.content.length,
            textChangeRange: ts.createTextChangeRange(ts.createTextSpanFromBounds(start, end), newText.length)
        });
        // Update version #
        this.version++;
    };
    ScriptInfo.prototype.getTextChangeRangeBetweenVersions = function (startVersion, endVersion) {
        if (startVersion === endVersion) {
            // No edits!
            return ts.unchangedTextChangeRange;
        }
        var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
        var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);
        var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
        return ts.collapseTextChangeRangesAcrossMultipleVersions(entries.map(function (e) { return e.textChangeRange; }));
    };
    return ScriptInfo;
}());
exports.ScriptInfo = ScriptInfo;
//# sourceMappingURL=ScriptInfo.js.map