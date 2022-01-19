#!/usr/bin/env node

const {minidump} = require('./index')

const argv = require('yargs')
  .version(false)
  .command('$0 <file>', 'symbolicate a textual crash dump', (yargs) => {
    return yargs
      .positional('file', {
        describe: 'path to crash dump',
      })
      .option('f', {
        type: 'boolean',
        describe: 'obsolete, provided for backwards compatibility',
      })
      .option('quiet', {
        alias: 'q',
        describe: 'suppress download progress output',
      })
      .option('force', {
        describe: 'redownload symbols if present in cache',
        type: 'boolean'
      })
  })
  .help()
  .argv

minidump(argv).then(
  symbols => console.log(symbols),
  error => {
    console.error(error)
    process.exit(1)
  }
)
