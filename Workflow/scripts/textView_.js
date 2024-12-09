#!/usr/bin/osascript

ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];

    var theAction = $.getenv('theAction');
    var behavior = $.getenv('behavior');
    var thePath = $.getenv('thePath') || $.getenv('alfred_workflow_cache');
    var afterAll = $.getenv('afterAll');
    var timeout = $.getenv('timeout');
    var noTimeout = $.getenv('noTimeout');
    var pasteOrder = $.getenv('pasteOrder');

    //Those cases where the stack has to be reset
    try {
        clearStack = $.getenv('clearStack');
    } catch (error) {
        clearStack = '0';
    }

    //Those cases where the user wants to add to the stack in the "next" position ALWAYS.
    try {
        addNext = Number($.getenv('addNext'));
    } catch (error) {
        addNext = 0;
    }

    // Let's Uppercase this
    let behaviorUp;
    behaviorUp = behavior.charAt(0).toUpperCase() + behavior.slice(1);

    //Those cases where the list was edited and has to be put back and viewed
    try {
        theResult = $.getenv('theResult');
    } catch (error) {
        theResult = '';
    }

    var fm = $.NSFileManager.defaultManager;

    // Make Cache directory if none exists
    if (!fm.fileExistsAtPath(thePath)) {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(thePath), true, $(), $());
    }

    var theStackPath = thePath + '/flowList.txt';
    var nextItemPath = thePath + '/nextItem.txt';

    //Make empty stack if none exists
    if (!fm.fileExistsAtPath(theStackPath)) {
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    var nextItem = 1;
    if (!fm.fileExistsAtPath(nextItemPath)) {
        //If nextItem file doesn't exist, create it with 1.
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
    } else {
        //Otherwise, read the value in nextItem as number.
        nextItem = parseInt($.NSString.stringWithContentsOfFileEncodingError(nextItemPath, $.NSUTF8StringEncoding, null).js, 10);
        //This can only happen accidentally. That the contents of nextItem have been wiped out.
        if (isNaN(nextItem)) {
            nextItem = 1;
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
    }
    
    //Assign the contents of theStack to variable
    theStack = $.NSString.stringWithContentsOfFileEncodingError(theStackPath, $.NSUTF8StringEncoding, null).js;

    //If theStack is not empty & noTimeout is deselected, check last modification of theStack and clear if necessary.
    if (theStack && noTimeout === '0') {
        var attrs = fm.attributesOfItemAtPathError($(theStackPath), $());
        var lastModified = attrs.objectForKey('NSFileModificationDate').js.getTime();
        var now = new Date().getTime();
        if ((now - lastModified) / 1000 > parseInt(timeout, 10) * 60) {
            theStack = '';
            $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
            nextItem = 1;
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
    }

    //If theStack is not empty and user wants to reset the stack before new content, we do that.
    if (theStack && clearStack === '1') {
        theStack = '';
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
        nextItem = 1;
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
    } else if (theAction === 'VeditView'){
        //This  means theStack was edited (V for View) and has to replace the one in file. But let's do that at the end of this condition
        theStack = theResult;

        //This should reset nextView index to avoid issues
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        
        //Let's change theAction to display this
        theAction = 'viewStack';

        //Now we prepare our array
        if (theStack !== '') {
            let rawQuery = theStack;
            theStack = [];

            // Split the rawQuery into lines
            let lines = rawQuery.split('\n');
            let currentItem = '';
            
            for (let line of lines) {
                if (line.startsWith('✈Ͽ ')) {
                    if (currentItem) {
                        theStack.push(currentItem.trim());
                    }
                    currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
                } else {
                    currentItem += '\n' + line;
                }
            }

            // Add the last item
            if (currentItem) {
                theStack.push(currentItem.trim());
            }
        } else {
            theStack = [];
        }

        //Now that we have cleaned up trailing empty line breaks, we save in file
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());


    } else if (theAction === 'VaddManual') {
        //In this case we are ADDING query to the Stack... and it comes from the Text View in theResult variable.
        query = theResult;

        //Let's change theAction to display this
        theAction = 'viewStack';

        //Now we prepare our array
        if (theStack !== '') {
            let rawQuery = theStack;
            theStack = [];

            // Split the rawQuery into lines
            let lines = rawQuery.split('\n');
            let currentItem = '';
            
            for (let line of lines) {
                if (line.startsWith('✈Ͽ ')) {
                    if (currentItem) {
                        theStack.push(currentItem.trim());
                    }
                    currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
                } else {
                    currentItem += '\n' + line;
                }
            }

            // Add the last item
            if (currentItem) {
                theStack.push(currentItem.trim());
            }
        } else {
            theStack = [];
        }

        //This Now we prepare the items that will be added
        if (query !== '') {
            let rawQuery = query;
            query = [];

            // Split the rawQuery into lines
            let lines = rawQuery.split('\n');
            let currentItem = '';
            
            for (let line of lines) {
                if (line.startsWith('✈Ͽ ')) {
                    if (currentItem) {
                        query.push(currentItem.trim());
                    }
                    currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
                } else {
                    currentItem += '\n' + line;
                }
            }

            // Add the last item
            if (currentItem) {
                query.push(currentItem.trim());
            }
        } else {
            query = [];
        }

        //For the stack, new items should go either at the "next" position if grabbing from the top, or at the very top (the most recent) position otherwise (user expects oldest first)
        if (behavior === 'stack') {
            if (pasteOrder === 'recFirst' ) {
                theStack.splice(nextItem - 1, 0, ...query);
            } else if (pasteOrder === 'recLast' && addNext === 1) {
                //This is a "secret" action option for single items only... for now. Force insert at next position.
                //We reverse for the nextItem count to make sense... counting from back to front
                theStack.reverse();
                //The problem is that when splitting, for the queue behavior (or in this case, grabbing from bottom of stack) the Split items are already in the correct order
                //And when I invert theStack again a few lines below, this will get inverted too, so we fix here...
                if (theAction === 'addSplitClip') {
                    query.reverse ();
                }
                //This counts the nextItem from the end to the front (since it's inverted)
                theStack.splice(nextItem - 1, 0, ...query);
                //We invert back
                theStack.reverse();
            } else {
                //grabbing from the bottom user expects the oldest first... so new items should go at the very top, which is the opposite, always
                theStack.unshift(...query);
            }
        } else {
            //For the queue, new items should go at the "next" position if grabbing from the bottom (most recent)
            if (pasteOrder === 'recLast' ) {
                //We reverse for the nextItem count to make sense... counting from back to front
                theStack.reverse();
                //The problem is that when splitting, for the queue behavior the Split items are already in the correct order
                //And when I invert theStack again a few lines below, this will get inverted too, so we fix here...
                if (theAction === 'addSplitClip') {
                    query.reverse ();
                }
                //This counts the nextItem from the end to the front (since it's inverted)
                theStack.splice(nextItem - 1, 0, ...query);
                //We invert back
                theStack.reverse();
            } else if (pasteOrder == 'recFirst' && addNext == 1) {
                //I copy this one from the stack nextItem behavior... which is the same for this case. Again, this is a "secret" action for single items only.
                theStack.splice(nextItem - 1, 0, ...query);
            } else {
                //or top position (user expects not to see until end)
                theStack.push(...query);
            }  
        }

        //Now that we have cleaned up trailing empty line breaks, we save in file
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());

    } else if (theAction === 'Vinvert'){
        //This  means theStack needs to be inverted, saved, and then showed...
        //So we prepare our array
        //let items = theStack.split('✈Ͽ ').slice(1);
        if (theStack !== '') {
            let rawQuery = theStack;
            theStack = [];

            // Split the rawQuery into lines
            let lines = rawQuery.split('\n');
            let currentItem = '';
            
            for (let line of lines) {
                if (line.startsWith('✈Ͽ ')) {
                    if (currentItem) {
                        theStack.push(currentItem.trim());
                    }
                    currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
                } else {
                    currentItem += '\n' + line;
                }
            }

            // Add the last item
            if (currentItem) {
                theStack.push(currentItem.trim());
            }
        } else {
            theStack = [];
        }

        //Now we reverse it
        theStack.reverse();

        //We save back into our file with a temp variable... while also resetting nextItem
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());

        //Let's change theAction to display this
        theAction = 'viewStack';
    } else {
        //Otherwise, we split theStack and place it back in theStack as an array
        //let items = theStack.split('✈Ͽ ').slice(1);
        if (theStack !== '') {
            let rawQuery = theStack;
            theStack = [];

            // Split the rawQuery into lines
            let lines = rawQuery.split('\n');
            let currentItem = '';
            
            for (let line of lines) {
                if (line.startsWith('✈Ͽ ')) {
                    if (currentItem) {
                        theStack.push(currentItem.trim());
                    }
                    currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
                } else {
                    currentItem += '\n' + line;
                }
            }

            // Add the last item
            if (currentItem) {
                theStack.push(currentItem.trim());
            }
        } else {
            theStack = [];
        }
        
        //If all stack items have been processed and config is set to restart,
        //we do that here... We are basically going back to the beginning.
        if (afterAll === 'restart' && nextItem > theStack.length) {
            nextItem = 1;
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
    }

    //Now we process the actions
    if (theAction === 'viewStack') {
        itemCount = theStack.length;
        theStack = theStack.map((item, index) => {
            let processedItem = item;
            
            if (item.startsWith('✈Ͽ ')) {
                if (item.includes('::')) {
                    const colonIndex = item.indexOf('::');
                    const pathSection = item.substring(3, colonIndex).trim();
                    const textAfterColon = item.substring(colonIndex + 2).trim();
                    
                    // Check for quoted paths before ::
                    const quotedPaths = pathSection.match(/"[^"]+"/g) || [];
                    
                    if (quotedPaths.length > 0) {
                        // Check if paths are images
                        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
                        const paths = quotedPaths.map(p => p.replace(/"/g, ''));
                        
                        const isImage = paths.some(path => imageExtensions.test(path));
                        
                        if (isImage) {
                            // Convert image paths to markdown and add text below
                            const imageMarkdown = paths
                                .filter(path => imageExtensions.test(path))
                                .map(path => `![](${path})`)
                                .join('\n');
                            processedItem = `${imageMarkdown}\n\n${textAfterColon}`;
                        } else {
                            processedItem = textAfterColon;
                        }
                    } else {
                        processedItem = textAfterColon;
                    }
                } else if (item.includes(';;')) {
                    const semicolonIndex = item.indexOf(';;');
                    processedItem = item.substring(semicolonIndex + 2).trim();
                }
            }
            
            return `## Item ${index + 1}\n${processedItem}\n`;
        }).join('\n---\n');
        
        return JSON.stringify({
            variables: {},
            response: '# PasteFlow • ' + itemCount + (itemCount === 1 ? ' Item' : ' Items') + '\n---\n' + theStack + '\n---',
            footer: "↩ • Close • ⌘↩ Merge & Copy • ⌘⌥↩ Merge & Paste • ⌥↩ Edit • ⌘⌃↩ Clear Contents • ⇧↩ Invert Contents",
        });
    }
}