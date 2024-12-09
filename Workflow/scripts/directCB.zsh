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
  "WITH clipboard_data AS (
    SELECT 
      item,
      dataType,
      dataHash,
      ts
    FROM clipboard
    WHERE dataType IN (0, 1, 2)
    ORDER BY ts DESC
    LIMIT 50
  )
  SELECT JSON_OBJECT('items', JSON_GROUP_ARRAY(JSON_OBJECT(
    'title', item,
    'arg', COALESCE(
      CASE 
        -- dataType 0 is text, 1 is files like images stored in Alfred folder, and 2 is plist which reference other files
        WHEN dataType IN (1, 2) THEN '✈Ͽ ' || dataHash || '::' || item
        ELSE item
      END,
      item
    ),
    'type', 'default',
    'autocomplete', item,
    'action', item,
    'icon', JSON_OBJECT(
      'path', './assets/images/clipFilter.png'
    ),
    'text', JSON_OBJECT(
      'copy', item,
      'largetype', CASE 
        WHEN length(item) > 1300 
        THEN substr(item, 1, 1300) || '...'
        ELSE item
      END
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
  AS JSON_RESULT FROM clipboard_data"