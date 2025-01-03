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

    //This will allow us to trash raw items later... or do shell scripts
    var app = Application.currentApplication();
    app.includeStandardAdditions = true;

    //Those cases where the stack has to be reset
    try {
        clearStack = $.getenv('clearStack');
    } catch (error) {
        clearStack = '0';
    }

    // Let's Uppercase this
    let behaviorUp;
    behaviorUp = behavior.charAt(0).toUpperCase() + behavior.slice(1);

    var fm = $.NSFileManager.defaultManager;

    // Make Cache directory if none exists
    if (!fm.fileExistsAtPath(thePath)) {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(thePath), true, $(), $());
    }

    var theStackPath = thePath + '/flowList.txt';
    var nextItemPath = thePath + '/nextItem.txt';
    var rawCBPath = thePath + '/cbData';

    //Make empty stack if none exists
    if (!fm.fileExistsAtPath(theStackPath)) {
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Make richCB path if it doesn't exist
    if (!fm.fileExistsAtPath(rawCBPath)) {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(rawCBPath), true, $(), $());
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
            //We trash any raw clipboard files
            try {
                app.doShellScript(`if [ "$(ls -A "${rawCBPath}")" ]; then mv "${rawCBPath}"/* ~/.Trash/; fi`);
            } catch (error) {
                // Silently fail or handle error as needed
            }
        }
    }

    //If theStack is not empty and user wants to reset the stack before new content, we do that.
    if (theStack && clearStack === '1') {
        theStack = '';
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
        nextItem = 1;
        $.NSString.stringWithString('1').writeToFileAtomicallyEncodingError(nextItemPath, true, $.NSUTF8StringEncoding, $());
        //We trash any raw clipboard files
        try {
            app.doShellScript(`if [ "$(ls -A "${rawCBPath}")" ]; then mv "${rawCBPath}"/* ~/.Trash/; fi`);
        } catch (error) {
            // Silently fail or handle error as needed
        }
        //We reset this, which has already been processed.
        clearStack = '0';
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
    if (theAction === 'textEditItemP' || theAction === 'textEditItemC') {
        let response = theStack[Number(query)];
        
        if (response.startsWith('✈Ͽ ')) {
            if (response.includes('"::')) {
                response = response.split('::')[1];
            } else if (response.includes('";;')) {
                response = response.split(';;')[1];
            }
        }
    
        return JSON.stringify({
            variables: {
                theAction: theAction === 'textEditItemP' ? 'IeditinputPasteItem' : 'IeditinputCopyItem',
                theIndex: query
            },
            response: response,
            footer: "⌘↩ Save • ⎋: Cancel",
        });
    }

    if (theAction === 'textEditListP' || theAction === 'textEditListC' || theAction === 'textEditListX'){
        theStack = theStack.map(item => `✈Ͽ ${item}`).join('\n\n');
        if (theAction !== 'textEditListX') {
            return JSON.stringify({
                variables: {
                    theAction: theAction === 'textEditListP' ? 'LeditinputPasteItem' : 'LeditinputCopyItem',
                    theIndex: query
                },
                response: theStack,
                footer: "⌘↩ Save • ⎋: Cancel",
            });
        } else {
            return JSON.stringify({
                variables: {
                    theAction: 'editView',
                    emptyStack: ''
                },
                response: theStack,
                footer: "⌘↩ Save & Close • ⌥↩ Save & View • ⎋: Cancel",
            });
        }
    }

    if (theAction === 'textEditManual'){
        return JSON.stringify({
            variables: {
                theAction: 'addManual',
            },
            response: query !== '' ? query : '',
            footer: "⌘↩ Save & Close • ⌥↩ Save & View • ⎋: Cancel",
        });
    }
}