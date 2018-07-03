export class FileRecorder{
    fileToClass:Map<string,classRecorder[]>=new Map();
}
export class classRecorder{
    classToProperty:Map<string,PropertyRecorder[]>=new Map();
}
export class PropertyRecorder{
    oldToNewname:Map<string,string>=new Map();
}
