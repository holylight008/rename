/**
         * @returns The number of characters added to the file as a result of the edits.
         * May be negative.
         */
        private applyEdits(fileName: string, edits: ts.TextChange[], isFormattingEdit: boolean): number {
    // We get back a set of edits, but langSvc.editScript only accepts one at a time. Use this to keep track
    // of the incremental offset from each edit to the next. We assume these edit ranges don't overlap
    // Copy this so we don't ruin someone else's copy
    edits = JSON.parse(JSON.stringify(edits));

    // Get a snapshot of the content of the file so we can make sure any formatting edits didn't destroy non-whitespace characters
    const oldContent = this.getFileContent(fileName);
    let runningOffset = 0;

    for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        const offsetStart = edit.span.start;
        const offsetEnd = offsetStart + edit.span.length;
        this.editScriptAndUpdateMarkers(fileName, offsetStart, offsetEnd, edit.newText);
        const editDelta = edit.newText.length - edit.span.length;
        if (offsetStart <= this.currentCaretPosition) {
            if (offsetEnd <= this.currentCaretPosition) {
                // The entirety of the edit span falls before the caret position, shift the caret accordingly
                this.currentCaretPosition += editDelta;
            }
            else {
                // The span being replaced includes the caret position, place the caret at the beginning of the span
                this.currentCaretPosition = offsetStart;
            }
        }
        runningOffset += editDelta;

        // Update positions of any future edits affected by this change
        for (let j = i + 1; j < edits.length; j++) {
            if (edits[j].span.start >= edits[i].span.start) {
                edits[j].span.start += editDelta;
            }
        }
    }

    if (isFormattingEdit) {
        const newContent = this.getFileContent(fileName);

        if (this.removeWhitespace(newContent) !== this.removeWhitespace(oldContent)) {
            this.raiseError("Formatting operation destroyed non-whitespace content");
        }
    }

    return runningOffset;
}

