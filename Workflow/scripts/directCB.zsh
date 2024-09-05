#!/bin/zsh

if [[ -n "${1}" ]]
then
  /usr/bin/osascript -l JavaScript -e 'function run(argv) {
    return JSON.stringify({
      items: [{
        title: argv[0],
        arg: argv[0]
      }]
    })
  }' "${1}"

  exit 0
fi

/usr/bin/sqlite3 \
  "${HOME}/Library/Application Support/Alfred/Databases/clipboard.alfdb" \
  "SELECT JSON_OBJECT('items', JSON_GROUP_ARRAY(JSON_OBJECT(
    'title', item,
    'arg', item,
    'type', 'default',
    'autocomplete', item,
    'action', item,
    'text', JSON_OBJECT(
      'copy', item,
      'largetype', item
    ),
    'subtitle', '↩ Add to List & Close • ⌘↩ Add to List & Loop')))
  AS JSON_RESULT FROM (
    SELECT item
    FROM clipboard
    WHERE dataType IS 0
    ORDER BY ts
    DESC
    LIMIT 30)"