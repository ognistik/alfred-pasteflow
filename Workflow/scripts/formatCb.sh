#!/bin/bash

theAction=${theAction}
behavior=${behavior}
values=()
value=${theItems}
invOrder=${invOrder:-0}
(( value-- ))

case "$theAction" in
	addClipRange | copyClipRange | pasteClipRange)
        if [[ $behavior == "stack" ]]; then
            while (( value >= 0 )); do
                values+=("✈Ͽ {clipboard:${value}}")
                (( value-- ))
            done

            for (( i=${#values[@]}-1; i>=0; i-- )); do
                echo "${values[i]}"
            done
        else
            while [ "$value" -gt -1 ]; do
                echo "✈Ͽ {clipboard:${value}}"
                (( value-- ))
            done
        fi
    ;;
    addCurrentClip)
        echo "✈Ͽ {clipboard:0}"
    ;;
    addSplitClip)
        echo "{clipboard:0}"
    ;;
esac
