ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var thePath = $.getenv('thePath') || $.getenv('alfred_workflow_cache');
    var behavior = $.getenv('behavior');

    var fm = $.NSFileManager.defaultManager;

    // Let's Uppercase this
    let behaviorUp;
    behaviorUp = behavior.charAt(0).toUpperCase() + behavior.slice(1);
    
    // Make Cache directory if none exists
    if (!fm.fileExistsAtPath(thePath)) {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(thePath), true, $(), $());
    }

    var theStackPath = thePath + '/flowList.txt';

    //Make empty stack if none exists
    if (!fm.fileExistsAtPath(theStackPath)) {
        $.NSString.stringWithString('').writeToFileAtomicallyEncodingError(theStackPath, true, $.NSUTF8StringEncoding, $());
    }

    //Assign the contents of theStack to variable
    theStack = $.NSString.stringWithContentsOfFileEncodingError(theStackPath, $.NSUTF8StringEncoding, null).js;

    //If theStack is not empty & noTimeout is deselected, check last modification of theStack and clear if necessary.
    if (theStack === '') {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    emptyStack: 'yes'
                }
            }
        });
    }
}