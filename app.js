/**
 * Project 4
 * 
 * College students can sign up for a competition.
 * Admin members (they are total of 4 of them) can view the sign ups and
 * even delete some students from there....
 */


const express = require('express');
const app = express();

const validationForm = require('./validation');
const store = require('./store');
const adminRouter = require('./admin/admin-router');

app.listen(5000);


// global middleware
app.use(express.urlencoded({
   extended: true
}));

app.use(function(req, res, next) {
   res.set('Cache-control', 'no-cache, no-store, must-revalidate');
   next();
});


// global app settings
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', function(req, res, next) {
   res.render('index', {});
});

app.post('/', function(req, res, next) {
   // collect user input
   var userInput = {};
   userInput.name = req.body.name;
   userInput.email = req.body.email;
   userInput.competitions = req.body.competitions;


   validationForm.validate(userInput)

   .then(async (data) => {
      // add record
      await store.addRecord(data);

      res.redirect('/success');
   })

   .catch(errorMessageList => {
      res.render('index', {
         errorMessageList,
         userInput
      });
   });

});

app.get('/success', function(req, res, next) {
   res.render('success', {});
});


// if the request URL begins with 'admin/', we bring in the admin sub-app
app.all(/^\/admin/, adminRouter);