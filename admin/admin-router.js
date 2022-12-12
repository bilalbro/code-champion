/**
 * Express sub-application for admin routing logic
 */

const express = require('express');
const expressSession = require('express-session');

const adminValidationForm = require('./admin-validation');
const userValidationForm = require('../validation');
const adminStore = require('./admin-store');
const store = require('../store');


const subapp = express.Router();

subapp.use(expressSession({
   resave: false,
   saveUninitialized: false,
   secret: 'This is my secret'
}));


function authenticate(req, res, next) {
   if (req.session.username) {
      req.authenticated = true;
   }
   else {
      req.authenticated = false;
   }
   next();
}


subapp.use(authenticate);

subapp.all('/admin', function(req, res, next) {
   // if the user is authenticate as an admin, take to the /admin/home page
   if (req.authenticated) {
      res.redirect(303, '/admin/home');
   }
   // otherwise, continue on with the next middleware
   else {
      next();
   }
});

subapp.get('/admin', function(req, res) {
   res.render('admin');
});

subapp.post('/admin', function(req, res, next) {
   var userInput = {};
   userInput.username = req.body.username;
   userInput.password = req.body.password;

   adminValidationForm.validate(userInput)

   .then(data => {
      req.session.username = data.username;
      res.redirect(303, 'admin/home');
   })

   .catch(errorMessageList => {
      res.render('admin', {
         errorMessageList,
         userInput
      });
   });
});


subapp.all([
   '/admin/home',
   '/admin/signout',
   '/admin/del',
   '/admin/update',
   '/admin/success'
], function(req, res, next) {
   // if the user isn't authenticated and trying to access an authenticated
   // endpoint, take to the sign in page
   if (!req.authenticated) {
      res.redirect(303, '/admin');
   }
   // otherwise, continue on with the next middleware
   else {
      next();
   }
});

subapp.get('/admin/home', function(req, res, next) {
   var username = req.session.username;

   adminStore.getRecord(username)

   .then(adminInfo => {

      store.getAllRecords()
      .then(users => {
         adminInfo.username = username;
         res.render('admin-home', {
            users,
            adminInfo
         });
      });

   });
});

subapp.get('/admin/signout', function(req, res, next) {
   delete req.session.username;
   res.redirect(303, '/admin');
});

subapp.post('/admin/del', function(req, res, next) {
   var userInput = {};
   userInput.index = req.body.index;

   store.deleteRecord(Number(userInput.index))

   .then(() => {
      res.redirect(303, '/admin/home');
   });
});


// update user info
subapp.post('/admin/update', async function(req, res, next) {
   var userInput = {};
   userInput.name = req.body.name;
   userInput.email = req.body.email;
   userInput.competitions = req.body.competitions;

   var index = Number(req.body.index);

   // first delete the record
   await store.deleteRecord(index);

   var data = await userValidationForm.validate(userInput);
   await store.updateRecord(index, data);

   res.redirect(303, '/admin/home');

});


subapp.get('/admin/success', function(req, res, next) {
   res.render('admin-success');
});

module.exports = subapp;