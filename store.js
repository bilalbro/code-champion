/**
 * All Redis related stuff goes here
 */

const redis = require('redis').createClient();

redis.on('error', function(err) {
   console.log('Redis error occured.');
   console.log(err);
});

// establish connection
redis.connect();


function getKey(index) {
   return 'records:' + index;
}


async function _addRecord(index, userInput) {
   var key = getKey(index);
   await redis.HSET(key, userInput);

   // email address is the unique thing, therefore add it into the set of all
   // email addresses
   await redis.SADD('emails', userInput.email);
}


async function addRecord(userInput) {
   var nextRecordIndex = await redis.INCR('records:');
   await _addRecord(nextRecordIndex, userInput);
}


async function updateRecord(index, userInput) {   
   _addRecord(index, userInput);
}


async function getRecord(index) {
   var key = getKey(index);
   return await redis.HGETALL(key);
}


async function getAllRecords() {
   var recordsCount = await redis.GET('records:');
   var records = [];

   var record;
   for (var i = 1; i <= recordsCount; i++) {
      record = await getRecord(i);
      if (Object.keys(record).length) {
         record.index = i;
         records.unshift(record);
      }
   }
   
   return records;
}


async function deleteRecord(index) {
   var key = getKey(index);
   var email = await redis.HGET(key, 'email');

   await redis.DEL(getKey(index));
   await redis.SREM('emails', email);
}


async function existsRecord(email) {
   return await redis.SISMEMBER('emails', email);
}

module.exports = {
   addRecord,
   updateRecord,
   getRecord,
   getAllRecords,
   deleteRecord,
   existsRecord
};