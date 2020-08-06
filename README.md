# electron-minidump

Symbolicates Electron crashes in minidump format. c.f.
[@electron/symbolicate-mac](https://github.com/electron/symbolicate-mac), which
does a similar thing for text-based crash dumps formatted by macOS.

To install: `npm install -g electron-minidump`.

```sh
$ electron-minidump --help
electron-minidump [args]

Options:
  --file, -f      path to minidump (.dmp) file                        [required]
  --quiet, -q     suppress download progress output
  --force         redownload symbols if present in cache
  --help          Show help                                            [boolean]
```

```sh
$ electron-minidump -f crash.dmp
Operating system: Windows NT
                  10.0.17134
CPU: amd64
     family 6 model 60 stepping 3
     4 CPUs

GPU: UNKNOWN

Crash reason:  EXCEPTION_ACCESS_VIOLATION_READ
Crash address: 0x25dbda8356b
Assertion: Unknown assertion type 0x00000000
Process uptime: not available

Thread 23 (crashed)
 0  node.dll!v8::internal::ConcurrentMarking::Run(int,v8::internal::ConcurrentMarking::TaskState *) [concurrent-marking.cc : 469 + 0x0]
    rax = 0x000027104ac00000   rdx = 0x000027104abe5af0
    rcx = 0x00000195efc2b7f0   rbx = 0x0000025dbda83561
    rsi = 0x000030ff5b088ae8   rdi = 0x000030ff5b088ae9
    rbp = 0x000000900c1fe080   rsp = 0x000000900c1fdf80
     r8 = 0x00007fffb0250000    r9 = 0x000030ff5b087a00
    r10 = 0x000030ff5b080000   r11 = 0x00000195f150c210
    r12 = 0x00000195efc2b2d0   r13 = 0x00000000000000da
    r14 = 0x0000000000000014   r15 = 0x00000195f1583370
    rip = 0x00007fffb091a525
    Found by: given as instruction pointer in context
 1  0x5
    rbp = 0x00000195efc30170   rsp = 0x000000900c1fe090
    rip = 0x0000000000000005
    Found by: previous frame's frame pointer
[...]
```
