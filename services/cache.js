const mongoose = require("mongoose");
const util = require("util");
const redis = require("redis");
const redisUrl = "redis://127.0.0.1:6379";
// start redis: redis-server

const client = redis.createClient(redisUrl);

client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || ""); // if empty key, default to ''
  return this; // to make it chainable!!
};

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    console.log("SERVING FROM MONGO");
    return exec.apply(this, arguments);
  }
  // this is our redis Key
  // Put getQuery properties and collection into new object
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );
  console.log(key);

  const cachedValue = await client.hget(this.hashKey, key);

  if (cachedValue) {
    const doc = JSON.parse(cachedValue);

    console.log("SERVING FROM CACHE");
    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }

  const result = await exec.apply(this, arguments);

  client.hset(this.hashKey, key, JSON.stringify(result), "EX", 60 * 60);

  console.log("SERVING FROM MONGO");
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
