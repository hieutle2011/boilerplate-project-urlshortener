'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
require('dotenv').config()

var cors = require('cors');
const dns = require('dns')

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

const Schema = mongoose.Schema

var urlSchema = new mongoose.Schema({
  _id: { type: Number },
  url: '',
  created_at: ''
});

urlSchema.pre('save', function (next) {
  console.log('running pre-save');
  var doc = this;
  Counter.findByIdAndUpdate({ _id: 'url_count' }, { $inc: { count: 1 } }, function (err, counter) {
    if (err) return next(err);
    console.log(counter);
    console.log(counter.count);
    doc._id = counter.count;
    doc.created_at = new Date();
    console.log(doc);
    next();
  });
});
var URL = mongoose.model('URL', urlSchema);

const countersSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', countersSchema);

let promise = mongoose.connect(process.env.MONGOLAB_URI, {
  useMongoClient: true
});

promise.then(function (db) {
  console.log('connected!');
  URL.remove({}, function () {
    console.log('URL collection removed');
  })
  Counter.remove({}, function () {
    console.log('Counter collection removed');
    var counter = new Counter({ _id: 'url_count', count: 1 });
    counter.save(function (err) {
      if (err) return console.error(err);
      console.log('counter inserted');
    });
  });
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});

let dns_option = { all: true }

app.post("/api/shorturl/new", function (req, res, next) {
  console.log(req.body.url);
  var urlData = req.body.url;

  dns.lookup(req.body.url.slice(8), dns_option, (err, addresses) => {
    if (err) return res.json({ "error": "invalid URL" })

    URL.findOne({ url: urlData }, function (err, doc) {
      if (doc) {
        console.log('entry found in db');
        res.send({
          original_url: urlData,
          short_url: doc._id,
        });
      } else {
        console.log('entry NOT found in db, saving new');
        var url = new URL({
          url: urlData
        });
        url.save(function (err) {
          if (err) return console.error(err);
          res.send({
            original_url: urlData,
            short_url: url._id,
          });
        });
      }
    });
  })
});

app.get('/api/shorturl/:id', function (req, res) {
  var id = req.params.id
  URL.findOne({ _id: id }, function (err, doc) {
    if (doc) {
      console.log(doc.url)
      res.redirect(doc.url);
    } else {
      res.json({ job: 'to do' });
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});