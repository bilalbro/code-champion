/**
 * Create form schemas and then validate inputs based on them
 * 
 * For more granular customization, an object can be set as the value of a key
 * with the following properties (along with their defaults shown):
 *
 * required (default: true)
 * -- whether the field is required or not
 * 
 * pattern (default: null)
 * -- regular expression to test the field's value against
 * 
 * fx (default: null)
 * -- function to execute for validating the field's value
 * 
 * type (default: null)
 * -- specify some predefined validation mechanism, while specifying more
 *    properties on this object
 * 
 * name (default: <key>)
 * -- the name used when displaying error messages
 * 
 * trim (default: true)
 * -- whether to trim the field's value or not
 */


 class FormInputDescriptor {
   constructor(name) {
      this.trim = true;
      this.required = true;
      this.pattern = null;
      this.fx = null;
      this.type = null;
      this.name = name;
      this.value = '';
      this.validated = false;
   }
}


class FormInputGroupDescriptor {
   constructor(keys, fx) {
      this.keys = keys;
      this.fx = fx;
   }
}


class Form {

   static async validate(key, value, inputDescriptor) {

      // first normalize the input by trimming it off, if asked so
      if (inputDescriptor.trim && typeof value === 'string') {
         value = value?.trim();
      }

      // check 1
      // first get done with the required field
      if (inputDescriptor.required && !value) {
         throw inputDescriptor.name + ' field is required.';
      }

      // if the value is falsey after trimming, there is absolutely no point in
      // testing further. Thus immediately return.
      if (!value) {
         return '';
      }

      // check 2
      // now let's get done with the pattern
      if (inputDescriptor.pattern) {
         if (!inputDescriptor.pattern.test(value)) {
            throw inputDescriptor.name + ' field is invalid.';
         }
      }

      // check 3
      // a function was there to execute on the data
      if (inputDescriptor.fx) {
         // call the function
         var fx = inputDescriptor.fx;
         var returnValue = fx(value);

         // if the returnValue of the function is a promise, await the result
         if (returnValue instanceof Promise) {
            // if the promise throws an error ultimately, this would throw that
            // error and ultimately cause control to be shifted to the calling
            // routine
            await returnValue;
         }

         // at this stage, we know that fx was an ordinary function
         // now, if returnValue (the return value of fx()) is true, return
         // otherwise, throw the returned string message
         else {
            if (returnValue !== true) {
               throw returnValue;
            }
         }
      }

      inputDescriptor.validated = true;
      return value;

   }

   static resolveStringValue(key, value, inputDescriptor) {
      value = value.toLowerCase();

      if (value === 'required') {
         // ignore this case
      }
      else if (value === 'email') {
         inputDescriptor.pattern = /[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{2,}/;
      }
   }

   static resolveRegexValue(key, value, inputDescriptor) {
      inputDescriptor.pattern = value;
   }

   static resolveObjectValue(key, value, inputDescriptor) {
      for (var _key in inputDescriptor) {
         if (value[_key] !== undefined) {
            inputDescriptor[_key] = value[_key];
         }
      }

      // if an object is given instead of a string, it may be that the user
      // wants one the predefined checks in addition to a custom function.
      // To mitigate this issue, we have the type field. It works exactly like
      // a string value does. Hene, if value.type is present, use that preset.
      if (value.type) {
         Form.resolveStringValue(key, value.type, inputDescriptor);
      }
   }


   constructor() {
      this.inputDescriptorMap = {};
      this.inputGroupDescriptorList = [];
   }


   /**
    * Set the schema
    * @param {object} schema 
    */
   setSchema(schema) {
      var inputDescriptor;
      var value;

      // go over each key in schema and then form a local schema
      for (var key in schema) {
         value = schema[key];
         inputDescriptor = new FormInputDescriptor(key);

         // inputDescriptor normalization starts
         if (typeof value === 'string') {
            Form.resolveStringValue(key, value, inputDescriptor);
         }

         else if (value instanceof RegExp) {
            Form.resolveRegexValue(key, value, inputDescriptor);
         }

         else if (value && typeof value === 'object') {
            Form.resolveObjectValue(key, value, inputDescriptor);
         }
         // inputDescriptor normalization ends

         // update inputDescriptorMap with the key pointing to an input descriptor
         this.inputDescriptorMap[key] = inputDescriptor;
      }
   }


   /**
    * Validate a group
    * @param {FormInputGroupDescriptor} inputGroupDescriptor 
    */
   async validateGroup(inputGroupDescriptor) {
      // go over each of the keys in validationDescriptor.keys and check if 
      // they have been validated
      var inputDescriptorMap = this.inputDescriptorMap;

      var allValidated = true;
      for (var key of inputGroupDescriptor.keys) {
         if (!inputDescriptorMap[key].validated) {
            allValidated = false;
            break;
         }
      }

      // if all the keys are validated, execute the given function
      if (allValidated) {
         var fx = inputGroupDescriptor.fx;

         // pass the given parameters to the function
         var keys = inputGroupDescriptor.keys;
         var keyValues = keys.map(key => inputDescriptorMap[key].value);
         var returnValue = fx.apply(null, keyValues);

         if (returnValue instanceof Promise) {
            // await for the promise to resolve or reject
            // if it rejects, i.e. throws an error, this statement automatically
            // delegates the thrown error to the calling routine
            await returnValue;
         }
         else {
            if (returnValue !== true) {
               throw returnValue;
            }
         }
      }

   }


   /**
    * Validate the given object with the contained schema
    * @param {object} keyValueMap 
    */
   async validate(keyValueMap) {

      var errorMessageList = [];
      var inputDescriptorMap = this.inputDescriptorMap;
      
      // per-key validation based on its own validation descriptor
      var value;
      for (var key in inputDescriptorMap) {
         try {
            inputDescriptorMap[key].validated = false;
            value = await Form.validate(key, keyValueMap[key], this.inputDescriptorMap[key]);

            // update the input descriptor's value property with the validated
            // value
            inputDescriptorMap[key].value = value;
         }
         catch (errorMessage) {
            errorMessageList.push(errorMessage);
         }
      }

      // after the per-key validation, it's time for group validation
      for (var inputGroupDescriptor of this.inputGroupDescriptorList) {
         try {
            await this.validateGroup(inputGroupDescriptor);
         }
         catch (errorMessage) {
            errorMessageList.push(errorMessage);
         }
      }

      if (errorMessageList.length) {
         throw errorMessageList;
      }

      // at this stage, everything is all right
      // and each input descriptor in inputDescriptorMap has its validated value

      // we must pass off all these validated values back to the calling routine
      // so that it can process them (i.e. add to database)
      var validatedInput = {};
      for (var key in inputDescriptorMap) {
         validatedInput[key] = inputDescriptorMap[key].value;
      }

      // all the keys that were submitted in the parameter keyValueMap, that
      // were not part of the form's schema should be sent as-is to the
      // calling routine
      for (var key in keyValueMap) {
         if (!(key in inputDescriptorMap)) {
            validatedInput[key] = keyValueMap[key];
         }
      }

      return validatedInput;
   }


   /**
    * 
    */
   setValidationFx() {
      // the last argument is the function to call in the event of validation
      // all previous arguments are keys to which the validation function applies
      var fx = arguments[arguments.length - 1];
      var keys = Array.prototype.slice.call(arguments, 0, arguments.length - 1);

      var inputGroupDescriptor = new FormInputGroupDescriptor(keys, fx);

      this.inputGroupDescriptorList.push(inputGroupDescriptor);
   }
}

module.exports = Form;