const express = require('express')
var passport = require('passport');
var Strategy = require('passport-local').Strategy;

const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient

var db
var dbUsers = require('./db');






passport.use(new Strategy(
  function(username, password, cb) {
   dbUsers.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  dbUsers.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});



MongoClient.connect('mongodb://serg:1234@ds125288.mlab.com:25288/armlist', (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(process.env.PORT || 3000, () => {
    console.log('listening on 3000')
  })
})




var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};




app.set('view engine', 'ejs')
app.set('views', __dirname + '/views');
app.use(allowCrossDomain);
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({extended: true}))
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(bodyParser.json())
app.use(express.static('public'))



app.use(passport.initialize());
app.use(passport.session());





app.get('/',
  function(req, res) {
     res.redirect('/login');
  });

app.get('/login',
  function(req, res){
    res.render('login');
  });
  
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/dashboard');
  });
  
app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/login');
  });


app.get('/dashboard',require('connect-ensure-login').ensureLoggedIn(), (req, res) => {
  db.collection('quotes').find().toArray((err, result) => {
    if (err) return console.log(err)
    res.render('index.ejs', {quotes: result})
  })
})
app.get('/chort',require('connect-ensure-login').ensureLoggedIn(), (req, res) => {
  db.collection('quotes').find({ name: { $in: [ "Перемоги 4б","Мазепи 28" ] } }).toArray((err, result) => {
    if (err) return console.log(err)
    res.render('chort.ejs', {quotes: result})
  })
})

app.post('/quotes', (req, res) => {
  db.collection('quotes').save(req.body, (err, result) => {
    if (err) return console.log(err)
    console.log('saved to database')
    res.redirect('/')
  })
})

app.put('/quotes', (req, res) => {
  db.collection('quotes')
  .findOneAndUpdate({name: req.body.name}, {
    $set: {
      
      quote: req.body.quote,
      time:req.body.time,
      cardsCash:req.body.cardsCash,
     
      
    }
  }, {
    sort: {_id: -1},
    upsert: true
  }, (err, result) => {
    if (err) return res.send(err)
    res.send(result)
  })
})
app.put('/quotes/zmina', (req, res) => {
  db.collection('quotes')
  .findOneAndUpdate({name: req.body.name}, {
    $set: {
      
      
      zmina:req.body.zmina
      
    }
  }, {
    sort: {_id: -1},
    upsert: true
  }, (err, result) => {
    if (err) return res.send(err)
    res.send(result)
  })
})

app.delete('/quotes', (req, res) => {
  db.collection('quotes').findOneAndDelete({name: req.body.name}, (err, result) => {
    if (err) return res.send(500, err)
    res.send('A darth vadar quote got deleted')
  })
})
