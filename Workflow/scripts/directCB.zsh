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
    'variables', JSON_OBJECT(
      'clipFilter', 'close'
    ),
    'mods', JSON_OBJECT(
      'cmd', JSON_OBJECT(
        'subtitle', 'Add & Loop',
        'variables', JSON_OBJECT(
          'clipFilter', 'loop')
      ),
      'ctrl', JSON_OBJECT(
        'subtitle', 'Add in \"Next\" & Close',
        'variables', JSON_OBJECT(
          'clipFilter', 'nextClose')
      ),
      'cmd+ctrl', JSON_OBJECT(
        'subtitle', 'Add in \"Next\" & Loop',
        'variables', JSON_OBJECT(
          'clipFilter', 'nextLoop')
      )
    ),
    'subtitle', '↩ Add & Close • ⌘↩ Add & Loop • ⌃↩ Add in \"Next\" & Close • ⌘⌃↩ Add in \"Next\" & Loop')))
  AS JSON_RESULT FROM (
    SELECT item
    FROM clipboard
    WHERE dataType IS 0
    ORDER BY ts
    DESC
    LIMIT 30)"