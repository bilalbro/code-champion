
const Form = require('../lib/form');
const adminStore = require('./admin-store');

var validationForm = new Form();

validationForm.setSchema({
   username: 'required',
   password: {
      trim: false
   }
});

validationForm.setValidationFx('username', 'password',
   async function(username, password) {
      var exists = await adminStore.existsRecord(username, password);
      if (!exists) {
         throw 'Invalid username or password';
      }
   });

// validationForm.validate({
//    username: ' ',
//    password: ' '
// })
// .then(console.log.bind('success'))
// .catch(console.log)

module.exports = validationForm;