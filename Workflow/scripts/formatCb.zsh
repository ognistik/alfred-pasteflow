#!/bin/zsh

theAction=${theAction}
behavior=${behavior}
values=()
value=${theItems}
invOrder=${invOrder:-0}
(( value-- ))

get_clipboard_items() {
    local limit=$1
    local delimiter='‼️ITEM_SEPARATOR‼️'
    /usr/bin/sqlite3 -separator $'\x1C' \
    "${HOME}/Library/Application Support/Alfred/Databases/clipboard.alfdb" \
    "SELECT group_concat(
        CASE 
            WHEN dataType IN (1, 2) AND '$theAction' NOT IN ('copyClipRange', 'pasteClipRange') 
                THEN '✈Ͽ ' || dataHash || '::' || printf('%s', item)
            ELSE printf('%s', item)
        END,
        '${delimiter}'
    )
    FROM (
        SELECT * FROM clipboard
        WHERE dataType IN (0, 1, 2)
        ORDER BY ts DESC
        LIMIT ${limit}
    )"
}

case "$theAction" in
    addClipRange | copyClipRange | pasteClipRange)
        local all_items
        all_items=$(get_clipboard_items $((value + 1)))
        local -a split_items
        split_items=("${(@s:‼️ITEM_SEPARATOR‼️:)all_items}")
        
        if [[ $behavior == "queue" ]]; then
            for ((i=${#split_items[@]}; i>0; i--)); do
                [[ -n "${split_items[$i]}" ]] && print -r -- $'✈Ͽ '"${split_items[$i]}"
            done
        else
            for item in "${split_items[@]}"; do
                [[ -n "$item" ]] && print -r -- $'✈Ͽ '"$item"
            done
        fi
    ;;
    addCurrentClip | addSplitClip | addRichText)
        printf '%s\n' "✈Ͽ $(get_clipboard_items 1)"
    ;;
esac