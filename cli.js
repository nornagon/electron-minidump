#!/usr/bin/env node

const {minidump} = require('./index')

const argv = require('yargs')
  .usage('$0 [args]')
  .version(false)
  .option('file', {
    alias: 'f',
    describe: 'path to minidump (.dmp) file',
    demandOption: true,
  })
  .option('version', {
    alias: 'v',
    demandOption: true,
    describe: 'electron version',
  })
  .option('platform', {
    alias: 'p',
    describe: 'platform on which crash was recorded',
    choices: ['win32', 'darwin', 'mas', 'linux'],
    demandOption: true,
  })
  .option('arch', {
    alias: 'a',
    describe: 'architecture on which crash was recorded',
    choices: ['x64', 'ia32', 'arm64', 'armv7l'],
    demandOption: true,
  })
  .option('quiet', {
    alias: 'q',
    describe: 'suppress download progress output',
  })
  .option('force', {
    describe: 'redownload symbols if present in cache',
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
