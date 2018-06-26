import { Host } from "./Host";
import * as fs from "fs"
import * as ts from "typescript"
import { RenameService } from "./RenameService";
import { DataCollect } from "./DataCollect";

let testFolderpath = "E:/projects/safeRename/test";
let files = fs.readdirSync(testFolderpath);
for (let i = 0; i < files.length; i++) {
    files[i] = "E:/projects/safeRename/test/" + files[i];
}

let options = ts.getDefaultCompilerOptions();
let host: Host = new Host(options, files);
host.startLanguageService();

let collector=new DataCollect();
collector.getClassData(files,options);

let service = new RenameService(host,collector);
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