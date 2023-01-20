# sserve
Like `serve`, but supports HTTPS, and streams files instead of reading into RAM

## why
I wanted to transfer a 22GB + file from fedora workstation to Ventura Mac,
it went quicker to write a script to pipe a file stream to http server than to transfer via usb..

Serve is great, but it choked on the 22GB file, but OSes apparently block the UI thread while doing almost zero network load while waiting for the file to load.
I don't know what the plan was, but I don't have 22GB of ram, and I disable swap.

Also the need for using self signed SSL certs comes up a lot.

## usage
`npm i @repcomm/sserve -g`

Navigate to directory wished to be served, then run:

`$ sserve`

## implemented
- directory navigation
- file streaming (doesn't choke on large files)
- basic interface
- half baked server side renderer w/ similar API to @roguecircuitry/htmless

## not implemented / planned mvp
- file name whitespace support (needs convert to URL friendly and back)
- proper sanitisation (god knows what people will name their files)
- SSL is not tested yet
- auto-gen self signed SSL keys w/ openssh
- download folder as zip feature

## non-mvp ideas
- upload files?


