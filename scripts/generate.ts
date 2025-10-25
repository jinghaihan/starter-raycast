import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

interface PackageJSON {
  commands?: RaycastCommand[]
  preferences?: RaycastPreference[]
}

interface RaycastCommand {
  name: string
  title: string
  description: string
  mode: string
}

interface RaycastPreference {
  [key: string]: unknown
  name: string
  title: string
  type: string
  required?: boolean
  description: string
  default?: unknown
}

function markdownEscape(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&vert;')
}

export function formatTable(table: string[][]) {
  if (!table.length)
    return '**No data**'

  const [header, ...body] = table
  const colChars = Array.from<number>({ length: header.length }).fill(0)

  table.forEach((row) => {
    row.forEach((col, idx) => {
      colChars[idx] = Math.max(colChars[idx], col?.length || 0)
    })
  })

  table.forEach((row, rowIdx) => {
    row.forEach((col, colIdx) => {
      table[rowIdx][colIdx] = col?.padEnd(colChars[colIdx], ' ') || ''
    })
  })

  return [
    `| ${header.join(' | ')} |`,
    `| ${colChars.map(w => '-'.repeat(w)).join(' | ')} |`,
    ...body.map(row => `| ${row.join(' | ')} |`),
  ].join('\n')
}

function generateMarkdown(packageJson: PackageJSON) {
  let commandsTable = [
    ['Title', 'Description'],
  ]

  let configsTable = [
    ['Key', 'Description', 'Required', 'Default'],
  ]

  if (packageJson?.commands?.length) {
    commandsTable.push(
      ...packageJson.commands.map((c: RaycastCommand) => {
        return [
          `\`${c.title}\``,
          markdownEscape(c.description),
        ]
      }),
    )
  }
  else {
    commandsTable = []
  }

  if (packageJson?.preferences?.length) {
    configsTable.push(
      ...packageJson.preferences.map((p: RaycastPreference) => {
        return [
          `\`${p.name}\``,
          markdownEscape(p.description),
          `\`${p.required ? 'Yes' : 'No'}\``,
          markdownEscape(String(p.default)),
        ]
      }),
    )
  }
  else {
    configsTable = []
  }

  return {
    commandsTable: formatTable(commandsTable),
    configsTable: formatTable(configsTable),
  }
}

(async function generate() {
  const json = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf-8'))
  const markdown = generateMarkdown(json)

  const readme = join(process.cwd(), 'README.md')
  const raw = await readFile(readme, 'utf-8')
  const content = raw
    .replace(/<!-- (commands|commands-table) -->[\s\S]*?<!-- (commands|commands-table) -->/, `<!-- $1 -->\n\n${markdown.commandsTable}\n\n<!-- $2 -->`)
    .replace(/<!-- (configs|configs-table) -->[\s\S]*?<!-- (configs|configs-table) -->/, `<!-- $1 -->\n\n${markdown.configsTable}\n\n<!-- $2 -->`)

  if (raw !== content)
    await writeFile(readme, content, 'utf-8')
})()
