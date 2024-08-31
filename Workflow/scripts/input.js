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
    var afterSelect = $.getenv('afterSelect');
    
    try {
		invOrder = Number($.getenv('invOrder'));
	} catch (error) {
		invOrder = 0;
	}

    //Those cases where an item was edited outside and has to be put back in theStack
    try {
		theIndex = Number($.getenv('theIndex'));
	} catch (error) {
		theIndex = 0;
	}

    //Those cases where the stack has to be reset
    try {
        clearStack = $.getenv('clearStack');
    } catch (error) {
        clearStack = '0';
    }

    //This variable, like the one before, indicates the results of the edit
    try {
		theResult = $.getenv('theResult');
	} catch (error) {
		theResult = '';
	}

    //Those cases where the user wants to add to the stack in the "next" position forced.
    try {
        addNext = Number($.getenv('addNext'));
    } catch (error) {
        addNext = 0;
    }
    
    var fm = $.NSFileManager.defaultManager;

    // Let's Uppercase this
    let behaviorUp;
    behaviorUp = behavior.charAt(0).toUpperCase() + behavior.slice(1);

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
        //We reset this, which has already been processed.
        clearStack = '0';
    } else {
        //Otherwise, we split theStack and place it back in theStack as an array
        //let items = theStack.split('✈Ͽ ').slice(1);
        let items = theStack.match(/^✈Ͽ .+(?:\n(?!✈Ͽ ).+)*/gm);
        if (items) {
            items = items.map(item => item.replace(/^✈Ͽ /, ''));
        } else {
            items = []; // or handle as needed
        }
        theStack = items.map(item => item.trim());
        
        //If all stack items have been processed and config is set to restart,
        //we do that here... We are basically going back to the beginning.
        if (afterAll === 'restart' && nextItem > theStack.length) {
            nextItem = 1;
            $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        }
    }

    //Before preparing the items, we have to edit or clear anything we edited outside
    //Let's start with edits of items
    if (theAction.startsWith("Iedit")) {
        //First we clear this for it to still display the items next
        theAction = theAction.slice(5);

        //Now we replace the index with the edited version
        theStack[theIndex] = theResult;

        //We save back into our file with a temp variable
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Edits of the entire list
    if (theAction.startsWith("Ledit")) {
        //First we clear this for it to still display the items next
        theAction = theAction.slice(5);

        //Now we replace the entire stack with the edited version
        theStack = theResult;
        //We have to make it an array again
        //let items = theStack.split('✈Ͽ ').slice(1);
        let items = theStack.match(/^✈Ͽ .+(?:\n(?!✈Ͽ ).+)*/gm);
        if (items) {
            items = items.map(item => item.replace(/^✈Ͽ /, ''));
        } else {
            items = []; // or handle as needed
        }
        theStack = items.map(item => item.trim());

        //We save back into our file with a temp variable
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Now let's clear Items
    if (theAction.startsWith("inputClearItem")) {
        //First we clear this for it to still display the items next
        theAction = theAction.slice(14);

        //Now we remove the item
        theStack.splice(theIndex, 1);

        //We prepare the nextItem
        if (afterSelect === '1') {
            nextItem = 1;
        } else {
            if (pasteOrder === 'recFirst') {
                nextItem = theIndex + 1;
            } else {
                nextItem = (theStack.length + 1) - theIndex;
            }
        }

    //We save back into our files with temp variables
        tempItem = (parseInt(nextItem)).toString();
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Now let's move up or down
    if (theAction.startsWith("inputMove")) {
        
        //First move up
        if (theAction.startsWith("inputMoveU")){
            if (theIndex === 0) {
                const theItem = theStack.shift();
                theStack.push(theItem);
            } else {
                const theItem = theStack.splice(theIndex, 1)[0];
                theStack.splice(theIndex - 1, 0, theItem);
            }
        } else {
            //Now move down
            if (theIndex === theStack.length - 1) {
                const theItem = theStack.pop();
                theStack.unshift(theItem);
            } else {
                const theItem = theStack.splice(theIndex, 1)[0];
                theStack.splice(theIndex + 1, 0, theItem);
              }
        }

        //Now we set the nextItem
        if (afterSelect === '1') {
            nextItem = 1;
        } else {
            if (theAction.startsWith("inputMoveU")){
                if (pasteOrder === 'recFirst') {
                    nextItem = theIndex + 1;
                } else {
                    nextItem = (theStack.length + 2) - theIndex;
                    if (nextItem > (theStack.length + 1)) {
                        nextItem = 2;
                    }
                }
            } else {
                if (pasteOrder === 'recFirst') {
                    nextItem = theIndex + 3;
                    if (nextItem > (theStack.length + 1)) {
                        nextItem = 2;
                    }
                } else {
                    nextItem = theStack.length - theIndex;
                }
            }
        }

        //We clean up theAction so it can be processed next
        theAction = theAction.slice(10);

    //We save back into our files with temp variables
        tempItem = (parseInt(nextItem)).toString();
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    if (theAction.startsWith("inputInvert")) {
        //We clean up theAction so it can be processed next
         theAction = theAction.slice(11);

         theStack.reverse();
         nextItem = 1;

        //We save back into our file with a temp variable
        tempItem = (parseInt(nextItem)).toString();
        tempStack = theStack.map(item => `✈Ͽ ${item}`).join('\n');
        $.NSString.stringWithString(tempItem).writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        $.NSString.stringWithString(tempStack).writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Prepares empty variable for items to be displayed to user
    var items = [];

    if (theAction === 'inputAddClipRange') {
        if (!isNaN(query) && Number(query) > 0) {
            items.push({
                type: 'default',
                title: 'Add \"' + query + '\" Recent Clipboard Items to Your' + (theStack.length ? ' ' + behaviorUp : ' New ' + behaviorUp),
                subtitle: (addNext === 1 ? '"Next" Position Forced | ' : '') + '⌘↩ Clear ' + behaviorUp + ' Before Adding' + (addNext === 1 ? '' : ' • ⌃↩ Insert in "Next" Position'),
                variables: { theItems: query, theAction: '!addClipRange' },
                mods: { 'cmd': {valid: true, variables: {theItems: query, theAction: '!addClipRange', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' before adding.'},
                        'ctrl': {valid: true, variables: {theItems: query, theAction: '!addClipRange', addNext: '1'}, subtitle: 'Force insertion in "next" position.'}}
            });
        } else {
            items.push({
                valid: false,
                type: 'default',
                title: 'Please Insert a Number',
                subtitle: (addNext === 1 ? '"Next" Position Forced | ' : '') + '⌘↩ Clear ' + behaviorUp + ' Before Adding' + (addNext === 1 ? '' : ' • ⌃↩ Insert in "Next" Position'),
            });
        }
    }

    if (theAction === 'inputKeep') {
        if (theStack.length > 1 && Number(query) < theStack.length && Number(query) !== 0) {
            if (!isNaN(query)) {
                items.push({
                    type: 'default',
                    title: 'Keep Only \"' + query + '\" Items',
                    subtitle: 'The oldest' + ((theStack.length - Number(query)) > 1 ? ' ' + (theStack.length - Number(query)) + ' items' : ' item') + ' will be removed from the ' + (behavior === 'stack' ? 'bottom of your ' : 'top of your ') + behavior + '. | ⌘↩ Invert',
                    variables: { theResult: query, theAction: 'keepRecent' },
                    mods: { 'cmd': {valid: true, variables: {theResult: query, theAction: 'keepOldest'},
                        subtitle: 'The most recent' + ((theStack.length - Number(query)) > 1 ? ' ' + (theStack.length - Number(query)) + ' items' : ' item') + ' will be removed from the ' + (behavior === 'stack' ? 'top of your ' : 'bottom of your ') + behavior + '.'}}
                });
            } else {
                items.push({
                    valid: false,
                    type: 'default',
                    title: 'Please Insert a Number',
                    subtitle: 'Select X number of items to keep.',
                });
            }
        } else if (theStack.length === 0) {
            items.push({
                valid: false,
                type: 'default',
                title: 'Your ' + behaviorUp + ' is Empty',
                subtitle: 'Add items to use this feature.',
            });
        } else if (theStack.length === 1) {
            items.push({
                valid: false,
                type: 'default',
                title: 'There is Only 1 Item',
                subtitle: 'You need more than one item in your paste ' + behavior + ' to use this feature.',
            });
        } else if (Number(query) >= theStack.length) {
            items.push({
                valid: false,
                type: 'default',
                title: 'Enter a Number Below Your Amount of Items',
                subtitle: 'Your paste ' + behavior + ' has ' + theStack.length + ' items.',
            });
        } else if (Number(query) === 0) {
            items.push({
                valid: false,
                type: 'default',
                title: 'Please Insert a Number',
                subtitle: 'Select X number of items to keep.',
            });
        }
    }

    if (theAction === 'inputPasteClipRange' || theAction === 'inputCopyClipRange') {
        if (!isNaN(query) && Number(query) > 0) {
            items.push({
                type: 'default',
                title: 'Process \"' + query + '\" Clipboard Items',
                subtitle: (theAction === 'inputPasteClipRange' ? 'Paste ' : 'Copy ') + 'from your CB. ' + 
                ((behavior === 'stack' ? (invOrder === 0 ? 'Recent at the top.' : 'Recent at the bottom.') : (invOrder === 0 ? 'Recent at the bottom.' : 'Recent at the top.'))) + ' | ⌘↩ '+ (theAction === 'inputPasteClipRange' ? 'Copy • ' : 'Paste • ') + '⌥↩ Inverted • ⌘⌥↩ ' + (theAction === 'inputPasteClipRange' ? 'Copy Inverted' : 'Paste Inverted'),
                variables: { theItems: query, theAction: theAction === 'inputPasteClipRange' ? '!pasteClipRange' : '!copyClipRange' },
                mods: {
                    cmd: {
                        subtitle: (theAction === 'inputPasteClipRange' ? 'Copy ' : 'Paste ') + 'from your CB. ' + 
                        (behavior === 'stack' ? (invOrder === 0 ? 'Recent at the top.' : 'Recent at the bottom.') : (invOrder === 0 ? 'Recent at the bottom.' : 'Recent at the top.')),
                        variables: { theItems: query, theAction: theAction === 'inputPasteClipRange' ? '!copyClipRange' : '!pasteClipRange' }
                    },
                    alt: {
                        subtitle: (theAction === 'inputPasteClipRange' ? 'Paste ' : 'Copy ') + 'from your CB. ' + 
                        (behavior === 'stack' ? (invOrder === 0 ? 'Recent at the bottom.' : 'Recent at the top.') : (invOrder === 0 ? 'Recent at the top.' : 'Recent at the bottom.')),
                        variables: { theItems: query, theAction: theAction === 'inputPasteClipRange' ? '!pasteClipRange' : '!copyClipRange', invOrder: invOrder === 0 ? '1' : '0' }
                    },
                    'cmd+alt': {
                        subtitle: (theAction === 'inputPasteClipRange' ? 'Copy ' : 'Paste ') + 'from your CB. ' + 
                        (behavior === 'stack' ? (invOrder === 0 ? 'Recent at the bottom.' : 'Recent at the top.') : (invOrder === 0 ? 'Recent at the top.' : 'Recent at the bottom.')),
                        variables: { theItems: query, theAction: theAction === 'inputPasteClipRange' ? '!copyClipRange' : '!pasteClipRange', invOrder: invOrder === 0 ? '1' : '0' }
                    }
                }
            });
        } else {
            items.push({
                valid: false,
                type: 'default',
                title: 'Please Insert a Number',
                subtitle: 'Select X number of clipboard items.',
            });
        }
    }

    if (theAction === 'inputPasteItem' || theAction === 'inputCopyItem') {
        //I need to prepare this to "mark" or identify nextItem
        let theIndex;
        // If grabbing from the bottom, we do a calculation to get the equivalent index
        if (pasteOrder === 'recLast') {
            theIndex = theStack.length - (nextItem - 1) - 1;
        } else {
            //The arrays index starts at 0, so we adjust that.
            theIndex = (nextItem - 1);
        }

        if (theStack.length === 0) {
            items.push({
                valid: false,
                type: 'default',
                title: 'Your ' + behaviorUp + ' is Empty',
                subtitle: '',
            });
        } else {
            theStack.forEach((item, index) => {
                let itemObject = {
                    type: 'default',
                    title: item,
                    autocomplete: item,
                    subtitle: `↩ ` + (theAction === 'inputPasteItem' ? `Paste` : `Copy`) + ' • ⌘↩ ' + (theAction === 'inputPasteItem' ? `Copy` : `Paste`) + ' • ⌥↩ Edit Item • ⌃↩ Clear Item • ⇧↩ Move Up • fn↩ Move Down',
                    arg: index,
                    action: item,
                    text: {
                        'copy': item,
                        'largetype': item,
                    },
                    variables: {
                        theAction: theAction === 'inputPasteItem' ? 'pasteItem' : 'copyItem'
                    },
                    mods: {
                        cmd: {
                            subtitle: (theAction === 'inputPasteItem' ? `Copy` : `Paste`) + ' Item',
                            variables: {
                                theAction: theAction === 'inputPasteItem' ? 'copyItem' : 'pasteItem'
                            }
                        },
                        alt: {
                            subtitle: 'Edit Item',
                            variables: {
                                theAction: 'textEditItem' + (theAction === 'inputPasteItem' ? 'P' : 'C')
                            }
                        },
                        'alt+cmd': {
                            subtitle: 'Edit ' + behaviorUp,
                            variables: {
                                theAction: 'textEditList' + (theAction === 'inputPasteItem' ? 'P' : 'C')
                            }
                        },
                        ctrl: {
                            subtitle: 'Clear Item',
                            variables: {
                                theAction: 'inputClearItem' + (theAction === 'inputPasteItem' ? 'inputPasteItem' : 'inputCopyItem')
                            }
                        },
                        'ctrl+cmd': {
                            subtitle: 'Clear ' + behaviorUp,
                            variables: {
                                theAction: 'clearList'
                            }
                        },
                        'ctrl+cmd+alt': {
                            subtitle: 'Set as Next Item Index',
                            variables: {
                                theAction: 'setNextItem'
                            }
                        },
                        shift:{
                            subtitle: 'Move Up',
                            variables: {
                                theAction: 'inputMoveU' + (theAction === 'inputPasteItem' ? 'inputPasteItem' : 'inputCopyItem')
                            }
                        },
                        fn: {
                            subtitle: 'Move Down',
                            variables: {
                                theAction: 'inputMoveD' + (theAction === 'inputPasteItem' ? 'inputPasteItem' : 'inputCopyItem')
                            }
                        },
                        'fn+cmd': {
                            subtitle: 'Invert ' + behaviorUp,
                            variables: {
                                theAction: 'inputInvert' + (theAction === 'inputPasteItem' ? 'inputPasteItem' : 'inputCopyItem')
                            }
                        },
                        'fn+shift': {
                            subtitle: 'Reset Next Item Index',
                            variables: {
                                theAction: 'resetNext'
                            }
                        }
                    }
                }

                //This sets the icon for next item and already processed items
                if (index === theIndex) {
                    itemObject.icon = {
                        "path": "./nextItem.png"
                    };
                } else {
                    if (pasteOrder === 'recFirst' && index < theIndex) {
                        itemObject.icon = {
                            "path": "./processedItem.png"
                        };
                    } else {
                        if (pasteOrder === 'recLast' && index > theIndex) {
                            itemObject.icon = {
                                "path": "./processedItem.png"
                            }; 
                        }
                    }
                } 

                items.push(itemObject);
            });
        }
    }

    return JSON.stringify({ items: items });
}