/**
 * Database routines for administrators specifically
 */

const redis = require('redis').createClient();

// make connection
redis.connect();

async function getRecord(username) {
   return await redis.HGETALL('admin:' + username);
}

async function existsRecord(username, password) {
   var key = 'admin:' + username;
   var usernameExists = await redis.EXISTS(key);

   var exists = false;

   if (usernameExists) {
      exists = true;
      var storedPassword = await redis.HGET(key, 'password');
      if (storedPassword !== password) {
         exists = false;
      }
   }

   return exists;
}

module.exports = {
   getRecord,
   existsRecord
};