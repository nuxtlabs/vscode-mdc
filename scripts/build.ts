import fs from 'fs'
import { grammar } from '../src/grammar'

console.log('Start build')

fs.writeFileSync('syntaxes/mdc.tmLanguage.json', JSON.stringify({
  $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
  ...grammar
}, null, 2), 'utf-8')

console.log('Write syntaxes/mdc.tmLanguage.json')
