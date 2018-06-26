private editScriptAndUpdateMarkers(fileName: string, editStart: number, editEnd: number, newText: string) {
    this.languageServiceAdapterHost.editScript(fileName, editStart, editEnd, newText);
    for (const marker of this.testData.markers) {
        if (marker.fileName === fileName) {
            marker.position = updatePosition(marker.position);
        }
    }

    for (const range of this.testData.ranges) {
        if (range.fileName === fileName) {
            range.pos = updatePosition(range.pos);
            range.end = updatePosition(range.end);
        }
    }

    function updatePosition(position: number) {
        if (position > editStart) {
            if (position < editEnd) {
                // Inside the edit - mark it as invalidated (?)
                return -1;
            }
            else {
                // Move marker back/forward by the appropriate amount
                return position + (editStart - editEnd) + newText.length;
            }
        }
        else {
            return position;
        }
    }
}