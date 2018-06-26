function runFourSlashTestContent(basePath: string, testType: FourSlashTestType, content: string, fileName: string): void {
    // Give file paths an absolute path for the virtual file system
    const absoluteBasePath = ts.combinePaths(Harness.virtualFileSystemRoot, basePath);
    const absoluteFileName = ts.combinePaths(Harness.virtualFileSystemRoot, fileName);

    // Parse out the files and their metadata
    const testData = parseTestData(absoluteBasePath, content, absoluteFileName);
    const state = new TestState(absoluteBasePath, testType, testData);
    const output = ts.transpileModule(content, { reportDiagnostics: true });
    if (output.diagnostics.length > 0) {
        throw new Error(`Syntax error in ${absoluteBasePath}: ${output.diagnostics[0].messageText}`);
    }
    runCode(output.outputText, state);
}