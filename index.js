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
  // Extract a list of referenced modules using minidump_dump
  const modules = []
  {
    const r = await new Promise((resolve, reject) => {
      minidump.dump(file, (err, rep) => {
        resolve(rep)
      })
    })
    // minidump_dump's output has lines like:
    //   (debug_file)                    = "user32.pdb"
    //   (debug_identifier)              = "034AFFE8331738A54EC07A7655CAF0DC1"
    // or on a linux dump:
    //   (debug_file)                    = "/XXXX/XXXXXX/XXXX/XXX/XXXXXXXXXXXXXXXX/libc.so.6"
    //   (debug_identifier)              = "4B76CFD3972F3EACFE366DDD07AD902F0"
    const re = /\(debug_file\)\s+= "(?:[X/]+\/)?([^"]+)"\s+\(debug_identifier\)\s+= "([0-9A-F]+)"/mg
    let m;
    while (m = re.exec(r)) {
      const [, file, id] = m
      modules.push([file, id])
    }
  }

  // Fetch any we don't already have from the symbol server
  const promises = []
  for (const [pdb, id] of modules) {
    if (pdb === 'electron.exe.pdb') continue
    const symbolFileName = pdb.replace(/(\.pdb)?$/, '.sym')
    const symbolPath = path.join(directory, 'breakpad_symbols', pdb, id, symbolFileName)
    if (!fs.existsSync(symbolPath) && !fs.existsSync(path.dirname(symbolPath))) {
      const url = `${SYMBOL_BASE_URL}/${pdb}/${id}/${symbolFileName}`
      promises.push(new Promise((resolve, reject) => {
        // We use curl here in order to avoid having to deal with redirects +
        // gzip + saving to a file ourselves. It would be more portable to
        // handle this in JS rather than by shelling out, though, so TODO.
        const child = require('child_process').spawn('curl', [
          // We don't need progress bars.
          '--silent',

          // The Mozilla symbol server redirects to S3, so follow that
          // redirect.
          '--location',

          // We want to create all the parent directories for the target path,
          // which is breakpad_symbols/foo.pdb/0123456789ABCDEF/foo.sym
          '--create-dirs',

          // The .sym file is gzipped, but minidump_stackwalk needs it
          // uncompressed, so ask curl to ungzip it for us.
          '--compressed',

          // If we get a 404, don't write anything and exit with code 22. The
          // parent directories will still be created, though.
          '--fail',

          // Save the file directly into the cache.
          '--output', symbolPath,

          // This is the URL we want to fetch.
          url
        ])

        child.once('close', (code) => {
          // Code 22 is fine, that just means the symbol server didn't have our
          // file.
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
