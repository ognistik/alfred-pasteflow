function run(argv) {
    ObjC.import('AppKit');
    ObjC.import('stdlib');
    ObjC.import('Foundation');

    var theAction = $.getenv('theAction');
    var theResult = '';
    var paths = [];
    var rawFile = [];
    var groupClear = $.getenv('groupClear');
    var thePath = $.getenv('thePath') || $.getenv('alfred_workflow_cache');
    var rawCBPath = thePath + '/cbData';

    //This will allow us to move items later... or do shell scripts
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;

    try {
        theResult = $.getenv('theResult');
    } catch (error) {
        return;
    }

    if (!theResult) {
        return;
    }

    // Handle multi-line cases for specific actions
    if (theAction === 'copyClipRange' || theAction === 'pasteClipRange' || theAction === 'pasteStack' || theAction === 'copyStack') {
        const lines = theResult.split('\n');
        let hasFileFormat = false;
        let hasRawFormat = false;
        let hasPlainFormat = false;

        // Check for mixed content
        lines.forEach(line => {
            if (line.startsWith('✈Ͽ ') && line.includes('::')) {
                hasFileFormat = true;
            } else if (line.startsWith('✈Ͽ ') && line.includes(';;')) {
                hasRawFormat = true;    
            } else {
                hasPlainFormat = true;
            }
        });

        // Return error if multiple formats detected
        if ((hasFileFormat && hasRawFormat) || 
        (hasFileFormat && hasPlainFormat) || 
        (hasRawFormat && hasPlainFormat)) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theResult: '',
                        notification: 'It\'s not possible to process mixed content.'
                    }
                }
            });
        }

        if (hasFileFormat) {
            // Extract File paths from each line
            lines.forEach(line => {
                // Check if line starts with ✈Ͽ and contains ::
                if (line.startsWith('✈Ͽ') && line.includes('::')) {
                    // Get the part between ✈Ͽ and ::
                    const pathSection = line.substring(2, line.indexOf('::')).trim();
                    
                    // Extract paths between quotes using regex
                    const quotedPaths = pathSection.match(/"([^"]*)"/g);
                    
                    if (quotedPaths) {
                        // Process each path
                        const processedPaths = quotedPaths.map(quotedPath => {
                            const filePath = quotedPath.replace(/"/g, '');
                            
                            // Only move files to tmp if copyStack action and groupClear is enabled
                            if (theAction === 'copyStack' && groupClear === '1' && filePath.startsWith(rawCBPath)) {
                                const fileName = filePath.split('/').pop();
                                const tmpPath = `/tmp/${fileName}`;
                                
                                // Move file to tmp folder
                                app.doShellScript(`mv "${filePath}" "${tmpPath}"`);
                                
                                return tmpPath;
                            }
                            
                            // Return original path if conditions not met
                            return filePath;
                        });
                        
                        paths.push(...processedPaths);
                    }
                }
            });
        }
    } else {
        // Handle single item case for Files
        if (theResult.startsWith('✈Ͽ ') && theResult.includes('::')) {
            // Get the part between ✈Ͽ and ::
            const pathSection = theResult.substring(2, theResult.indexOf('::')).trim();
            
            // Extract paths between quotes using regex
            const quotedPaths = pathSection.match(/"([^"]*)"/g);
            
            if (quotedPaths) {
                // Remove quotes and add to paths array
                paths.push(...quotedPaths.map(path => path.replace(/"/g, '')));
            }
        } else if (theResult.startsWith('✈Ͽ ') && 
        theResult.includes(';;')) {
            const start = theResult.indexOf('"') + 1;
            const end = theResult.indexOf('"', start);
            if (start > 0 && end > start) {
                rawFile.push(theResult.substring(start, end));
            }
        } else {
            return;
        }
    }

    if (paths.length > 0) {
        quotedPaths = paths.map(path => `"${path}"`).join(' ');

        theAction = 'isFile' + theAction;
        
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    thePaths: quotedPaths,
                    theAction: theAction
                }
            }
        });
    } else if (rawFile.length > 0) {
        quotedPaths = rawFile[0];

        theAction = 'isRaw' + theAction;
        
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    thePaths: quotedPaths,
                    theAction: theAction
                }
            }
        });
    }
}