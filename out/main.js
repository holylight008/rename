"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var fs = require("fs");
var RenameService_1 = require("./RenameService");
var options = ts.getDefaultCompilerOptions();
options.outDir = process.cwd() + "/testout";
var testFolderpath = "E:/projects/transformer/test";
var files = fs.readdirSync(testFolderpath);
for (var i = 0; i < files.length; i++) {
    files[i] = "E:/projects/transformer/test/" + files[i];
}
var renameService = new RenameService_1.RenameService(files, options, false, true);
var result = renameService.compilingWithWatch();
var b = 10;
//# sourceMappingURL=main.js.map