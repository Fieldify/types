#!/usr/bin/env node
"use strict";

const fs = require('fs');
const program = require('subcommander')
const pathUtils = require("path")
const ejs = require("ejs")
const pkg = require("../package.json");
const utils = require('./lib/utils')

const templates = {
  esm: fs.readFileSync(`${__dirname}/ejs/esm.ejs`, 'utf-8'),
  antd: fs.readFileSync(`${__dirname}/ejs/antd.ejs`, 'utf-8'),
}

program.command('build', {
  desc: 'Prepare Type files',
  callback: function (options, cb) {

    const root = pathUtils.resolve(`${__dirname}/..`)
    const path = `${__dirname}/../sets`
    console.log(`Root is ${root}`)

    const dirs = fs.readdirSync(path)

    const rendered = {}

    function processSet(end) {
      const dir = dirs.pop();
      if (!dir) {
        return (end())
      }
      const setRendered = rendered[dir] = {
        js: [],
        antd: []
      }


      console.log(`Processing set ${dir}`)
      utils.sync([
        // scan
        next => {
          const path = `${__dirname}/../sets/${dir}/src`
          const fields = fs.readdirSync(path)

          for (var idx in fields) {
            const field = fields[idx]
            const fieldPath = `${path}/${field}`

            // check for js files
            try {
              const jsFile = pathUtils.relative(root, `${fieldPath}/js/index.js`)
              const jsStat = fs.statSync(jsFile)
              if (jsStat) setRendered.js.push({ key: field, file: jsFile, stat: jsStat })
            } catch (e) { }

            // check for antd files
            try {
              const file = pathUtils.relative(root, `${fieldPath}/antd/index.js`)
              const stat = fs.statSync(file)
              if (stat) setRendered.antd.push({ key: field, file: file, stat: stat })
            } catch (e) { }
          }

          next()
        }
      ], () => {
        process.nextTick(processSet, end)
      })

    }

    processSet(() => {
      utils.sync([
        // write native javascript
        next => {
          const esm = ejs.render(templates.esm, {
            data: rendered
          })
          fs.writeFileSync(`${root}/esm.js`, esm)
          console.log(`Writing ESM`)
          next()
        },

        // write antd
        next => {
          const esm = ejs.render(templates.antd, {
            data: rendered
          })
          fs.writeFileSync(`${root}/antd.js`, esm)
          console.log(`Writing Ant design`)
          next()
        }
      ], () => {
        // console.log(JSON.stringify(rendered, null, "  "))
        if (cb) cb()
      })

    })
  },
})

/*
// load specific commands
var source = __dirname+'/commands';
var dirs = fs.readdirSync(source);
for(var a in dirs) {
	var p = dirs[a];
	debug("Loading "+source+'/'+p);
	try {
		require(source+'/'+p);

	} catch(e) {
		console.log("Can not load "+source+'/'+p+': '+e.message);
		console.log(e)
	}
}
*/

// version command
// program.command('version', {
// 	desc: 'Current version',
// 	callback: function () {
// 		console.log(' signderiva - Bigbang v' + pkg.version + ' (c) 2018-2019 - Michael Vergoz');
// 	},
// });

program.parse();
