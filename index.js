const fs = require('fs')
const path = require('path')
const minidump = require('minidump')
const electronDownload = require('electron-download')
const extractZip = require('extract-zip')

const electronMinidump = async (options) => {
  const {version, quiet, force, file, platform, arch} = options
  const directory = path.join(__dirname, 'cache', version + '-' + platform)

  await Promise.all([
    download({version, quiet, directory, platform, arch, force}),
    findSymbols({version, platform, arch, directory, file, quiet})
  ])

  const symbolPaths = [
    path.join(directory, 'breakpad_symbols'),
    path.join(directory, 'electron.breakpad.syms'),
  ]
  const r = await new Promise((resolve, reject) => {
    minidump.walkStack(file, symbolPaths, (err, rep) => {
      if (err) reject(err)
      resolve(rep)
    })
  })
  return r.toString('utf8')
}

const download = (options) => {
  return new Promise((resolve, reject) => {
    const {version, quiet, directory, platform, arch, force} = options

    if (fs.existsSync(directory) && !force) return resolve()

    electronDownload({
      platform,
      arch,
      version,
      symbols: true,
      quiet,
      force,
    }, (error, zipPath) => {
      if (error != null) return reject(error)
      extractZip(zipPath, {dir: directory}, resolve)
    })
  })
}

const SYMBOL_BASE_URL = 'https://symbols.mozilla.org'

const findSymbols = async ({version, platform, arch, directory, file, quiet}) => {
  if (platform !== 'win32') {
    // Mozilla's symbol server doesn't have symbols for non-Windows platforms
    return
  }
  const r = await new Promise((resolve, reject) => {
    minidump.dump(file, (err, rep) => {
      resolve(rep)
    })
  })
  // minidump_dump's output has lines like:
  //   (debug_file)                    = "user32.pdb"
  //   (debug_identifier)              = "034AFFE8331738A54EC07A7655CAF0DC1"
  const modules = []
  {
    const re = /\(debug_file\)\s+= "([^"]+\.pdb)"\s+\(debug_identifier\)\s+= "([0-9A-F]+)"/mg
    let m;
    while (m = re.exec(r)) {
      const [, file, id] = m
      modules.push([file, id])
    }
  }
  const promises = []
  for (const [pdb, id] of modules) {
    if (pdb === 'electron.exe.pdb') continue
    const symbolPath = path.join(directory, 'breakpad_symbols', pdb, id, pdb.replace('.pdb', '.sym'))
    if (!fs.existsSync(symbolPath) && !fs.existsSync(path.dirname(symbolPath))) {
      const url = `${SYMBOL_BASE_URL}/${pdb}/${id}/${pdb.replace('.pdb', '.sym')}`
      promises.push(new Promise((resolve, reject) => {
        const child = require('child_process').spawn('curl', [
          '--silent',
          '--location',
          '--create-dirs',
          '--compressed',
          '--fail',
          '--output', symbolPath,
          url
        ])
        child.once('close', (code) => {
          if (code !== 0 && code !== 22) {
            reject(new Error(`failed to download ${url} (code ${code})`))
          } else {
            resolve()
          }
        })
      }))
    }
  }
  if (!quiet && promises.length > 0) {
    console.log(`Downloading ${promises.length} symbol files from ${SYMBOL_BASE_URL}...`)
  }
  await Promise.all(promises)
}

module.exports = {minidump: electronMinidump}
