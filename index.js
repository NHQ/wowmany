#!/usr/bin/env node

var npmstats = require('npm-stats')();
var counter = require('npm-download-counts');
var moment = require('moment');
var pool = 0;
var events = require('events')

var modulestream = npmstats.user(process.argv[2]).list();

var modules = ''

modulestream.on('data', function(data){
	modules += data.toString();
})

var start = moment().subtract('days', process.argv[3] || 30).toDate();
var end = new Date();
var total = 0;

function pooler(fn, max, total){
	var fin = false;
	var cnt = 0;
	var totes = 0;
	var emitter = new events.EventEmitter();
	emitter.on('end', function(){
		fin = true
	})
	emitter.on('clear-all', function(){
		cnt = 0;
		doMany();
	})
	emitter.on('clear', function(){
		--cnt;
		totes++
		doMany();
	})
	emitter.on('start', function(){
		cnt = 0;
		totes = 0;
		fin = false;
		doMany();
	})
	return emitter

	function doMany(){
		for(cnt = cnt; cnt <= max; cnt++){
			if(!fin){
				fn()
				if(total && totes === total){
					fin = true;
					emitter.emit('finished')
				}
			}
		}
	}
}

modulestream.on('end', function(){
	modules = JSON.parse(modules);
	var count = 0;
	var done = false;
	var total = 0;
	var reported = 0;
	var pool = pooler(getCount, 20, modules.length - 1)
	pool.emit('start');
	console.log('\nfetching data from NPM\n')
	function getCount(n){
		var x = count++
		counter(modules[x], start, end, function(err, data){
			pool.emit('clear')
			data.forEach(function(e, i){
				total += e.count
			})
			if(++reported === modules.length){
				console.log('%s\'s modules were downloaded %d times over the previous %d days!\n', process.argv[2], total, process.argv[3] || 30)
			}
		})
	}
})

//console.log(modules);
