"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Host_1 = require("./Host");
var fs = require("fs");
var ts = require("typescript");
var RenameService_1 = require("./RenameService");
var DataCollect_1 = require("./DataCollect");
var testFolderpath = "E:/projects/safeRename/test";
var files = fs.readdirSync(testFolderpath);
for (var i = 0; i < files.length; i++) {
    files[i] = "E:/projects/safeRename/test/" + files[i];
}
var options = ts.getDefaultCompilerOptions();
var host = new Host_1.Host(options, files);
host.startLanguageService();
var collector = new DataCollect_1.DataCollect();
collector.getClassData(files, options);
var service = new RenameService_1.RenameService(host, collector);
//service.renameKeyword();
// let eachFileEdits: Map<string, OneFileRenameLocations> = new Map();
// let newPropertyName = "a";
// let newPropertyClass = "Parent";
// let newPropertyPosition = 96;
// let locations = service.getSafeRenameLocations(newPropertyClass, newPropertyName, newPropertyPosition, false, false, files[2]);
// for (let k = 0; k < locations.length; k++) {
//     if (!eachFileEdits.has(locations[k].fileName)) {
//         eachFileEdits.set(locations[k].fileName, new OneFileRenameLocations(locations[k].fileName));
//     }
//     eachFileEdits.get(locations[k].fileName).edits.push({
//         span: locations[k].textSpan,
//         newText: newPropertyName
//     });
// }
// //对每个包含关键词的文件fileedit进行处理，得到每个文件处理该关键词后的位置偏移
// eachFileEdits.forEach((edit)=>{
//     service.applyEdits(edit.filename,edit.edits);
// })
// newPropertyName = "mememda";
// newPropertyClass = "Parent";
// newPropertyPosition=34;
// locations = service.getSafeRenameLocations(newPropertyClass, newPropertyName, newPropertyPosition, false, false, files[2]);
// let a=10;
// let b=6;
//# sourceMappingURL=main.js.map