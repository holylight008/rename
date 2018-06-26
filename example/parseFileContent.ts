function parseFileContent(content: string, fileName: string, markerMap: ts.Map<Marker>, markers: Marker[], ranges: Range[]): FourSlashFile {
    content = chompLeadingSpace(content);

    // Any slash-star comment with a character not in this string is not a marker.
    const validMarkerChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$1234567890_";

    /// The file content (minus metacharacters) so far
    let output = "";

    /// The current marker (or maybe multi-line comment?) we're parsing, possibly
    let openMarker: LocationInformation;

    /// A stack of the open range markers that are still unclosed
    const openRanges: RangeLocationInformation[] = [];

    /// A list of ranges we've collected so far */
    let localRanges: Range[] = [];

    /// The latest position of the start of an unflushed plain text area
    let lastNormalCharPosition = 0;

    /// The total number of metacharacters removed from the file (so far)
    let difference = 0;

    /// The fourslash file state object we are generating
    let state: State = State.none;

    /// Current position data
    let line = 1;
    let column = 1;

    const flush = (lastSafeCharIndex: number) => {
        output = output + content.substr(lastNormalCharPosition, lastSafeCharIndex === undefined ? undefined : lastSafeCharIndex - lastNormalCharPosition);
    };

    if (content.length > 0) {
        let previousChar = content.charAt(0);
        for (let i = 1; i < content.length; i++) {
            const currentChar = content.charAt(i);
            switch (state) {
                case State.none:
                    if (previousChar === "[" && currentChar === "|") {
                        // found a range start
                        openRanges.push({
                            position: (i - 1) - difference,
                            sourcePosition: i - 1,
                            sourceLine: line,
                            sourceColumn: column,
                        });
                        // copy all text up to marker position
                        flush(i - 1);
                        lastNormalCharPosition = i + 1;
                        difference += 2;
                    }
                    else if (previousChar === "|" && currentChar === "]") {
                        // found a range end
                        const rangeStart = openRanges.pop();
                        if (!rangeStart) {
                            reportError(fileName, line, column, "Found range end with no matching start.");
                        }

                        const range: Range = {
                            fileName,
                            pos: rangeStart.position,
                            end: (i - 1) - difference,
                            marker: rangeStart.marker
                        };
                        localRanges.push(range);

                        // copy all text up to range marker position
                        flush(i - 1);
                        lastNormalCharPosition = i + 1;
                        difference += 2;
                    }
                    else if (previousChar === "/" && currentChar === "*") {
                        // found a possible marker start
                        state = State.inSlashStarMarker;
                        openMarker = {
                            position: (i - 1) - difference,
                            sourcePosition: i - 1,
                            sourceLine: line,
                            sourceColumn: column,
                        };
                    }
                    else if (previousChar === "{" && currentChar === "|") {
                        // found an object marker start
                        state = State.inObjectMarker;
                        openMarker = {
                            position: (i - 1) - difference,
                            sourcePosition: i - 1,
                            sourceLine: line,
                            sourceColumn: column,
                        };
                        flush(i - 1);
                    }
                    break;

                case State.inObjectMarker:
                    // Object markers are only ever terminated by |} and have no content restrictions
                    if (previousChar === "|" && currentChar === "}") {
                        // Record the marker
                        const objectMarkerNameText = content.substring(openMarker.sourcePosition + 2, i - 1).trim();
                        const marker = recordObjectMarker(fileName, openMarker, objectMarkerNameText, markerMap, markers);

                        if (openRanges.length > 0) {
                            openRanges[openRanges.length - 1].marker = marker;
                        }

                        // Set the current start to point to the end of the current marker to ignore its text
                        lastNormalCharPosition = i + 1;
                        difference += i + 1 - openMarker.sourcePosition;

                        // Reset the state
                        openMarker = undefined;
                        state = State.none;
                    }
                    break;

                case State.inSlashStarMarker:
                    if (previousChar === "*" && currentChar === "/") {
                        // Record the marker
                        // start + 2 to ignore the */, -1 on the end to ignore the * (/ is next)
                        const markerNameText = content.substring(openMarker.sourcePosition + 2, i - 1).trim();
                        const marker = recordMarker(fileName, openMarker, markerNameText, markerMap, markers);

                        if (openRanges.length > 0) {
                            openRanges[openRanges.length - 1].marker = marker;
                        }

                        // Set the current start to point to the end of the current marker to ignore its text
                        flush(openMarker.sourcePosition);
                        lastNormalCharPosition = i + 1;
                        difference += i + 1 - openMarker.sourcePosition;

                        // Reset the state
                        openMarker = undefined;
                        state = State.none;
                    }
                    else if (validMarkerChars.indexOf(currentChar) < 0) {
                        if (currentChar === "*" && i < content.length - 1 && content.charAt(i + 1) === "/") {
                            // The marker is about to be closed, ignore the 'invalid' char
                        }
                        else {
                            // We've hit a non-valid marker character, so we were actually in a block comment
                            // Bail out the text we've gathered so far back into the output
                            flush(i);
                            lastNormalCharPosition = i;
                            openMarker = undefined;

                            state = State.none;
                        }
                    }
                    break;
            }

            if (currentChar === "\n" && previousChar === "\r") {
                // Ignore trailing \n after a \r
                continue;
            }
            else if (currentChar === "\n" || currentChar === "\r") {
                line++;
                column = 1;
                continue;
            }

            column++;
            previousChar = currentChar;
        }
    }

    // Add the remaining text
    flush(/*lastSafeCharIndex*/ undefined);

    if (openRanges.length > 0) {
        const openRange = openRanges[0];
        reportError(fileName, openRange.sourceLine, openRange.sourceColumn, "Unterminated range.");
    }

    if (openMarker) {
        reportError(fileName, openMarker.sourceLine, openMarker.sourceColumn, "Unterminated marker.");
    }

    // put ranges in the correct order
    localRanges = localRanges.sort((a, b) => a.pos < b.pos ? -1 : 1);
    localRanges.forEach((r) => { ranges.push(r); });

    return {
        content: output,
        fileOptions: {},
        version: 0,
        fileName,
    };
}