ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];

    var thePath = $.getenv('thePath') || $.getenv('alfred_workflow_cache');
    var singleClear = $.getenv('singleClear');
    var afterAll = $.getenv('afterAll');
    var timeout = $.getenv('timeout');
    var noTimeout = $.getenv('noTimeout');
    var behavior = $.getenv('behavior');
    var pasteOrder = $.getenv('pasteOrder');
    var groupAfter = $.getenv('groupAfter');

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

    //Splits, makes array, and counts how many items in theStack
    //let splitItems = theStack.split('✈Ͽ ').slice(1);

    //Another option that works and seems simpler is the following inside the condition below:
    //const regex = /^✈Ͽ (.*(?:\n(?!✈Ͽ ).*)*)/gm;
    //theStackArray = theStack.match(regex).map(item => item.slice(3).replace(/\n+$/, '').trim());

    if (theStack !== '') {
        let rawQuery = theStack;
        theStackArray = [];

        // Split the rawQuery into lines
        let lines = rawQuery.split('\n');
        let currentItem = '';
        
        for (let line of lines) {
            if (line.startsWith('✈Ͽ ')) {
                if (currentItem) {
                    theStackArray.push(currentItem.trim());
                }
                currentItem = line.slice(3); // Remove the '✈Ͽ ' prefix
            } else {
                currentItem += '\n' + line;
            }
        }

        // Add the last item
        if (currentItem) {
            theStackArray.push(currentItem.trim());
        }
    } else {
        theStackArray = [];
    }

    var itemCount = theStack ? theStackArray.length : 0;

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

    //If processing is done and a restart is due... let's do that.
    if (itemCount > 0 && afterAll === 'restart' && nextItem > itemCount) {
        var nextItem = 1;
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
    }

    //We prepare the text to copy the entire stack joining it according to user's request
    groupAfter = groupAfter.replace(/\\n/g, '\n');
    if (groupAfter === 'comma'){
        groupAfter = ', ';
    } else if (groupAfter === 'space') {
        groupAfter = ' ';
    }

    theText = theStackArray.join(groupAfter);

    //Prepares empty variable for items to be displayed to user
    var items = [];

    if (query !== ':') {
        //Only the first two items can add to theStack, they are also the only two that offer the Reset Stack option.
        items.push({
            uid: 'addClipboard',
            type: 'default',
            autocomplete: 'Add to ' + behaviorUp + ' from Clipboard' + (theStack ? '' : ' (New ' + behaviorUp + ')'),
            title: 'Add to ' + behaviorUp + ' from Clipboard' + (theStack ? '' : ' (New ' + behaviorUp + ')'),
            subtitle: 'Select X number of recent items.',
            arg: theText,
            action: theText,
            text: {
                'copy': theText,
                'largetype': theText,
            },
            variables: { theAction: 'inputAddClipRange' },
            mods: { 'cmd': {valid: true, variables: {theAction: 'inputAddClipRange', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' & add X number of recent items.'},
                    'alt': {valid: true, variables: {theAction: '!addCurrentClip' }, subtitle: 'Add current clipboard only.'},
                    'cmd+alt': {valid: true, variables: {theAction: '!addCurrentClip', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' & add current clipboard only.'},
                    'ctrl': behavior === 'stack' && pasteOrder === 'recLast' || behavior === 'queue' && pasteOrder === 'recFirst' ? {valid: true, variables: {theAction: 'inputAddClipRange', addNext: '1'}, subtitle: 'Add X number of recent items and insert in "next" position.'} : {valid: false},
                    'ctrl+alt': behavior === 'stack' && pasteOrder === 'recLast' || behavior === 'queue' && pasteOrder === 'recFirst' ?  {valid: true, variables: {theAction: '!addCurrentClip', addNext: '1'}, subtitle: 'Add current clipboard only in "next" position.'} : {valid: false},
                    'fn': {valid: true, variables: {theAction: 'clipFilter' }, subtitle: 'Add manually from recent clipboard items.'},
                    'fn+cmd': {valid: true, variables: {theAction: 'clipFilter', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' add manually from recent clipboard items.'},
                    'fn+ctrl': {valid: true, variables: {theAction: 'clipFilter', addNext: '1'}, subtitle: 'Add manually from recent clipboard items in "next" position.'},
                }
        });

        items.push({
            uid: 'splitClipboard',
            type: 'default',
            autocomplete: 'Split & Add to ' + behaviorUp + (theStack ? '' : ' (New ' + behaviorUp + ')'),
            title: 'Split & Add to ' + behaviorUp + (theStack ? '' : ' (New ' + behaviorUp + ')'),
            subtitle: 'Add current clipboard split by newlines.',
            arg: theText,
            action: theText,
            text: {
                'copy': theText,
                'largetype': theText,
            },
            variables: { theAction: '!addSplitClip' },
            mods: { 
                'cmd': {valid: true, variables: {theAction: '!addSplitClip', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' & add current clipboard split by newlines.'},
                'alt': {valid: true, variables: {theAction: '!addSplitClip', invOrder: '1'}, subtitle: 'Add current clipboard split by newlines. ' + (behavior === 'stack' ? 'Invert first (recent at the bottom).' : 'Invert first (recent at the top).')},
                'alt+cmd': {valid: true, variables: {theAction: '!addSplitClip', invOrder: '1', clearStack: '1'}, subtitle: 'Clear ' + behavior + ' & add current clipboard split by newlines. ' + (behavior === 'stack' ? 'Recent at the bottom.' : 'Recent at the top.')},
                'ctrl': behavior === 'stack' && pasteOrder === 'recLast' || behavior === 'queue' && pasteOrder === 'recFirst' ? {valid: true, variables: {theAction: '!addSplitClip', addNext: '1'}, subtitle: 'Add current clipboard in "next" position, split by newlines.'} : {valid: false},
                'ctrl+alt': behavior === 'stack' && pasteOrder === 'recLast' || behavior === 'queue' && pasteOrder === 'recFirst' ? {valid: true, variables: {theAction: '!addSplitClip', addNext: '1', invOrder: '1'}, subtitle: 'Add current clipboard in "next" position, split by newlines. ' + (behavior === 'stack' ? 'Invert first (recent at the bottom).' : 'Invert first (recent at the top).')} : {valid: false}
        }
        });

        items.push({
            uid: 'pasteClipboard',
            type: 'default',
            autocomplete: 'Merge & Process Clipboard',
            title: 'Merge & Process Clipboard',
            subtitle: 'Merge & paste multiple clipboard items at once. ' + (behavior === 'stack' ? 'Recent at the top.' : 'Recent at the bottom.'),
            arg: theText,
            action: theText,
            text: {
                'copy': theText,
                'largetype': theText,
            },
            variables: { theAction: 'inputPasteClipRange' },
            mods: {
                cmd: {
                    subtitle: 'Merge & copy multiple clipboard items at once. ' + (behavior === 'stack' ? 'Recent at the top.' : 'Recent at the bottom.'),
                    variables: { theAction: 'inputCopyClipRange' }
                },
                alt: {
                    subtitle: 'Merge & paste multiple clipboard items at once. ' + (behavior === 'stack' ? 'Recent at the bottom.' : 'Recent at the top.'),
                    variables: { theAction: 'inputPasteClipRange', invOrder: '1' }
                },
                'cmd+alt': {
                    subtitle: 'Merge & copy multiple clipboard items at once. ' + (behavior === 'stack' ? 'Recent at the bottom.' : 'Recent at the top.'),
                    variables: { theAction: 'inputCopyClipRange', invOrder: '1' }
                }
            }
        });

        //Will only show if theStack has items & nextItem number is below the total items in theStack
        if (itemCount > 0 && nextItem <= itemCount) {
            items.push({
                uid: 'pasteNext',
                type: 'default',
                autocomplete: 'Next Item',
                title: 'Next Item' + (nextItem === 1 ? ' (' + itemCount + ' total)' : ' (' + nextItem + ' out of ' + itemCount + ')'),
                subtitle: itemCount > 1 
                    ? `Paste next. You are processing your ${behavior} ${pasteOrder === 'recFirst' ? 'top-to-bottom' : 'bottom-to-top'} (${
                        (behavior === 'stack' && pasteOrder === 'recLast') || (behavior === 'queue' && pasteOrder === 'recFirst')
                            ? 'oldest first'
                            : 'recent first'
                    }).`
                    : `You only have 1 item in your paste ${behavior}.`,
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'pasteNext' },
                mods: {
                    cmd: {
                        //Should we put in subtitle something that indicates the order??? like in the mods
                        subtitle: itemCount > 1 
                            ? `Copy next. You are processing your ${behavior} ${pasteOrder === 'recFirst' ? 'top-to-bottom' : 'bottom-to-top'} (${
                                (behavior === 'stack' && pasteOrder === 'recLast') || (behavior === 'queue' && pasteOrder === 'recFirst')
                                    ? 'oldest first'
                                    : 'recent first'
                            }).`
                            : `You only have 1 item in your ${behavior}.`,
                        variables: { theAction: 'copyNext' }
                    },
                    ...(nextItem === 1 && itemCount > 1 ? {
                        alt: {
                            subtitle: `Paste next. Process ${behavior} item ${pasteOrder === 'recFirst' ? 'bottom-to-top' : 'top-to-bottom'} (${
                                    (behavior === 'stack' && pasteOrder === 'recLast') || (behavior === 'queue' && pasteOrder === 'recFirst')
                                        ? 'use the most recent'
                                        : 'use the oldest'
                                        }).`,
                            variables: { theAction: 'pasteNext', invOrder: '1' }
                        },
                        'cmd+alt': {
                            subtitle: `Copy next. Process ${behavior} item ${pasteOrder === 'recFirst' ? 'bottom-to-top' : 'top-to-bottom'} (${
                                    (behavior === 'stack' && pasteOrder === 'recLast') || (behavior === 'queue' && pasteOrder === 'recFirst')
                                        ? 'use the most recent'
                                        : 'use the oldest'
                                        }).`,
                            variables: { theAction: 'copyNext', invOrder: '1' }
                        }
                    } : {})
                }
            });
        } 
        if (theStack) {
            items.push({
                uid: 'pasteStack',
                type: 'default',
                autocomplete: 'Merge & Process ' + behaviorUp,
                title: 'Merge & Process ' + behaviorUp,
                subtitle: 'Paste your entire ' + behavior + '.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'pasteStack' },
                mods: {
                    cmd: {
                        subtitle: 'Copy your entire ' + behavior + '.',
                        variables: { theAction: 'copyStack' }
                    },
                    alt: {
                        subtitle: 'Invert & Paste your entire ' + behavior + '.',
                        variables: { theAction: 'pasteStack', invOrder: '1' }
                    },
                    'cmd+alt': {
                        subtitle: 'Invert & Copy your entire ' + behavior + '.',
                        variables: { theAction: 'copyStack', invOrder: '1' }
                    }
                }
            });

            items.push({
                uid: 'selective',
                type: 'default',
                autocomplete: 'Selective Processing',
                title: 'Selective Processing',
                subtitle: 'Choose a ' + behavior + ' item to paste.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'inputPasteItem' },
                mods: { 'cmd': {valid: true, variables: {theAction: 'inputCopyItem' }, subtitle: 'Choose a ' + behavior + ' item to copy.'}}
            });
        }
    } else {
        items.push({
            uid: 'config',
            type: 'default',
            autocomplete: ':Configuration',
            title: ':Configuration',
            subtitle: 'Open workflow configuration.',
            arg: theText,
            action: theText,
            text: {
                'copy': theText,
                'largetype': theText,
            },
            variables: { theAction: 'config' }
        });

        if (theStack) {
            items.push({
                uid: 'viewStack',
                type: 'default',
                autocomplete: ':View',
                title: ':View',
                subtitle: 'View the contents of your paste ' + behavior + '.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'viewStack' }
            });

            items.push({
                uid: 'clearStack',
                type: 'default',
                autocomplete: ':Clear ' + behaviorUp,
                title: ':Clear ' + behaviorUp,
                subtitle: 'Clear the contents of your paste ' + behavior + '.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'clearList' }
            });

            items.push({
                uid: 'editStack',
                type: 'default',
                autocomplete: ':Edit',
                title: ':Edit',
                subtitle: 'Edit the contents of your paste ' + behavior + '.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'textEditListX' }
            });

            items.push({
                uid: 'invertStack',
                type: 'default',
                autocomplete: ':Invert',
                title: ':Invert',
                subtitle: 'Invert the contents of your paste ' + behavior + '.',
                arg: theText,
                action: theText,
                text: {
                    'copy': theText,
                    'largetype': theText,
                },
                variables: { theAction: 'invert' }
            });

            if (itemCount > 1) {
                items.push({
                    uid: 'keepStack',
                    type: 'default',
                    autocomplete: ':Keep & Trim',
                    title: ':Keep & Trim',
                    subtitle: 'Keep X amount of items and clear the others.',
                    arg: theText,
                    action: theText,
                    text: {
                        'copy': theText,
                        'largetype': theText,
                    },
                    variables: { theAction: 'inputKeep' }
                });
            }

            if (nextItem !== 1) {
                items.push({
                    uid: 'resetNext',
                    type: 'default',
                    autocomplete: ':Reset Next Item Index',
                    title: ':Reset Next Item Index',
                    subtitle: nextItem > itemCount ? 'You are done processing your ' + itemCount + '-item ' + behavior + '.' : 'Currently, next is item ' + nextItem + ' out of ' + itemCount + '.',
                    arg: theText,
                    action: theText,
                    text: {
                        'copy': theText,
                        'largetype': theText,
                    },
                    variables: { theAction: 'resetNext' }
                });
            }
        }
    }

    return JSON.stringify({ items: items });
}