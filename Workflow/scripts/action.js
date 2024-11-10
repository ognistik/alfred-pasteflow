ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];
        
    var theAction = $.getenv('theAction');
    var behavior = $.getenv('behavior');
    var thePath = $.getenv('thePath') || $.getenv('alfred_workflow_cache');
    var singleClear = $.getenv('singleClear');
    var afterSelect = $.getenv('afterSelect');
    var afterAll = $.getenv('afterAll');
    var groupClear = $.getenv('groupClear');
    var groupAfter = $.getenv('groupAfter');
    var timeout = $.getenv('timeout');
    var noTimeout = $.getenv('noTimeout');
    var pasteOrder = $.getenv('pasteOrder');

    //We prepare the variable we will return sometimes
    let theResult;

    // Prepare Notifications
    let theArg;

    // Let's Uppercase this
    let behaviorUp;
    behaviorUp = behavior.charAt(0).toUpperCase() + behavior.slice(1);

    //Those cases where the list was edited and has to be put back
    try {
        theResult = $.getenv('theResult');
    } catch (error) {
        theResult = '';
    }

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

    //If this argument to invert the grabbing order was sent
    try {
		invOrder = Number($.getenv('invOrder'));
	} catch (error) {
		invOrder = 0;
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
        theStack = [];
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
        nextItem = 1;
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
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

        //This  means theStack was edited and has to replace the one in file
        if (theAction === 'editView'){
            //We do this here to save the cleaned up array as string
            tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
            $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
        
        //If all stack items have been processed and config is set to restart,
        //we do that here... We are basically going back to the beginning.
        if (afterAll === 'restart' && nextItem > theStack.length) {
            nextItem = 1;
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
    }

    if (theAction.startsWith('add')) {
        if (theResult !== '' && theAction === 'addManual') {
            query = theResult;
        }
        //Whether the behavior is to split or not, IF we are adding to the stack we want to make query an array before we do an insert
        if (theAction === 'addSplitClip') {
            //Let's split and make this an array.
            query = query.split('\n').filter(line => line.trim());
            //Let's fix the logic of split items in for the stack, so most recent (lowest) line is at the top
            //The following also means that if invOrder is 1, then the split items should stay inverted
            if (behavior === 'stack' && invOrder === 0 || behavior === 'queue' && invOrder === 1) {
                query.reverse();
            }
        } else {
            //This will take care of multiple or single clipboard items
            //let items = query.split('✈Ͽ ').slice(1);
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
            
            //The logic of the clipboard order for `addClipRange` is already set by the formatCb script...
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

        //We convert back to string before saving
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    } else if (theAction === 'editView'){
        //This  means theStack was edited and has to replace the one in file. But let's do that at the end of this condition
        theStack = theResult;

        //This should reset nextView index to avoid issues
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());

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

        //In this case theStack was simply updated above, we just notify the user
        return JSON.stringify({
            alfredworkflow: {
                arg: 'Your ' + behavior + ' has been updated.',
                variables: {
                    theResult: ''
                }
            }
        });
    } else if (theAction === 'invert'){
        //Simple invert action, there's two more variations of this on input field ot textview_
        theStack.reverse();
        //This  means theStack was edited and has to replace the one in file

        //We convert back to string before saving
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());

        return JSON.stringify({
            alfredworkflow: {
                arg: 'Your ' + behavior + ' has been inverted.',
                variables: {
                    theResult: ''
                }
            }
        });
    } else if (theAction === 'copyClipRange' || theAction === 'pasteClipRange') {
        //let items = query.split('✈Ͽ ').slice(1);
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

        //Let's fix the logic of multiple clipboard items for the queue option, so most recent item is at the bottom
        if (invOrder === 1) {
            query.reverse();
        }

        groupAfter = groupAfter.replace(/\\n/g, '\n');
        if (groupAfter === 'comma'){
            groupAfter = ', ';
        } else if (groupAfter === 'space') {
            groupAfter = ' ';
        }

        theResult = query.join(groupAfter);

        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theResult: theResult
                }
            }
        });
    } else if (theAction === 'pasteNext' || theAction === 'copyNext') {
        //If nextItem is still above this... which means it is NOT set to restart, it will do nothing (just notify).
        if (nextItem <= theStack.length) {
            let theIndex;
            // If grabbing from the bottom, we do a calculation to get the equivalent index
            if (pasteOrder === 'recLast') {
                //But things get tricky if grabbing from the bottom and grabbing in the opposite direction
                if (invOrder === 1) {
                    if (nextItem === 1) {
                        //If processing is at the very beginning position... and want the previous item, we go to the last item,
                        //which actually is the very first (since we are grabbing from bottom index 0 is the last item).
                        theIndex = 0;
                    } else {
                        //Anywhere else this calculation will grab the correct previous item
                        theIndex = theStack.length - (nextItem - 1);
                    }
                } else {
                    //In normal processing order this grabs the equivalent next item from our recLast order
                    theIndex = theStack.length - (nextItem - 1) - 1;
                }
            } else { 
                //Normal grabbing order, but grabbing previous instead of next
                if (invOrder === 1) {
                    if (nextItem === 1) {
                        //We have to grab the last... but since Arrays start at cero
                        theIndex = theStack.length - 1;
                    } else {
                        //For anywhere in our list, grabbing previous
                        theIndex = (nextItem - 1) - 1;
                    }
                } else {
                    //The arrays index starts at 0, so we adjust that. Finally a simple one.
                    theIndex = (nextItem - 1);
                }
            }

            //We grab the corresponding item from theStack
            theResult = theStack[theIndex];

            //If config option is set to clear item after using
            if (singleClear === '1') {
                //We simply remove the index of theResult from the array...
                theStack.splice(theIndex, 1);

                //nextItem has been read as a number until now, we need it as string prior to saving
                if (invOrder === 1) {
                    //Grabbing previous doesn't move the next-item if it's on the "first" position
                    if (nextItem === 1) {
                        nextItem = (parseInt(nextItem)).toString();
                    } else {
                        //In the middle of the list, it does move down (or up, whatever that means depending the case)
                        nextItem = (parseInt(nextItem)-1).toString();
                    }
                } else {
                    //in this case the number stays the same. The items here are the ones moving
                    nextItem = (parseInt(nextItem)).toString();
                }
            } else {
                //Only if the item is not cleared, is that nextItem should increase... or decrease
                //We take this chance to make it a string
                if (invOrder === 1) {
                    //Grabbing from the bottom, and if we were at the "first" position it means we grabbed the last...
                    if (nextItem === 1) {
                        nextItem = theStack.length.toString();
                    } else {
                        //Otherwise, it's like this in the middle of the list grabbing fromt he bottom
                        nextItem = (parseInt(nextItem) - 1).toString();
                    }
                } else {
                     //Originally this was the only command. Works great for moving forward.
                    nextItem = (parseInt(nextItem) + 1).toString();
                }
            }
            
            if (Number(nextItem) > theStack.length) {
                if (theStack.length === 0) {
                    theArg = 'Your ' + behavior + ' is now empty.';
                } else if (afterAll !== 'restart'){
                    theArg = 'You are done with your ' + theStack.length + '-item ' + behavior + '.';
                } else if (theStack.length !== 1) {
                    theArg = 'You are done with your ' + theStack.length + '-item ' + behavior + '. Continue processing to restart.';
                }
            }

            //We make theStack a string prior to saving it back to its file
            theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');

            $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
            $.NSString.stringWithString(nextItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        } else {
            if (theStack.length === 0) {
                theArg = 'Your ' + behavior + ' is empty.';
            } else {
                theArg = 'You are done with your ' + theStack.length + '-item ' + behavior + '.';
            }
        }
        return JSON.stringify({
            alfredworkflow: {
                arg: theArg,
                variables: {
                    theResult: theResult
                }
            }
        });
    } else if (theAction === 'pasteStack' || theAction === 'copyStack') {

        groupAfter = groupAfter.replace(/\\n/g, '\n');
                if (groupAfter === 'comma'){
                    groupAfter = ', ';
                } else if (groupAfter === 'space') {
                    groupAfter = ' ';
                }

        if (theStack.length !== 0) {
            if (invOrder === 0) {
                theResult = theStack.join(groupAfter);
            } else {
                theResult = theStack.reverse().join(groupAfter);
            }
            if (Number(groupClear) === 1) {
                theStack = '';
                $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
                nextItem = 1;
                $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
            }
        } else {
            theArg = 'Your ' + behavior + ' is empty.';
        }
        
        return JSON.stringify({
            alfredworkflow: {
                arg: theArg,
                variables: {
                    theResult: theResult
                }
            }
        });
    } else if (theAction === 'pasteItem' || theAction === 'copyItem') {
        theResult = theStack[Number(query)];

        if (singleClear === '1') {
            theStack.splice(Number(query), 1);
            if (afterSelect === '1') {
                //Makes more sense to leave it instead of resetting
                //nextItem = 1;
            } else {
                if (pasteOrder === 'recFirst') {
                    nextItem = Number(query) + 1;
                } else {
                    nextItem = (theStack.length + 1) - Number(query);
                }
            }
        } else {
            if (afterSelect === '1') {
                //Makes more sense to leave it instead of resetting
                //nextItem = 1;
            } else {
                if (pasteOrder === 'recFirst') {
                    nextItem = Number(query) + 2;
                } else {
                    nextItem = theStack.length - Number(query) + 1;
                }
            }
        }

        if (theStack.length === 0) {
            theArg = 'Your ' + behavior + ' is now empty.';
        }

        nextItem = (parseInt(nextItem)).toString();
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');

        $.NSString.stringWithString(nextItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());

        return JSON.stringify({
            alfredworkflow: {
                arg: theArg,
                variables: {
                    theResult: theResult
                }
            }
        });
    } else if (theAction === 'resetNext') {
        //Simple
        nextItem = '1';
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');

        $.NSString.stringWithString(nextItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
        
        return JSON.stringify({
            alfredworkflow: {
                arg: 'Your next item index has been reset.',
                variables: {
                    theResult: ''
                }
            }
        });
    } else if (theAction === 'clearList') {
        //Now we clear the list
        theStack = '';
        nextItem = '1';

        //We save everything
        $.NSString.stringWithString(nextItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    
        return JSON.stringify({
            alfredworkflow: {
                arg: 'Your ' + behavior + ' has been cleared.',
                variables: {
                    theResult: ''
                }
            }
        });
    } else if (theAction === 'keepRecent' || theAction === 'keepOldest') {
        remove = theStack.length - Number(theResult)
        if (behavior === 'stack') {
            if (theAction === 'keepRecent') {
                theStack.splice(theStack.length - remove, remove);
            } else if (theAction === 'keepOldest') {
                theStack.splice(0, remove);
            }
        } else {
            if (theAction === 'keepOldest') {
                theStack.splice(theStack.length - remove, remove);
            } else if (theAction === 'keepRecent') {
                theStack.splice(0, remove);
            }
        }

        //Now we 'flatten' these variables before saving as strings.
        nextItem = '1';
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');

        //We save everything
        $.NSString.stringWithString(nextItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(theStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    
        return JSON.stringify({
            alfredworkflow: {
                arg: 'Your ' + behavior + ' items have been trimmed.',
                variables: {
                    theResult: ''
                }
            }
        });
    }
}