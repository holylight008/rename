"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OneFileRenameLocations_1 = require("./OneFileRenameLocations");
var RenameService = /** @class */ (function () {
    function RenameService(host, collector) {
        this.host = host;
        this.service = host.startLanguageService();
        this.collector = collector;
    }
    RenameService.prototype.isSafeRename = function (changedClass, changedProperty) {
        var ifSafe = true;
        for (var i = 0; i < this.collector.classes.length; i++) {
            if (changedClass == this.collector.classes[i].parents) {
                this.collector.classes[i].propsAndMethods.forEach(function (props) {
                    if (props.oldName == changedProperty) {
                        ifSafe = false;
                    }
                });
            }
        }
        return ifSafe;
    };
    RenameService.prototype.getSafeRenameLocations = function (newPropertyClass, newPropertyName, newPropertyPosition, findInString, findInComment, fileName) {
        if (this.isSafeRename(newPropertyClass, newPropertyName)) {
            var info = this.service.getRenameInfo(fileName, newPropertyPosition);
            if (info.canRename) {
                var locations = this.service.findRenameLocations(fileName, newPropertyPosition, findInString, findInComment);
                return locations;
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    };
    RenameService.prototype.applyEdits = function (fileName, edits) {
        var runningOffset = 0;
        for (var i = 0; i < edits.length; i++) {
            var edit = edits[i];
            var offsetStart = edit.span.start;
            var offsetEnd = offsetStart + edit.span.length;
            this.host.scripts.get(fileName).editContent(offsetStart, offsetEnd, edit.newText);
            var editDelta = edit.newText.length - edit.span.length;
            runningOffset += editDelta;
            this.collector.updatePropertyOffset(edit.span.start, editDelta, fileName);
            //fs.writeFileSync(fileName,this.host.scripts.get(fileName).content);
            // Update positions of any future edits affected by this change
            for (var j = i + 1; j < edits.length; j++) {
                if (edits[j].span.start >= edits[i].span.start) {
                    edits[j].span.start += editDelta;
                }
            }
        }
        return runningOffset;
    };
    RenameService.prototype.renameKeyword = function () {
        var _this = this;
        for (var i = 0; i < this.collector.classes.length; i++) {
            var classData = this.collector.classes[i];
            for (var j = 0; j < classData.propsAndMethods.length; j++) {
                var props = classData.propsAndMethods[j];
                var locations = this.getSafeRenameLocations(classData.className, props.newName, props.declarePosition + props.offset, false, false, classData.declareFile);
                var eachFileEdits = new Map();
                for (var k = 0; k < locations.length; k++) {
                    if (!eachFileEdits.has(locations[k].fileName)) {
                        eachFileEdits.set(locations[k].fileName, new OneFileRenameLocations_1.OneFileRenameLocations(locations[k].fileName));
                    }
                    eachFileEdits.get(locations[k].fileName).edits.push({
                        span: locations[k].textSpan,
                        newText: props.newName
                    });
                }
                eachFileEdits.forEach(function (edit) {
                    _this.applyEdits(edit.filename, edit.edits);
                });
            }
        }
    };
    RenameService.prototype.findNewName = function () {
        for (var i = 0; i < this.collector.classes.length; i++) {
            var classData = this.collector.classes[i];
            for (var j = 0; j < classData.propsAndMethods.length; j++) {
                var props = classData.propsAndMethods[j];
            }
        }
    };
    return RenameService;
}());
exports.RenameService = RenameService;
//# sourceMappingURL=RenameService.js.map