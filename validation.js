/**
 * Validation logic for our form
 */

const store = require('./store');
const Form = require('./lib/form');


var validationForm = new Form();

validationForm.setSchema({
   name: 'required',
   email: {
      type: 'email',
      fx: async function(email) {
         if ( await store.existsRecord(email) ) {
            throw 'Email already exists.';
         }
      }
   },
   competitions: 'required'
});

module.exports = validationForm;